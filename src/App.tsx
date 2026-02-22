import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/logo-hearthswipe.png";
import buttonInfo from "./assets/button-info.png";
import buttonNo from "./assets/button-no.png";
import buttonReverse from "./assets/button-reverse.png";
import buttonSuper from "./assets/button-super.png";
import buttonYes from "./assets/button-yes.png";
import overlayVoteNo from "./assets/overlay-vote-no.png";
import overlayVoteReverse from "./assets/overlay-vote-reverse.png";
import overlayVoteSuper from "./assets/overlay-vote-super.png";
import overlayVoteYes from "./assets/overlay-vote-yes.png";
import popupChatBubble from "./assets/popup-chat-bubble.png";
import { computeRunBadges, formatPercent, type BadgeAward, type KeyBreakdownMap, type RunStats } from "./badge-rules";
import { FlavorTextBox } from "./components/FlavorTextBox";
import { cardImageUrl, fetchCards, shuffle } from "./lib/cards";
import { copyTextToClipboard } from "./lib/clipboard";
import { buildDeckstringFromRun, formatTokenForUi } from "./lib/deck-export";
import type {
    CardRarity,
    DragState,
    ExitAnimationState,
    HearthstoneCard,
    Phase,
    ReverseCueDirection,
    ReverseCueState,
    RunCounters,
    RunDeckEntry,
    SwipeAction,
} from "./types/game";

const RUN_SIZE = 30;
const MIN_LOADING_MS = 700;
const RUN_REVERSE_LIMIT = 3;
const RUN_SUPER_LIKE_LIMIT = 2;
const STACK_VISIBLE_CARDS = 3;
const SWIPE_COMMIT_PX = 82;
const SWIPE_COMMIT_VELOCITY = 0.5;
const SUPER_SWIPE_COMMIT_PX = 102;
const SUPER_SWIPE_COMMIT_VELOCITY = 0.45;
const SWIPE_ANIMATION_MS = 420;
const SWIPE_EXIT_FADE_MS = 230;
const SWIPE_INDICATOR_PREVIEW_PX = 26;
const SWIPE_FADE_MIN_START_PX = 54;
const SWIPE_FADE_START_RATIO = 0.62;
const SWIPE_FADE_VIEWPORT_MID_RATIO = 0.5;
const REVERSE_EDGE_CUE_MS = 360;
const REVERSE_CENTER_CUE_MS = 240;
const DECK_MODAL_CLOSE_MS = 220;
const SHELL_EXIT_TO_INTRO_MS = 700;
const CARD_ZOOM_CLOSE_MS = 170;
const DECKSTRING_FEEDBACK_MS = 1800;

type RunSummary = {
    totalCards: number;
    likes: number;
    nopes: number;
    superLikes: number;
    likeRatio: number;
    avgMana: number | null;
    reversesUsed: number;
    primaryTitle: BadgeAward | null;
    badges: BadgeAward[];
};

function previewActionFromOffsets(x: number, y: number, canUseSuperLike: boolean): SwipeAction | null {
    if (canUseSuperLike && y <= -58 && Math.abs(y) > Math.abs(x) * 1.08) {
        return "super";
    }
    if (x >= SWIPE_INDICATOR_PREVIEW_PX && Math.abs(x) > Math.abs(y) * 1.05) {
        return "yes";
    }
    if (x <= -SWIPE_INDICATOR_PREVIEW_PX && Math.abs(x) > Math.abs(y) * 1.05) {
        return "no";
    }
    return null;
}

function reverseDirectionFromAction(action: SwipeAction): ReverseCueDirection {
    if (action === "yes") {
        return "right";
    }
    if (action === "no") {
        return "left";
    }
    return "up";
}

function swipeFadeBoundsPx(): { start: number; end: number } {
    if (typeof window === "undefined") {
        return {
            start: 160,
            end: 320,
        };
    }

    const viewportHalfWidth = window.innerWidth * 0.5;
    const shellWidth = Math.min(500, Math.max(280, window.innerWidth - 32));
    const shellHalfWidth = Math.min(viewportHalfWidth, shellWidth * 0.5);
    const distanceFromShellToViewportEdge = Math.max(viewportHalfWidth - shellHalfWidth, 0);
    const start = Math.max(SWIPE_FADE_MIN_START_PX, shellHalfWidth * SWIPE_FADE_START_RATIO);
    const end = Math.max(start + 1, shellHalfWidth + distanceFromShellToViewportEdge * SWIPE_FADE_VIEWPORT_MID_RATIO);

    return {
        start,
        end,
    };
}

function opacityForSwipeOffset(x: number, y: number): number {
    const distance = Math.hypot(x, y * 0.92);
    const bounds = swipeFadeBoundsPx();
    if (distance <= bounds.start) {
        return 1;
    }
    const fadeRange = Math.max(bounds.end - bounds.start, 1);
    const progress = Math.min(1, (distance - bounds.start) / fadeRange);
    return Math.max(0, 1 - progress);
}

const DEFAULT_DRAG_STATE: DragState = {
    isActive: false,
    x: 0,
    y: 0,
};

type TimeoutLikeRef = {
    current: number | null;
};

function clearTimeoutRef(timerRef: TimeoutLikeRef): void {
    if (timerRef.current === null) {
        return;
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
}

function setTimeoutRef(timerRef: TimeoutLikeRef, callback: () => void, delayMs: number): void {
    clearTimeoutRef(timerRef);
    timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        callback();
    }, delayMs);
}

function createEmptyCounters(): RunCounters {
    return {
        yes: 0,
        no: 0,
        super: 0,
    };
}

function rarityClassName(rarity: CardRarity): string {
    return `rarity-${rarity.toLowerCase()}`;
}

