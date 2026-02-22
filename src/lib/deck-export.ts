import { encode } from "deckstrings";
import type { DeckstringBuildResult, HearthstoneCard, RunDeckEntry } from "../types/game";

const DECKSTRING_FORMAT_WILD = 1 as const;
const DEFAULT_DECK_EXPORT_CLASS = "MAGE";
const HERO_DBF_BY_CLASS: Record<string, number> = {
    DEATHKNIGHT: 78065,
    DEMONHUNTER: 56550,
    DRUID: 274,
    HUNTER: 31,
    MAGE: 637,
    PALADIN: 671,
    PRIEST: 813,
    ROGUE: 930,
    SHAMAN: 1066,
    WARLOCK: 893,
    WARRIOR: 7,
};

function pickDeckExportClass(entries: RunDeckEntry[]): string {
    const classCounts = new Map<string, number>();

    entries.forEach((entry) => {
        if (entry.action !== "yes" && entry.action !== "super") {
            return;
        }
        const cardClass = entry.card.cardClass;
        if (!cardClass || cardClass === "NEUTRAL" || cardClass === "UNKNOWN") {
            return;
        }
        classCounts.set(cardClass, (classCounts.get(cardClass) ?? 0) + 1);
    });

    if (classCounts.size === 0) {
        return DEFAULT_DECK_EXPORT_CLASS;
    }

    let selectedClass = DEFAULT_DECK_EXPORT_CLASS;
    let selectedCount = -1;
    classCounts.forEach((count, cardClass) => {
        if (count > selectedCount || (count === selectedCount && cardClass < selectedClass)) {
            selectedClass = cardClass;
            selectedCount = count;
        }
    });

    return selectedClass;
}

function maxDeckCopiesForCard(card: HearthstoneCard): number {
    return card.rarity === "LEGENDARY" ? 1 : 2;
}

export function buildDeckstringFromRun(entries: RunDeckEntry[]): DeckstringBuildResult {
    const likedEntries = entries.filter((entry) => entry.action === "yes" || entry.action === "super");
    if (likedEntries.length === 0) {
        return {
            deckstring: null,
            error: "Like at least one card to export a deck code.",
        };
    }

    const selectedClass = pickDeckExportClass(likedEntries);
    const heroDbfId = HERO_DBF_BY_CLASS[selectedClass] ?? HERO_DBF_BY_CLASS[DEFAULT_DECK_EXPORT_CLASS];
    const eligibleCards = likedEntries.filter((entry) => entry.card.cardClass === selectedClass || entry.card.cardClass === "NEUTRAL");

    const cardCounts = new Map<number, number>();
    eligibleCards.forEach((entry) => {
        if (entry.card.dbfId === null) {
            return;
        }
        const currentCopies = cardCounts.get(entry.card.dbfId) ?? 0;
        const maxCopies = maxDeckCopiesForCard(entry.card);
        if (currentCopies >= maxCopies) {
            return;
        }
        cardCounts.set(entry.card.dbfId, currentCopies + 1);
    });

    if (cardCounts.size === 0) {
        return {
            deckstring: null,
            error: "No class-compatible liked cards yet (export uses your top class + neutral cards).",
        };
    }

    try {
        const cards = Array.from(cardCounts.entries()) as Array<[number, number]>;
        const deckstring = encode({
            cards,
            heroes: [heroDbfId],
            format: DECKSTRING_FORMAT_WILD,
        });
        const exportedCardCount = cards.reduce((sum, [, copies]) => sum + copies, 0);
        return {
            deckstring,
            selectedClass,
            exportedCardCount,
        };
    } catch {
        return {
            deckstring: null,
            error: "Could not encode this run into a deck code.",
        };
    }
}

export function formatTokenForUi(token?: string): string {
    if (!token) {
        return "Unknown";
    }
    return token
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
