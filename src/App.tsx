import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type Phase = "intro" | "loading" | "ready" | "error";

type CardRarity = "NONE" | "FREE" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
type SwipeAction = "yes" | "no" | "super";

type RunCounters = {
    yes: number;
    no: number;
    super: number;
};

type DragState = {
    isActive: boolean;
    x: number;
    y: number;
};

type ExitAnimationState = {
    cardIndex: number;
    action: SwipeAction;
    x: number;
    y: number;
    rotate: number;
};

type ReverseCueDirection = "left" | "right" | "up";

type ReverseCueState = {
    phase: "edge" | "center";
    direction: ReverseCueDirection;
    cardId: string;
};

type HearthstoneCard = {
    id: string;
    name: string;
    artist?: string;
    flavor?: string;
    rarity: CardRarity;
};

type RawHearthstoneCard = Partial<Omit<HearthstoneCard, "rarity">> & {
    rarity?: string;
};

const CARDS_URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";
const RUN_SIZE = 30;
const MIN_LOADING_MS = 700;
const RUN_REVERSE_LIMIT = 3;
const RUN_SUPER_LIKE_LIMIT = 2;
const FLAVOR_FONT_MAX_PX = 14;
const FLAVOR_FONT_MIN_PX = 9;
const FLAVOR_FONT_STEP_PX = 0.5;
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

function createEmptyCounters(): RunCounters {
    return {
        yes: 0,
        no: 0,
        super: 0,
    };
}

