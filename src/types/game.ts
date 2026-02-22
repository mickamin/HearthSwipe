export type Phase = "intro" | "loading" | "ready" | "error";

export type CardRarity = "NONE" | "FREE" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type SwipeAction = "yes" | "no" | "super";

export type RunCounters = {
    yes: number;
    no: number;
    super: number;
};

export type DragState = {
    isActive: boolean;
    x: number;
    y: number;
};

export type ExitAnimationState = {
    cardIndex: number;
    action: SwipeAction;
    x: number;
    y: number;
    rotate: number;
};

export type ReverseCueDirection = "left" | "right" | "up";

export type ReverseCueState = {
    phase: "edge" | "center";
    direction: ReverseCueDirection;
    cardId: string;
};

export type HearthstoneCard = {
    id: string;
    dbfId: number | null;
    name: string;
    artist: string;
    flavor: string;
    rarity: CardRarity;
    cost: number | null;
    cardType: string;
    cardClass: string;
    races: string[];
    mechanics: string[];
    attack: number | null;
    health: number | null;
    cardSet: string;
};

export type RunDeckEntry = {
    card: HearthstoneCard;
    cardIndex: number;
    action: SwipeAction | null;
};

export type DeckstringBuildResult =
    | {
          deckstring: string;
          selectedClass: string;
          exportedCardCount: number;
      }
    | {
          deckstring: null;
          error: string;
      };