function incrementBreakdown(stats: KeyBreakdownMap, key: string, liked: boolean): void {
    if (!key) {
        return;
    }

    const entry = stats[key] ?? { seen: 0, liked: 0 };
    entry.seen += 1;
    if (liked) {
        entry.liked += 1;
    }
    stats[key] = entry;
}

function compileRunStats(deck: HearthstoneCard[], actionsByIndex: Record<number, SwipeAction>, reversesUsed: number): RunStats {
    const byType: KeyBreakdownMap = {};
    const byRarity: KeyBreakdownMap = {};
    const byClass: KeyBreakdownMap = {};
    const byRace: KeyBreakdownMap = {};
    const byMechanic: KeyBreakdownMap = {};
    const bySet: KeyBreakdownMap = {};

    let totalCards = 0;
    let likes = 0;
    let nopes = 0;
    let superLikes = 0;

    let likedManaSum = 0;
    let likedManaCount = 0;
    let seenZeroCost = 0;
    let likedZeroCost = 0;
    let likedLowCost = 0;
    let likedHighCost = 0;
    let likedEvenCost = 0;
    let likedOddCost = 0;

    let likedMinionCount = 0;
    let likedMinionAttackSum = 0;
    let likedMinionHealthSum = 0;

    deck.forEach((card, cardIndex) => {
        const action = actionsByIndex[cardIndex];
        if (!action) {
            return;
        }

        totalCards += 1;
        const liked = action === "yes" || action === "super";
        if (liked) {
            likes += 1;
        } else {
            nopes += 1;
        }
        if (action === "super") {
            superLikes += 1;
        }

        incrementBreakdown(byType, card.cardType, liked);
        incrementBreakdown(byRarity, card.rarity, liked);
        incrementBreakdown(byClass, card.cardClass, liked);
        incrementBreakdown(bySet, card.cardSet, liked);

        Array.from(new Set(card.races)).forEach((race) => incrementBreakdown(byRace, race, liked));
        Array.from(new Set(card.mechanics)).forEach((mechanic) => incrementBreakdown(byMechanic, mechanic, liked));

        if (card.cost !== null) {
            if (card.cost === 0) {
                seenZeroCost += 1;
                if (liked) {
                    likedZeroCost += 1;
                }
            }
            if (liked) {
                likedManaSum += card.cost;
                likedManaCount += 1;
                if (card.cost <= 2) {
                    likedLowCost += 1;
                }
                if (card.cost >= 7) {
                    likedHighCost += 1;
                }
                if (card.cost % 2 === 0) {
                    likedEvenCost += 1;
                } else {
                    likedOddCost += 1;
                }
            }
        }

        if (liked && card.cardType === "MINION" && card.attack !== null && card.health !== null) {
            likedMinionCount += 1;
            likedMinionAttackSum += card.attack;
            likedMinionHealthSum += card.health;
        }
    });

    return {
        totalCards,
        likes,
        nopes,
        superLikes,
        reverses: reversesUsed,
        likeRatio: totalCards > 0 ? likes / totalCards : 0,
        avgMana: likedManaCount > 0 ? likedManaSum / likedManaCount : null,
        seenZeroCost,
        likedZeroCost,
        likedLowCost,
        likedHighCost,
        likedEvenCost,
        likedOddCost,
        likedMinionCount,
        avgLikedMinionAttack: likedMinionCount > 0 ? likedMinionAttackSum / likedMinionCount : null,
        avgLikedMinionHealth: likedMinionCount > 0 ? likedMinionHealthSum / likedMinionCount : null,
        byType,
        byRarity,
        byClass,
        byRace,
        byMechanic,
        bySet,
    };
}

function buildRunSummary(deck: HearthstoneCard[], actionsByIndex: Record<number, SwipeAction>, reversesUsed: number): RunSummary {
    const stats = compileRunStats(deck, actionsByIndex, reversesUsed);
    const badgeResult = computeRunBadges(stats);
    return {
        totalCards: stats.totalCards,
        likes: stats.likes,
        nopes: stats.nopes,
        superLikes: stats.superLikes,
        likeRatio: stats.likeRatio,
        avgMana: stats.avgMana,
        reversesUsed,
        primaryTitle: badgeResult.primaryTitle,
        badges: badgeResult.badges,
    };
}

function renderBadgeTooltipContent(badge: BadgeAward): ReactNode {
    const rarityText = `${badge.rarity.charAt(0).toUpperCase()}${badge.rarity.slice(1)}`;
    const thresholdText =
        badge.explain.threshold.length > 0
            ? `${badge.explain.threshold.charAt(0).toUpperCase()}${badge.explain.threshold.slice(1)}`
            : badge.explain.threshold;
    return (
        <>
            <span className="run-badge__tooltip-line run-badge__tooltip-line--desc">{badge.description}</span>
            {badge.detail && <span className="run-badge__tooltip-line">Detail: {badge.detail}</span>}
            <span className="run-badge__tooltip-line">Seen: {badge.explain.seen}</span>
            <span className="run-badge__tooltip-line">Liked: {badge.explain.liked}</span>
            <span className="run-badge__tooltip-line">Ratio: {formatPercent(badge.explain.ratio)}</span>
            <span className="run-badge__tooltip-line run-badge__tooltip-line--threshold">Threshold: {thresholdText}</span>
            <span className="run-badge__tooltip-line">Rarity: {rarityText}</span>
        </>
    );
}

function runActionLabel(action: SwipeAction | null): string {
    if (action === "yes") {
        return "Liked";
    }
    if (action === "no") {
        return "Noped";
    }
    if (action === "super") {
        return "Super";
    }
    return "Skipped";
}