function plainFlavorText(flavor?: string): string {
    if (!flavor) {
        return "";
    }
    return flavor
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeRarity(rarity?: string): CardRarity {
    const value = typeof rarity === "string" ? rarity.toUpperCase() : "";
    switch (value) {
        case "FREE":
        case "COMMON":
        case "RARE":
        case "EPIC":
        case "LEGENDARY":
            return value;
        default:
            return "NONE";
    }
}

function rarityClassName(rarity: CardRarity): string {
    return `rarity-${rarity.toLowerCase()}`;
}

function cleanCard(card: RawHearthstoneCard): HearthstoneCard | null {
    if (!card.id || !card.name) {
        return null;
    }

    const artist = card.artist?.trim();
    const flavor = typeof card.flavor === "string" ? card.flavor : "";

    // Keep only cards that have both attribution and meaningful flavor text.
    if (!artist || !plainFlavorText(flavor)) {
        return null;
    }

    return {
        id: card.id,
        name: card.name,
        artist,
        flavor,
        rarity: normalizeRarity(card.rarity),
    };
}

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

async function fetchCards(): Promise<HearthstoneCard[]> {
    const response = await fetch(CARDS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch cards (${response.status})`);
    }

    const raw = (await response.json()) as RawHearthstoneCard[];
    const cards = raw.map(cleanCard).filter((card): card is HearthstoneCard => Boolean(card));
    return cards;
}

function cardImageUrl(cardId: string): string {
    return `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png`;
}

function renderFlavorText(flavor?: string): ReactNode {
    if (!flavor) {
        return "No flavor text.";
    }

    const tokens = flavor.split(/(<\/?(?:i|b)>|<br\s*\/?>)/gi);
    let italic = false;
    let bold = false;
    const parts: ReactNode[] = [];

    tokens.forEach((token, index) => {
        if (!token) {
            return;
        }
        if (/^<i>$/i.test(token)) {
            italic = true;
            return;
        }
        if (/^<\/i>$/i.test(token)) {
            italic = false;
            return;
        }
        if (/^<b>$/i.test(token)) {
            bold = true;
            return;
        }
        if (/^<\/b>$/i.test(token)) {
            bold = false;
            return;
        }
        if (/^<br\s*\/?>$/i.test(token)) {
            parts.push(<br key={`flavor-br-${index}`} />);
            return;
        }

        const text = token.replace(/<[^>]+>/g, "");
        if (!text) {
            return;
        }

        let content: ReactNode = text;
        if (italic) {
            content = <em>{content}</em>;
        }
        if (bold) {
            content = <strong>{content}</strong>;
        }

        parts.push(<span key={`flavor-${index}`}>{content}</span>);
    });

    const fallback = flavor.replace(/<[^>]+>/g, "").trim();
    return parts.length > 0 ? parts : fallback || "No flavor text.";
}

function FlavorTextBox({ flavor }: { flavor?: string }) {
    const textRef = useRef<HTMLParagraphElement | null>(null);

    useLayoutEffect(() => {
        let raf = 0;
        const text = textRef.current;
        if (!text) {
            return;
        }

        const fitText = () => {
            const node = textRef.current;
            if (!node) {
                return;
            }

            let size = FLAVOR_FONT_MAX_PX;
            node.style.setProperty("--flavor-font-size", `${size}px`);

            while (
                size > FLAVOR_FONT_MIN_PX &&
                (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)
            ) {
                size -= FLAVOR_FONT_STEP_PX;
                node.style.setProperty("--flavor-font-size", `${size}px`);
            }
        };

        const scheduleFit = () => {
            window.cancelAnimationFrame(raf);
            raf = window.requestAnimationFrame(fitText);
        };

        scheduleFit();
        window.addEventListener("resize", scheduleFit);

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(scheduleFit);
            if (text.parentElement) {
                observer.observe(text.parentElement);
            }
        }

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("resize", scheduleFit);
            observer?.disconnect();
        };
    }, [flavor]);

    return (
        <div className="card-flavor-box">
            <p ref={textRef} className="card-flavor">
                {renderFlavorText(flavor)}
            </p>
        </div>
    );
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
    const dragOriginRef = useRef<{ pointerId: number | null; x: number; y: number; startedAtMs: number }>({
        pointerId: null,
        x: 0,
        y: 0,
        startedAtMs: 0,
    });
    const actionTimerRef = useRef<number | null>(null);
    const reverseCueTimerRef = useRef<number | null>(null);
    const reverseCueClearTimerRef = useRef<number | null>(null);

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

    const markCardLoaded = (cardId: string) => {
        setLoadedCardIds((prev) => {
            if (prev[cardId]) {
                return prev;
            }
            return {
                ...prev,
                [cardId]: true,
            };
        });
    };

    const preloadCard = (cardId: string) => {
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
    };

    useEffect(() => {
        if (deck.length === 0) {
            return;
        }
        deck.slice(index, index + 6).forEach((card) => preloadCard(card.id));
        // We intentionally preload only nearby cards for smooth swipes with low memory impact.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deck, index]);

    useEffect(() => {
        return () => {
            if (actionTimerRef.current !== null) {
                window.clearTimeout(actionTimerRef.current);
            }
            if (reverseCueTimerRef.current !== null) {
                window.clearTimeout(reverseCueTimerRef.current);
            }
            if (reverseCueClearTimerRef.current !== null) {
                window.clearTimeout(reverseCueClearTimerRef.current);
            }
        };
    }, []);

    const clearPendingAction = () => {
        if (actionTimerRef.current !== null) {
            window.clearTimeout(actionTimerRef.current);
            actionTimerRef.current = null;
        }
        if (reverseCueTimerRef.current !== null) {
            window.clearTimeout(reverseCueTimerRef.current);
            reverseCueTimerRef.current = null;
        }
        if (reverseCueClearTimerRef.current !== null) {
            window.clearTimeout(reverseCueClearTimerRef.current);
            reverseCueClearTimerRef.current = null;
        }
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

        if (actionTimerRef.current !== null) {
            window.clearTimeout(actionTimerRef.current);
        }
        actionTimerRef.current = window.setTimeout(() => {
            finalizeActionAtIndex(action, activeIndex);
            setExitAnimation(null);
            actionTimerRef.current = null;
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

        reverseCueTimerRef.current = window.setTimeout(() => {
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
            reverseCueTimerRef.current = null;
            reverseCueClearTimerRef.current = window.setTimeout(() => {
                setReverseCue(null);
                reverseCueClearTimerRef.current = null;
            }, REVERSE_CENTER_CUE_MS);
        }, REVERSE_EDGE_CUE_MS);
    };

    const reset = () => {
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
    };

    const isDone = phase === "ready" && index >= deck.length;
    const shellClassName = `game-shell ${phase === "intro" ? "shell-intro" : "shell-active"}`;

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
                                <p className="run-count reveal reveal-1">
                                    Card {index + 1} / {deck.length}
                                </p>
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
                        <section className="panel panel--enter">
                            <h1>Run complete</h1>
                            <p>You went through {deck.length} cards.</p>
                            <p>
                                No: {runCounters.no} | Super: {runCounters.super} | Yes: {runCounters.yes}
                            </p>
                            <p>Reverses used: {reverseUses}</p>
                            <button className="btn" onClick={reset} type="button">
                                Start New Run
                            </button>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}
