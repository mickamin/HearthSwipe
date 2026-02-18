import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/logo-hearthswipe.png";
import buttonInfo from "./assets/button-info.png";
import buttonNo from "./assets/button-no.png";
import buttonReverse from "./assets/button-reverse.png";
import buttonSuper from "./assets/button-super.png";
import buttonYes from "./assets/button-yes.png";
import popupChatBubble from "./assets/popup-chat-bubble.png";

type Phase = "intro" | "loading" | "ready" | "error";

type CardRarity = "NONE" | "FREE" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
type SwipeAction = "yes" | "no" | "super";

type RunCounters = {
    yes: number;
    no: number;
    super: number;
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

    const currentCard = useMemo(() => deck[index], [deck, index]);

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
            runDeck.slice(0, 8).forEach((card) => preloadCard(card.id));
            setIndex(0);
            setPhase("ready");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(message);
            setPhase("error");
        }
    };

    const advanceCard = () => {
        setIndex((prev) => Math.min(prev + 1, deck.length));
    };

    const applyAction = (action: SwipeAction) => {
        setRunCounters((prev) => ({
            ...prev,
            [action]: prev[action] + 1,
        }));
        advanceCard();
    };

    const reset = () => {
        setPhase("intro");
        setDeck([]);
        setIndex(0);
        setError("");
        setLoadedCardIds({});
        setRunCounters(createEmptyCounters());
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
                            <p>Start a 30-card run. We fetch collectible cards only.</p>
                            <button className="btn" onClick={startRun} type="button">
                                Begin Run
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
                                <div
                                    className={`card-art-slot reveal reveal-2 ${rarityClassName(currentCard.rarity)} ${loadedCardIds[currentCard.id] ? "" : "is-loading"}`}
                                >
                                    <img
                                        className={`card-image ${loadedCardIds[currentCard.id] ? "is-ready" : "is-pending"}`}
                                        src={cardImageUrl(currentCard.id)}
                                        alt={currentCard.name}
                                        loading="lazy"
                                        onLoad={() => markCardLoaded(currentCard.id)}
                                    />
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
                                        aria-label="Reverse (coming soon)"
                                        title="Reverse (coming soon)"
                                    >
                                        <img src={buttonReverse} alt="" />
                                    </button>
                                    <button className="action-btn action-btn--major" onClick={() => applyAction("no")} type="button" aria-label="Nope">
                                        <img src={buttonNo} alt="" />
                                    </button>
                                    <button className="action-btn action-btn--minor" onClick={() => applyAction("super")} type="button" aria-label="Super Like">
                                        <img src={buttonSuper} alt="" />
                                    </button>
                                    <button className="action-btn action-btn--major" onClick={() => applyAction("yes")} type="button" aria-label="Like">
                                        <img src={buttonYes} alt="" />
                                    </button>
                                    <div className="info-action action-btn--minor">
                                        <button className="action-btn action-btn--minor" type="button" aria-label="Info">
                                            <img src={buttonInfo} alt="" />
                                        </button>
                                        <div className="info-bubble" aria-hidden="true">
                                            <img className="info-bubble__bg" src={popupChatBubble} alt="" />
                                            <span className="info-bubble__text">
                                                You get {RUN_REVERSE_LIMIT} reverses and {RUN_SUPER_LIKE_LIMIT} super likes for this {RUN_SIZE}-card run. Spend them wisely.
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