function runActionIcon(action: SwipeAction | null): string | null {
    if (action === "yes") {
        return overlayVoteYes;
    }
    if (action === "no") {
        return overlayVoteNo;
    }
    if (action === "super") {
        return overlayVoteSuper;
    }
    return null;
}

export default function App() {
    const [phase, setPhase] = useState<Phase>("intro");
    const [deck, setDeck] = useState<HearthstoneCard[]>([]);
    const [index, setIndex] = useState(0);
    const [error, setError] = useState<string>("");
    const [loadedCardIds, setLoadedCardIds] = useState<Record<string, true>>({});
    const [runCounters, setRunCounters] = useState<RunCounters>(createEmptyCounters);
    const [actionsByIndex, setActionsByIndex] = useState<Record<number, SwipeAction>>({});
    const [reversedCardIndexes, setReversedCardIndexes] = useState<Record<number, true>>({});
    const [reverseUses, setReverseUses] = useState(0);
    const [reverseCooldownUntilIndex, setReverseCooldownUntilIndex] = useState(0);
    const [dragState, setDragState] = useState<DragState>(DEFAULT_DRAG_STATE);
    const [exitAnimation, setExitAnimation] = useState<ExitAnimationState | null>(null);
    const [reverseCue, setReverseCue] = useState<ReverseCueState | null>(null);
    const [isRunDeckOpen, setIsRunDeckOpen] = useState(false);
    const [isRunDeckClosing, setIsRunDeckClosing] = useState(false);
    const [isTransitioningToIntro, setIsTransitioningToIntro] = useState(false);
    const [zoomedRunCard, setZoomedRunCard] = useState<HearthstoneCard | null>(null);
    const [isZoomedRunCardClosing, setIsZoomedRunCardClosing] = useState(false);
    const [isZoomedRunCardReady, setIsZoomedRunCardReady] = useState(false);
    const [deckCodeCopyState, setDeckCodeCopyState] = useState<"idle" | "copied" | "failed">("idle");
    const dragOriginRef = useRef<{ pointerId: number | null; x: number; y: number; startedAtMs: number }>({
        pointerId: null,
        x: 0,
        y: 0,
        startedAtMs: 0,
    });
    const actionTimerRef = useRef<number | null>(null);
    const reverseCueTimerRef = useRef<number | null>(null);
    const reverseCueClearTimerRef = useRef<number | null>(null);
    const deckModalCloseTimerRef = useRef<number | null>(null);
    const shellExitTimerRef = useRef<number | null>(null);
    const zoomCardCloseTimerRef = useRef<number | null>(null);
    const deckCodeFeedbackTimerRef = useRef<number | null>(null);
    const zoomCardPreloadCacheRef = useRef<Record<string, true>>({});

    const currentCard = useMemo(() => deck[index], [deck, index]);
    const visibleCards = useMemo(() => deck.slice(index, index + STACK_VISIBLE_CARDS), [deck, index]);
    const previousCardIndex = index - 1;
    const reversesLeft = Math.max(0, RUN_REVERSE_LIMIT - reverseUses);
    const superLikesLeft = Math.max(0, RUN_SUPER_LIKE_LIMIT - runCounters.super);
    const isAnimatingSwipe = Boolean(exitAnimation);
    const isAnimatingReverse = Boolean(reverseCue);
    const canUseSuperLike = superLikesLeft > 0 && !isAnimatingSwipe && !isAnimatingReverse;
    const dragPreviewAction = previewActionFromOffsets(dragState.x, dragState.y, canUseSuperLike);
    const nextCardVoteIcon =
        dragPreviewAction === "yes"
            ? overlayVoteYes
            : dragPreviewAction === "no"
              ? overlayVoteNo
              : dragPreviewAction === "super"
                ? overlayVoteSuper
                : null;
    const showNextCardVoteIcon = Boolean(nextCardVoteIcon && visibleCards.length > 1 && !isAnimatingSwipe && !isAnimatingReverse);
    const reverseInCooldown = index < reverseCooldownUntilIndex;
    const canReversePreviousCard =
        !isAnimatingSwipe &&
        !isAnimatingReverse &&
        !reverseInCooldown &&
        previousCardIndex >= 0 &&
        reversesLeft > 0 &&
        !reversedCardIndexes[previousCardIndex] &&
        Boolean(actionsByIndex[previousCardIndex]);
    const reverseActionTitle = canReversePreviousCard
        ? `Reverse last card (${reversesLeft} left)`
        : reversesLeft === 0
          ? "No reverses left"
          : reverseInCooldown
            ? "Reverse recharges after moving forward"
          : previousCardIndex < 0
            ? "Swipe at least one card first"
            : "This card was already reversed";
    const superLikeTitle = canUseSuperLike
        ? `Super Like (${superLikesLeft} left)`
        : isAnimatingSwipe
          ? "Wait for current swipe"
          : isAnimatingReverse
            ? "Wait for reverse cue"
          : "No super likes left";
    const runSummary = useMemo(
        () => buildRunSummary(deck, actionsByIndex, reverseUses),
        [deck, actionsByIndex, reverseUses],
    );
    const runDeckEntries = useMemo<RunDeckEntry[]>(
        () =>
            deck.map((card, cardIndex) => ({
                card,
                cardIndex,
                action: actionsByIndex[cardIndex] ?? null,
            })),
        [deck, actionsByIndex],
    );
    const runDeckExport = useMemo(() => buildDeckstringFromRun(runDeckEntries), [runDeckEntries]);
    const copyDeckButtonLabel = deckCodeCopyState === "copied" ? "Copied" : deckCodeCopyState === "failed" ? "Copy failed" : "Copy deck code";
    const copyDeckButtonTitle =
        runDeckExport.deckstring === null
            ? runDeckExport.error
            : `Copy Wild deck code (${formatTokenForUi(runDeckExport.selectedClass)} + neutral, ${runDeckExport.exportedCardCount} cards)`;

    const markCardLoaded = useCallback((cardId: string) => {
        setLoadedCardIds((prev) => {
            if (prev[cardId]) {
                return prev;
            }
            return {
                ...prev,
                [cardId]: true,
            };
        });
    }, []);

    const preloadCard = useCallback((cardId: string) => {
        if (loadedCardIds[cardId]) {
            return;
        }
        const image = new Image();
        image.decoding = "async";
        image.src = cardImageUrl(cardId);
        if (image.complete) {
            markCardLoaded(cardId);
            return;
        }
        image.onload = () => markCardLoaded(cardId);
    }, [loadedCardIds, markCardLoaded]);

    const preloadZoomCard = useCallback((cardId: string) => {
        if (zoomCardPreloadCacheRef.current[cardId]) {
            return;
        }
        const image = new Image();
        image.decoding = "async";
        image.src = cardImageUrl(cardId);
        if (image.complete) {
            zoomCardPreloadCacheRef.current[cardId] = true;
            return;
        }
        image.onload = () => {
            zoomCardPreloadCacheRef.current[cardId] = true;
        };
    }, []);

    const openZoomedRunCard = (card: HearthstoneCard) => {
        clearTimeoutRef(zoomCardCloseTimerRef);
        setIsZoomedRunCardClosing(false);
        setIsZoomedRunCardReady(false);
        preloadZoomCard(card.id);
        setZoomedRunCard(card);
    };

    const closeZoomedRunCardImmediately = () => {
        clearTimeoutRef(zoomCardCloseTimerRef);
        setIsZoomedRunCardClosing(false);
        setIsZoomedRunCardReady(false);
        setZoomedRunCard(null);
    };

    const closeZoomedRunCard = () => {
        if (!zoomedRunCard || isZoomedRunCardClosing) {
            return;
        }
        setIsZoomedRunCardClosing(true);
        setTimeoutRef(zoomCardCloseTimerRef, () => {
            setZoomedRunCard(null);
            setIsZoomedRunCardClosing(false);
            setIsZoomedRunCardReady(false);
        }, CARD_ZOOM_CLOSE_MS);
    };

    const clearDeckCodeFeedback = () => {
        clearTimeoutRef(deckCodeFeedbackTimerRef);
        setDeckCodeCopyState("idle");
    };

    const closeRunDeckImmediately = () => {
        clearTimeoutRef(deckModalCloseTimerRef);
        setIsRunDeckClosing(false);
        setIsRunDeckOpen(false);
        clearDeckCodeFeedback();
        closeZoomedRunCardImmediately();
    };

    const openRunDeck = () => {
        clearTimeoutRef(deckModalCloseTimerRef);
        setIsRunDeckClosing(false);
        clearDeckCodeFeedback();
        setIsRunDeckOpen(true);
    };

    const closeRunDeck = () => {
        if (!isRunDeckOpen || isRunDeckClosing) {
            return;
        }
        setIsRunDeckClosing(true);
        clearDeckCodeFeedback();
        closeZoomedRunCardImmediately();
        setTimeoutRef(deckModalCloseTimerRef, () => {
            setIsRunDeckOpen(false);
            setIsRunDeckClosing(false);
        }, DECK_MODAL_CLOSE_MS);
    };

    const copyDeckCode = async () => {
        if (runDeckExport.deckstring === null) {
            setDeckCodeCopyState("failed");
            return;
        }

        try {
            await copyTextToClipboard(runDeckExport.deckstring);
            setDeckCodeCopyState("copied");
        } catch {
            setDeckCodeCopyState("failed");
        }

        setTimeoutRef(deckCodeFeedbackTimerRef, () => {
            setDeckCodeCopyState("idle");
        }, DECKSTRING_FEEDBACK_MS);
    };

    useEffect(() => {
        if (deck.length === 0) {
            return;
        }
        deck.slice(index, index + 6).forEach((card) => preloadCard(card.id));
        // We intentionally preload only nearby cards for smooth swipes with low memory impact.
    }, [deck, index, preloadCard]);

    useEffect(() => {
        return () => {
            clearTimeoutRef(actionTimerRef);
            clearTimeoutRef(reverseCueTimerRef);
            clearTimeoutRef(reverseCueClearTimerRef);
            clearTimeoutRef(deckModalCloseTimerRef);
            clearTimeoutRef(shellExitTimerRef);
            clearTimeoutRef(zoomCardCloseTimerRef);
            clearTimeoutRef(deckCodeFeedbackTimerRef);
        };
    }, []);

    useEffect(() => {
        if (!isRunDeckOpen) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }
            if (zoomedRunCard) {
                if (isZoomedRunCardClosing) {
                    return;
                }
                setIsZoomedRunCardClosing(true);
                setTimeoutRef(zoomCardCloseTimerRef, () => {
                    setZoomedRunCard(null);
                    setIsZoomedRunCardClosing(false);
                    setIsZoomedRunCardReady(false);
                }, CARD_ZOOM_CLOSE_MS);
                return;
            }
            if (isRunDeckClosing) {
                return;
            }
            clearDeckCodeFeedback();
            setIsRunDeckClosing(true);
            setTimeoutRef(deckModalCloseTimerRef, () => {
                setIsRunDeckOpen(false);
                setIsRunDeckClosing(false);
            }, DECK_MODAL_CLOSE_MS);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isRunDeckOpen, isRunDeckClosing, zoomedRunCard, isZoomedRunCardClosing]);

    const clearPendingAction = () => {
        clearTimeoutRef(actionTimerRef);
        clearTimeoutRef(reverseCueTimerRef);
        clearTimeoutRef(reverseCueClearTimerRef);
        dragOriginRef.current.pointerId = null;
        setDragState(DEFAULT_DRAG_STATE);
        setExitAnimation(null);
        setReverseCue(null);
    };

    const finalizeActionAtIndex = (action: SwipeAction, actionIndex: number) => {
        setRunCounters((prev) => ({
            ...prev,
            [action]: prev[action] + 1,
        }));
        setActionsByIndex((prev) => ({
            ...prev,
            [actionIndex]: action,
        }));
        setIndex(Math.min(actionIndex + 1, deck.length));
    };

    const animateAction = (action: SwipeAction) => {
        if (phase !== "ready" || !currentCard || isAnimatingSwipe || isAnimatingReverse) {
            return;
        }
        if (action === "super" && !canUseSuperLike) {
            return;
        }

        const viewportWidth = Math.max(window.innerWidth, document.body.clientWidth);
        const viewportHeight = Math.max(window.innerHeight, document.body.clientHeight);
        const moveOutWidth = Math.max(Math.floor(viewportWidth * 0.62), 280);
        const moveOutHeight = Math.max(Math.floor(viewportHeight * 0.56), 280);

        const activeIndex = index;
        let x = 0;
        let y = 0;
        let rotate = 0;
        if (action === "yes") {
            x = moveOutWidth;
            y = -72;
            rotate = -24;
        } else if (action === "no") {
            x = -moveOutWidth;
            y = -72;
            rotate = 24;
        } else {
            x = Math.round(dragState.x * 0.18);
            y = -moveOutHeight;
            rotate = Math.round(dragState.x * 0.015);
        }

        setDragState(DEFAULT_DRAG_STATE);
        setExitAnimation({
            cardIndex: activeIndex,
            action,
            x,
            y,
            rotate,
        });

        setTimeoutRef(actionTimerRef, () => {
            finalizeActionAtIndex(action, activeIndex);
            setExitAnimation(null);
        }, SWIPE_ANIMATION_MS);
    };

    const handleCardPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
        if (isAnimatingSwipe || isAnimatingReverse || phase !== "ready") {
            return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        dragOriginRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startedAtMs: performance.now(),
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragState({
            isActive: true,
            x: 0,
            y: 0,
        });
    };

    const handleCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
        if (!dragState.isActive || dragOriginRef.current.pointerId !== event.pointerId) {
            return;
        }

        setDragState({
            isActive: true,
            x: event.clientX - dragOriginRef.current.x,
            y: event.clientY - dragOriginRef.current.y,
        });
    };

    const handleCardPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
        if (!dragState.isActive || dragOriginRef.current.pointerId !== event.pointerId) {
            return;
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        dragOriginRef.current.pointerId = null;

        const deltaX = event.clientX - dragOriginRef.current.x;
        const deltaY = event.clientY - dragOriginRef.current.y;
        const elapsedMs = Math.max(performance.now() - dragOriginRef.current.startedAtMs, 1);
        const velocityX = deltaX / elapsedMs;
        const velocityY = deltaY / elapsedMs;
        const dominantVerticalUp = canUseSuperLike && deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.08;
        if (dominantVerticalUp) {
            const keepSuper = Math.abs(deltaY) < SUPER_SWIPE_COMMIT_PX || Math.abs(velocityY) < SUPER_SWIPE_COMMIT_VELOCITY;
            if (!keepSuper) {
                animateAction("super");
                return;
            }
            setDragState(DEFAULT_DRAG_STATE);
            return;
        }

        const keep = Math.abs(deltaX) < SWIPE_COMMIT_PX || Math.abs(velocityX) < SWIPE_COMMIT_VELOCITY;
        if (!keep) {
            animateAction(deltaX > 0 ? "yes" : "no");
            return;
        }

        setDragState(DEFAULT_DRAG_STATE);
    };

    const handleCardPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
        if (!dragState.isActive || dragOriginRef.current.pointerId !== event.pointerId) {
            return;
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        dragOriginRef.current.pointerId = null;
        setDragState(DEFAULT_DRAG_STATE);
    };

    const cardStyleForStackIndex = (stackIndex: number, absoluteIndex: number): CSSProperties => {
        const baseScale = (20 - stackIndex) / 20;
        const baseTranslateY = stackIndex * -18;
        const baseOpacity = Math.max(0, (10 - stackIndex) / 10);
        const isTopCard = stackIndex === 0;
        const isExiting = exitAnimation?.cardIndex === absoluteIndex;

        let translateX = 0;
        let translateY = baseTranslateY;
        let rotate = 0;
        let cardOpacity = isTopCard ? 1 : baseOpacity;
        let transition = "transform 320ms ease-in-out, opacity 180ms ease-out";

        if (isTopCard && dragState.isActive) {
            translateX = dragState.x;
            translateY = dragState.y;
            rotate = dragState.x * 0.045 + dragState.y * 0.01;
            cardOpacity = opacityForSwipeOffset(translateX, translateY);
            transition = "none";
        } else if (isExiting && exitAnimation) {
            translateX = exitAnimation.x;
            translateY = exitAnimation.y;
            rotate = exitAnimation.rotate;
            cardOpacity = 0;
            transition = `transform ${SWIPE_ANIMATION_MS}ms ease-in-out, opacity ${SWIPE_EXIT_FADE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;
        }

        const style: CSSProperties & Record<string, string | number> = {
            zIndex: STACK_VISIBLE_CARDS - stackIndex,
            opacity: cardOpacity,
            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${baseScale})`,
            transition,
        };
        style["--swipe-card-opacity"] = cardOpacity;
        return style;
    };

    const startRun = async () => {
        const startedAt = Date.now();
        setPhase("loading");
        closeRunDeckImmediately();
        setError("");
        try {
            const allCards = await fetchCards();
            const runDeck = shuffle(allCards).slice(0, RUN_SIZE);
            const elapsed = Date.now() - startedAt;
            if (elapsed < MIN_LOADING_MS) {
                await new Promise((resolve) => {
                    window.setTimeout(resolve, MIN_LOADING_MS - elapsed);
                });
            }
            setDeck(runDeck);
            setLoadedCardIds({});
            setRunCounters(createEmptyCounters());
            setActionsByIndex({});
            setReversedCardIndexes({});
            setReverseUses(0);
            setReverseCooldownUntilIndex(0);
            clearPendingAction();
            runDeck.slice(0, 8).forEach((card) => preloadCard(card.id));
            setIndex(0);
            setPhase("ready");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(message);
            setPhase("error");
        }
    };

    const reverseLastAction = () => {
        if (!canReversePreviousCard) {
            return;
        }

        const sourceIndex = index;
        const targetIndex = previousCardIndex;
        const previousAction = actionsByIndex[targetIndex];
        const targetCard = deck[targetIndex];
        if (!previousAction || !targetCard) {
            return;
        }

        const direction = reverseDirectionFromAction(previousAction);
        clearPendingAction();
        setReverseCue({
            phase: "edge",
            direction,
            cardId: targetCard.id,
        });

        setTimeoutRef(reverseCueTimerRef, () => {
            setRunCounters((prev) => ({
                ...prev,
                [previousAction]: Math.max(prev[previousAction] - 1, 0),
            }));
            setActionsByIndex((prev) => {
                const next = { ...prev };
                delete next[targetIndex];
                return next;
            });
            setReversedCardIndexes((prev) => ({
                ...prev,
                [targetIndex]: true,
            }));
            setReverseUses((prev) => prev + 1);
            setReverseCooldownUntilIndex(sourceIndex + 1);
            setIndex(targetIndex);
            setReverseCue({
                phase: "center",
                direction,
                cardId: targetCard.id,
            });
            setTimeoutRef(reverseCueClearTimerRef, () => {
                setReverseCue(null);
            }, REVERSE_CENTER_CUE_MS);
        }, REVERSE_EDGE_CUE_MS);
    };

    const reset = () => {
        if (isTransitioningToIntro) {
            return;
        }

        closeRunDeckImmediately();
        setIsTransitioningToIntro(true);

        setTimeoutRef(shellExitTimerRef, () => {
            setPhase("intro");
            setDeck([]);
            setIndex(0);
            setError("");
            setLoadedCardIds({});
            setRunCounters(createEmptyCounters());
            setActionsByIndex({});
            setReversedCardIndexes({});
            setReverseUses(0);
            setReverseCooldownUntilIndex(0);
            clearPendingAction();
            setIsTransitioningToIntro(false);
        }, SHELL_EXIT_TO_INTRO_MS);
    };

    const isDone = phase === "ready" && index >= deck.length;
    const useIntroShellLayout = phase === "intro" || phase === "loading" || phase === "error" || isTransitioningToIntro;
    const shellClassName = `game-shell ${useIntroShellLayout ? "shell-intro" : isDone ? "shell-complete" : "shell-active"}${isTransitioningToIntro ? " is-transitioning-out" : ""}`;

    return (
        <div className="app">
            <main className="hero">
                <img className="logo" src={logo} alt="HearthSwipe logo" />
                <div className={shellClassName}>
                    {phase === "intro" && (
                        <section className="panel panel--enter">
                            <h1>Ready to judge cards?</h1>
                            <p className="intro-subtitle">30 collectible cards. Fast calls. No take-backs abuse.</p>
                            <ul className="intro-rules" aria-label="Run rules">
                                <li>
                                    <span className="intro-rule-line">
                                        <img className="intro-rule-icon intro-rule-icon--major" src={buttonYes} alt="" aria-hidden="true" />
                                        <strong>Like</strong>: keep the card.
                                    </span>
                                </li>
                                <li>
                                    <span className="intro-rule-line">
                                        <img className="intro-rule-icon intro-rule-icon--major" src={buttonNo} alt="" aria-hidden="true" />
                                        <strong>Nope</strong>: reject the card.
                                    </span>
                                </li>
                                <li>
                                    <span className="intro-rule-line">
                                        <img className="intro-rule-icon" src={buttonSuper} alt="" aria-hidden="true" />
                                        <strong>Super Like</strong>: max {RUN_SUPER_LIKE_LIMIT} per run.
                                    </span>
                                </li>
                                <li>
                                    <span className="intro-rule-line">
                                        <img className="intro-rule-icon" src={buttonReverse} alt="" aria-hidden="true" />
                                        <strong>Reverse</strong>: max {RUN_REVERSE_LIMIT} per run, latest card only.
                                    </span>
                                </li>
                            </ul>
                            <button className="btn" onClick={startRun} type="button">
                                Start
                            </button>
                        </section>
                    )}

                    {phase === "loading" && (
                        <section className="panel panel--enter loading-panel">
                            <h1>Loading cards...</h1>
                            <p>Summoning HearthstoneJSON data.</p>
                        </section>
                    )}

                    {phase === "error" && (
                        <section className="panel panel--enter">
                            <h1>Could not load cards</h1>
                            <p>{error}</p>
                            <button className="btn" onClick={startRun} type="button">
                                Retry
                            </button>
                        </section>
                    )}

                    {phase === "ready" && currentCard && (
                        <section className="panel card-panel">
                            <div className="card-content">
                                <div className="swipe-stack reveal reveal-2">
                                    {showNextCardVoteIcon && (
                                        <div className="next-card-vote-overlay" aria-hidden="true">
                                            <img src={nextCardVoteIcon ?? ""} alt="" />
                                        </div>
                                    )}
                                    {reverseCue?.phase === "edge" && (
                                        <div className={`reverse-edge-cue reverse-edge-cue--${reverseCue.direction}`} aria-hidden="true">
                                            <img className="reverse-edge-cue__card" src={cardImageUrl(reverseCue.cardId)} alt="" />
                                        </div>
                                    )}
                                    {reverseCue?.phase === "center" && (
                                        <div className="next-card-vote-overlay next-card-vote-overlay--reverse" aria-hidden="true">
                                            <img src={overlayVoteReverse} alt="" />
                                        </div>
                                    )}
                                    {visibleCards.map((card, stackIndex) => {
                                        const absoluteIndex = index + stackIndex;
                                        const isTopCard = stackIndex === 0;
                                        const isTopInteractive = isTopCard && !isAnimatingSwipe && !isAnimatingReverse;
                                        const isExitingCard = exitAnimation?.cardIndex === absoluteIndex;
                                        const isSwipeHighlighted = (isTopCard && dragState.isActive) || isExitingCard;
                                        return (
                                            <article
                                                key={card.id}
                                                className={`swipe-card ${isTopCard ? "is-top" : ""} ${isTopInteractive ? "is-interactive" : ""} ${isTopCard && dragState.isActive ? "is-dragging" : ""} ${isExitingCard ? "is-exiting" : ""} ${isSwipeHighlighted ? "is-highlighted" : ""}`}
                                                style={cardStyleForStackIndex(stackIndex, absoluteIndex)}
                                                onPointerDown={isTopInteractive ? handleCardPointerDown : undefined}
                                                onPointerMove={isTopInteractive ? handleCardPointerMove : undefined}
                                                onPointerUp={isTopInteractive ? handleCardPointerEnd : undefined}
                                                onPointerCancel={isTopInteractive ? handleCardPointerCancel : undefined}
                                            >
                                                <div className={`card-art-slot ${rarityClassName(card.rarity)} ${loadedCardIds[card.id] ? "" : "is-loading"}`}>
                                                    <img
                                                        className={`card-image ${loadedCardIds[card.id] ? "is-ready" : "is-pending"}`}
                                                        src={cardImageUrl(card.id)}
                                                        alt={card.name}
                                                        loading="lazy"
                                                        onLoad={() => markCardLoaded(card.id)}
                                                    />
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                <p className="run-count reveal reveal-1">
                                    {index + 1} / {deck.length}
                                </p>
                                <section className="card-meta reveal reveal-3">
                                    <p className="card-artist">Artist: {currentCard.artist ?? "Unknown"}</p>
                                    <FlavorTextBox flavor={currentCard.flavor} />
                                </section>
                            </div>
                            <section className="card-footer">
                                <section className="card-actions" aria-label="Card actions">
                                    <button
                                        className="action-btn action-btn--minor"
                                        type="button"
                                        onClick={reverseLastAction}
                                        aria-label="Reverse last choice"
                                        title={reverseActionTitle}
                                        disabled={!canReversePreviousCard}
                                    >
                                        <img src={buttonReverse} alt="" />
                                    </button>
                                    <button
                                        className="action-btn action-btn--major"
                                        onClick={() => animateAction("no")}
                                        type="button"
                                        aria-label="Nope"
                                        disabled={isAnimatingSwipe || isAnimatingReverse}
                                    >
                                        <img src={buttonNo} alt="" />
                                    </button>
                                    <button
                                        className="action-btn action-btn--minor"
                                        onClick={() => animateAction("super")}
                                        type="button"
                                        aria-label="Super Like"
                                        title={superLikeTitle}
                                        disabled={!canUseSuperLike}
                                    >
                                        <img src={buttonSuper} alt="" />
                                    </button>
                                    <button
                                        className="action-btn action-btn--major"
                                        onClick={() => animateAction("yes")}
                                        type="button"
                                        aria-label="Like"
                                        disabled={isAnimatingSwipe || isAnimatingReverse}
                                    >
                                        <img src={buttonYes} alt="" />
                                    </button>
                                    <div className="info-action action-btn--minor">
                                        <button className="action-btn action-btn--minor" type="button" aria-label="Info">
                                            <img src={buttonInfo} alt="" />
                                        </button>
                                        <div className="info-bubble" aria-hidden="true">
                                            <img className="info-bubble__bg" src={popupChatBubble} alt="" />
                                            <span className="info-bubble__text">
                                                {RUN_SIZE} cards. {RUN_REVERSE_LIMIT} reverses. {RUN_SUPER_LIKE_LIMIT} Super Likes. Save the flashy plays for the coolest cards.
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </section>
                        </section>
                    )}

                    {isDone && (
                        <section className={`panel panel--enter panel--run-complete${isTransitioningToIntro ? " is-transitioning-out" : ""}`}>
                            <h1>Run complete</h1>
                            <p className="run-summary-intro">You judged {runSummary.totalCards} cards this run.</p>

                            <div className="run-summary-grid">
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Reverses Used</span>
                                    <strong className="run-summary-stat__value">{runSummary.reversesUsed}</strong>
                                </article>
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Like Rate</span>
                                    <strong className="run-summary-stat__value">{formatPercent(runSummary.likeRatio)}</strong>
                                </article>
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Avg Liked Mana</span>
                                    <strong className="run-summary-stat__value">{runSummary.avgMana === null ? "n/a" : runSummary.avgMana.toFixed(1)}</strong>
                                </article>
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Nopes</span>
                                    <strong className="run-summary-stat__value">{runSummary.nopes}</strong>
                                </article>
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Super Likes</span>
                                    <strong className="run-summary-stat__value">{runSummary.superLikes}</strong>
                                </article>
                                <article className="run-summary-stat">
                                    <span className="run-summary-stat__label">Likes</span>
                                    <strong className="run-summary-stat__value">{runSummary.likes}</strong>
                                </article>
                            </div>

                            {runSummary.primaryTitle && (
                                <section className="run-primary-title" aria-label="Primary badge">
                                    <p className="run-primary-title__label">Primary badge</p>
                                    <article
                                        className={`run-primary-title__badge run-badge run-badge--${runSummary.primaryTitle.rarity}`}
                                        style={{ "--badge-hue": runSummary.primaryTitle.hue } as CSSProperties}
                                        tabIndex={0}
                                    >
                                        <span className="run-badge__name">{runSummary.primaryTitle.name}</span>
                                        <span className="run-badge__tooltip">{renderBadgeTooltipContent(runSummary.primaryTitle)}</span>
                                    </article>
                                </section>
                            )}

                            <section className="run-badges" aria-label="Earned badges">
                                <h2>Earned badges</h2>
                                {runSummary.badges.length === 0 && (
                                    <p className="run-badges__empty">No badges this time. Try a different swipe style next run.</p>
                                )}
                                <div className="run-badge-list">
                                    {runSummary.badges.map((badge) => (
                                        <article
                                            className={`run-badge run-badge--${badge.rarity}`}
                                            key={badge.id}
                                            style={{ "--badge-hue": badge.hue } as CSSProperties}
                                            tabIndex={0}
                                        >
                                            <span className="run-badge__name">{badge.name}</span>
                                            <span className="run-badge__tooltip">{renderBadgeTooltipContent(badge)}</span>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <div className="run-complete-actions">
                                <button className="btn" onClick={openRunDeck} type="button" disabled={isTransitioningToIntro}>
                                    View Deck
                                </button>
                                <button className="btn" onClick={reset} type="button" disabled={isTransitioningToIntro}>
                                    New Run
                                </button>
                            </div>
                        </section>
                    )}

                    {isDone && isRunDeckOpen && (
                        <div className={`run-deck-modal ${isRunDeckClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="run-deck-title">
                            <button
                                className="run-deck-modal__backdrop"
                                type="button"
                                aria-label="Close deck list"
                                onClick={closeRunDeck}
                            />
                            <section className="run-deck-modal__panel">
                                <header className="run-deck-modal__header">
                                    <div className="run-deck-modal__title-wrap">
                                        <h2 id="run-deck-title">Seen cards ({runDeckEntries.length})</h2>
                                        <button
                                            className={`run-deck-modal__copy ${deckCodeCopyState !== "idle" ? `is-${deckCodeCopyState}` : ""}`}
                                            type="button"
                                            onClick={copyDeckCode}
                                            disabled={runDeckExport.deckstring === null}
                                            title={copyDeckButtonTitle}
                                        >
                                            {copyDeckButtonLabel}
                                        </button>
                                    </div>
                                    <button className="run-deck-modal__close" type="button" onClick={closeRunDeck}>
                                        Close
                                    </button>
                                </header>
                                <div className="run-deck-modal__list">
                                    {runDeckEntries.map((entry) => {
                                        const actionIcon = runActionIcon(entry.action);
                                        const actionLabel = runActionLabel(entry.action);
                                        return (
                                            <article className="run-deck-card" key={`${entry.card.id}-${entry.cardIndex}`}>
                                                <button
                                                    className="run-deck-card__thumb"
                                                    type="button"
                                                    onClick={() => openZoomedRunCard(entry.card)}
                                                    onPointerEnter={() => preloadZoomCard(entry.card.id)}
                                                    onFocus={() => preloadZoomCard(entry.card.id)}
                                                    aria-label={`Enlarge ${entry.card.name}`}
                                                >
                                                    <img className="run-deck-card__image" src={cardImageUrl(entry.card.id)} alt={`${entry.card.name} card art`} />
                                                </button>
                                                <div className="run-deck-card__body">
                                                    <h3 className="run-deck-card__name">
                                                        #{entry.cardIndex + 1} • {entry.card.name}
                                                    </h3>
                                                    <p className="run-deck-card__meta">
                                                        {formatTokenForUi(entry.card.cardClass)} {formatTokenForUi(entry.card.cardType)}
                                                    </p>
                                                </div>
                                                <span className="run-deck-card__vote" aria-label={actionLabel} title={actionLabel}>
                                                    {actionIcon && <img src={actionIcon} alt="" aria-hidden="true" />}
                                                </span>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                            {zoomedRunCard && (
                                <div className={`run-card-zoom ${isZoomedRunCardClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={`${zoomedRunCard.name} preview`}>
                                    <button
                                        className="run-card-zoom__backdrop"
                                        type="button"
                                        aria-label="Close card preview"
                                        onClick={closeZoomedRunCard}
                                    />
                                    <section className="run-card-zoom__panel">
                                        <img
                                            className={`run-card-zoom__image ${isZoomedRunCardReady ? "is-ready" : ""}`}
                                            src={cardImageUrl(zoomedRunCard.id)}
                                            alt={zoomedRunCard.name}
                                            loading="eager"
                                            decoding="async"
                                            onLoad={() => setIsZoomedRunCardReady(true)}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
