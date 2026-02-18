import { type ReactNode, useEffect, useMemo, useState } from "react";
import logo from "./assets/logo-hearthswipe.png";

type Phase = "intro" | "loading" | "ready" | "error";

type HearthstoneCard = {
    id: string;
    name: string;
    artist?: string;
    flavor?: string;
};

const CARDS_URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";
const RUN_SIZE = 30;
const MIN_LOADING_MS = 700;

function cleanCard(card: Partial<HearthstoneCard>): HearthstoneCard | null {
    if (!card.id || !card.name) {
        return null;
    }
    return {
        id: card.id,
        name: card.name,
        artist: card.artist,
        flavor: card.flavor,
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

    const raw = (await response.json()) as Array<Partial<HearthstoneCard>>;
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

    const tokens = flavor.split(/(<\/?i>)/gi);
    let italic = false;
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
        parts.push(italic ? <em key={`flavor-${index}`}>{token}</em> : <span key={`flavor-${index}`}>{token}</span>);
    });

    return parts.length > 0 ? parts : flavor.replace(/<[^>]+>/g, "");
}

export default function App() {
    const [phase, setPhase] = useState<Phase>("intro");
    const [deck, setDeck] = useState<HearthstoneCard[]>([]);
    const [index, setIndex] = useState(0);
    const [error, setError] = useState<string>("");
    const [loadedCardIds, setLoadedCardIds] = useState<Record<string, true>>({});

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
            runDeck.slice(0, 8).forEach((card) => preloadCard(card.id));
            setIndex(0);
            setPhase("ready");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(message);
            setPhase("error");
        }
    };

    const nextCard = () => {
        setIndex((prev) => Math.min(prev + 1, deck.length));
    };

    const reset = () => {
        setPhase("intro");
        setDeck([]);
        setIndex(0);
        setError("");
        setLoadedCardIds({});
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
                            <div className="card-content" key={currentCard.id}>
                                <p className="run-count reveal reveal-1">
                                    Card {index + 1} / {deck.length}
                                </p>
                                <div className={`card-art-slot reveal reveal-2 ${loadedCardIds[currentCard.id] ? "" : "is-loading"}`}>
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
                                    <p className="card-flavor">{renderFlavorText(currentCard.flavor)}</p>
                                </section>
                                <button className="btn reveal reveal-4" onClick={nextCard} type="button">
                                    Next Card
                                </button>
                            </div>
                        </section>
                    )}

                    {isDone && (
                        <section className="panel panel--enter">
                            <h1>Run complete</h1>
                            <p>You went through {deck.length} cards.</p>
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
