import type { CardRarity, HearthstoneCard } from "../types/game";

type RawCardTag = string | { name?: string } | null | undefined;

type RawHearthstoneCard = {
    id?: string;
    dbfId?: number;
    name?: string;
    artist?: string;
    flavor?: string;
    rarity?: string;
    cost?: number;
    type?: string;
    cardClass?: string;
    race?: string;
    races?: string[] | string;
    mechanics?: RawCardTag[];
    referencedTags?: RawCardTag[];
    attack?: number;
    health?: number;
    set?: string;
};

type CardCacheRecord = {
    schemaVersion: number;
    sourceUrl: string;
    savedAt: number;
    cards: HearthstoneCard[];
};

const CARDS_URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";
const CARD_CACHE_KEY = "hearthswipe.collectible-cards.v3";
const CARD_CACHE_SCHEMA_VERSION = 3;
const CARD_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

let inMemoryCardsCache: HearthstoneCard[] | null = null;
let inFlightCardsRequest: Promise<HearthstoneCard[]> | null = null;

export function cardImageUrl(cardId: string): string {
    return `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png`;
}

export function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
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

function normalizeToken(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value
        .trim()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_")
        .toUpperCase();
}

function optionalNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalPositiveInteger(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeTokenList(value: unknown): string[] {
    if (Array.isArray(value)) {
        const tokens = value
            .map((entry) => (typeof entry === "string" ? entry : typeof entry === "object" && entry ? (entry as { name?: unknown }).name : ""))
            .map((entry) => normalizeToken(entry))
            .filter(Boolean);
        return Array.from(new Set(tokens));
    }

    if (typeof value === "string") {
        const tokens = value
            .split(/[|,]/)
            .map((token) => normalizeToken(token))
            .filter(Boolean);
        return Array.from(new Set(tokens));
    }

    return [];
}

function extractCardRaces(card: RawHearthstoneCard): string[] {
    if (card.races) {
        return normalizeTokenList(card.races);
    }
    return normalizeTokenList(card.race);
}

function extractCardMechanics(card: RawHearthstoneCard): string[] {
    const direct = normalizeTokenList(card.mechanics);
    const referenced = normalizeTokenList(card.referencedTags);
    return Array.from(new Set([...direct, ...referenced]));
}

function isHearthstoneCard(value: unknown): value is HearthstoneCard {
    if (!value || typeof value !== "object") {
        return false;
    }

    const card = value as Partial<HearthstoneCard>;
    return (
        typeof card.id === "string" &&
        (typeof card.dbfId === "number" || card.dbfId === null) &&
        typeof card.name === "string" &&
        typeof card.artist === "string" &&
        typeof card.flavor === "string" &&
        typeof card.rarity === "string" &&
        (typeof card.cost === "number" || card.cost === null) &&
        typeof card.cardType === "string" &&
        typeof card.cardClass === "string" &&
        Array.isArray(card.races) &&
        card.races.every((race) => typeof race === "string") &&
        Array.isArray(card.mechanics) &&
        card.mechanics.every((mechanic) => typeof mechanic === "string") &&
        (typeof card.attack === "number" || card.attack === null) &&
        (typeof card.health === "number" || card.health === null) &&
        typeof card.cardSet === "string"
    );
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
        dbfId: optionalPositiveInteger(card.dbfId),
        name: card.name,
        artist,
        flavor,
        rarity: normalizeRarity(card.rarity),
        cost: optionalNumber(card.cost),
        cardType: normalizeToken(card.type) || "UNKNOWN",
        cardClass: normalizeToken(card.cardClass) || "UNKNOWN",
        races: extractCardRaces(card),
        mechanics: extractCardMechanics(card),
        attack: optionalNumber(card.attack),
        health: optionalNumber(card.health),
        cardSet: normalizeToken(card.set) || "UNKNOWN",
    };
}

function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isCardCacheRecord(value: unknown): value is CardCacheRecord {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<CardCacheRecord>;
    return (
        candidate.schemaVersion === CARD_CACHE_SCHEMA_VERSION &&
        candidate.sourceUrl === CARDS_URL &&
        typeof candidate.savedAt === "number" &&
        Array.isArray(candidate.cards) &&
        candidate.cards.every((card) => isHearthstoneCard(card))
    );
}

function readCardsFromLocalCache(options?: { allowStale?: boolean }): HearthstoneCard[] | null {
    if (!canUseLocalStorage()) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(CARD_CACHE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!isCardCacheRecord(parsed)) {
            window.localStorage.removeItem(CARD_CACHE_KEY);
            return null;
        }

        const isStale = Date.now() - parsed.savedAt > CARD_CACHE_TTL_MS;
        if (isStale && !options?.allowStale) {
            return null;
        }

        if (parsed.cards.length === 0) {
            window.localStorage.removeItem(CARD_CACHE_KEY);
            return null;
        }

        return parsed.cards;
    } catch {
        return null;
    }
}

function writeCardsToLocalCache(cards: HearthstoneCard[]): void {
    if (!canUseLocalStorage() || cards.length === 0) {
        return;
    }

    const payload: CardCacheRecord = {
        schemaVersion: CARD_CACHE_SCHEMA_VERSION,
        sourceUrl: CARDS_URL,
        savedAt: Date.now(),
        cards,
    };

    try {
        window.localStorage.setItem(CARD_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Best effort only: quota/privacy modes can block writes.
    }
}

async function fetchCardsFromNetwork(): Promise<HearthstoneCard[]> {
    const response = await fetch(CARDS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch cards (${response.status})`);
    }

    const raw = (await response.json()) as RawHearthstoneCard[];
    const cards = raw.map(cleanCard).filter((card): card is HearthstoneCard => Boolean(card));
    if (cards.length === 0) {
        throw new Error("Card payload was empty after filtering.");
    }
    return cards;
}

export async function fetchCards(): Promise<HearthstoneCard[]> {
    if (inMemoryCardsCache && inMemoryCardsCache.length > 0) {
        return inMemoryCardsCache;
    }

    const freshFromCache = readCardsFromLocalCache();
    if (freshFromCache) {
        inMemoryCardsCache = freshFromCache;
        return freshFromCache;
    }

    if (inFlightCardsRequest) {
        return inFlightCardsRequest;
    }

    const staleFromCache = readCardsFromLocalCache({ allowStale: true });
    inFlightCardsRequest = (async () => {
        try {
            const cards = await fetchCardsFromNetwork();
            inMemoryCardsCache = cards;
            writeCardsToLocalCache(cards);
            return cards;
        } catch (error) {
            if (staleFromCache && staleFromCache.length > 0) {
                inMemoryCardsCache = staleFromCache;
                return staleFromCache;
            }
            throw error;
        } finally {
            inFlightCardsRequest = null;
        }
    })();

    return inFlightCardsRequest;
}
