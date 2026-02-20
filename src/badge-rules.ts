export type KeyBreakdownEntry = {
    seen: number;
    liked: number;
};

export type KeyBreakdownMap = Record<string, KeyBreakdownEntry>;

export type BadgeCategory =
    | "Behavior"
    | "Type"
    | "Mana"
    | "Rarity"
    | "Class"
    | "Race"
    | "Keywords"
    | "Stats"
    | "Set"
    | "Archetype"
    | "Meta"
    | "Fallback";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeExplainability = {
    seen: number;
    liked: number;
    ratio: number;
    threshold: string;
};

export type BadgeAward = {
    id: string;
    name: string;
    category: BadgeCategory;
    description: string;
    rarity: BadgeRarity;
    hue: number;
    detail?: string;
    explain: BadgeExplainability;
};

export type RunStats = {
    totalCards: number;
    likes: number;
    nopes: number;
    superLikes: number;
    reverses: number;
    likeRatio: number;
    avgMana: number | null;
    seenZeroCost: number;
    likedZeroCost: number;
    likedLowCost: number;
    likedHighCost: number;
    likedEvenCost: number;
    likedOddCost: number;
    likedMinionCount: number;
    avgLikedMinionAttack: number | null;
    avgLikedMinionHealth: number | null;
    byType: KeyBreakdownMap;
    byRarity: KeyBreakdownMap;
    byClass: KeyBreakdownMap;
    byRace: KeyBreakdownMap;
    byMechanic: KeyBreakdownMap;
    bySet: KeyBreakdownMap;
};

export type BadgeComputationResult = {
    primaryTitle: BadgeAward | null;
    badges: BadgeAward[];
};

type BadgeMeta = Omit<BadgeAward, "id" | "hue" | "detail" | "explain">;

const BADGE_META: Record<string, BadgeMeta> = {
    "hopeless-romantic": {
        name: "Hopeless Romantic",
        category: "Behavior",
        description: "You liked at least 85% of cards in this run.",
        rarity: "rare",
    },
    "cold-blooded-judge": {
        name: "Cold-Blooded Judge",
        category: "Behavior",
        description: "You liked 25% or fewer cards in this run.",
        rarity: "rare",
    },
    "balanced-mind": {
        name: "Balanced Mind",
        category: "Behavior",
        description: "Your like rate landed in the 45% to 55% sweet spot.",
        rarity: "common",
    },
    "super-like-sniper": {
        name: "Super-Like Sniper",
        category: "Behavior",
        description: "You used all Super Likes in this run.",
        rarity: "epic",
    },
    "emotionally-reserved": {
        name: "Emotionally Reserved",
        category: "Behavior",
        description: "You used zero Super Likes in this run.",
        rarity: "common",
    },
    "selective-critic": {
        name: "Selective Critic",
        category: "Behavior",
        description: "You liked very few cards but still spent both Super Likes.",
        rarity: "epic",
    },
    "merciful-swiper": {
        name: "Merciful Swiper",
        category: "Behavior",
        description: "You liked at least 24 cards.",
        rarity: "rare",
    },
    "harsh-critic": {
        name: "Harsh Critic",
        category: "Behavior",
        description: "You liked 6 or fewer cards.",
        rarity: "rare",
    },
    "efficient-evaluator": {
        name: "Efficient Evaluator",
        category: "Behavior",
        description: "You kept a measured like count between 12 and 18 cards.",
        rarity: "common",
    },
    "one-take-wonder": {
        name: "One-Take Wonder",
        category: "Behavior",
        description: "You completed the run without using Reverse.",
        rarity: "rare",
    },
    "spell-enthusiast": {
        name: "Spell Enthusiast",
        category: "Type",
        description: "You liked at least 65% of seen spells (min 5 seen).",
        rarity: "rare",
    },
    "board-builder": {
        name: "Board Builder",
        category: "Type",
        description: "You liked at least 65% of seen minions (min 5 seen).",
        rarity: "rare",
    },
    "weapon-wielder": {
        name: "Weapon Wielder",
        category: "Type",
        description: "You liked at least 70% of seen weapons (min 3 seen).",
        rarity: "rare",
    },
    "hero-admirer": {
        name: "Hero Admirer",
        category: "Type",
        description: "You liked at least 80% of seen hero cards (min 2 seen).",
        rarity: "epic",
    },
    "mixed-strategist": {
        name: "Mixed Strategist",
        category: "Type",
        description: "Your spell and minion likes were both balanced (40% to 60%).",
        rarity: "common",
    },
    "mana-minimalist": {
        name: "Mana Minimalist",
        category: "Mana",
        description: "You liked at least 6 cards and average liked mana is 2 or less.",
        rarity: "rare",
    },
    "aggro-gremlin": {
        name: "Aggro Gremlin",
        category: "Mana",
        description: "At least 70% of your liked cards cost 2 or less.",
        rarity: "rare",
    },
    "midrange-architect": {
        name: "Midrange Architect",
        category: "Mana",
        description: "Your average liked mana cost is between 3 and 5.",
        rarity: "common",
    },
    "late-game-overlord": {
        name: "Late Game Overlord",
        category: "Mana",
        description: "Your average liked mana cost is 6 or more.",
        rarity: "epic",
    },
    "greed-master": {
        name: "Greed Master",
        category: "Mana",
        description: "At least 60% of your liked cards cost 7 or more.",
        rarity: "epic",
    },
    "even-disciple": {
        name: "Even Disciple",
        category: "Mana",
        description: "Every liked card had an even mana cost.",
        rarity: "rare",
    },
    "oddball-strategist": {
        name: "Oddball Strategist",
        category: "Mana",
        description: "Every liked card had an odd mana cost.",
        rarity: "rare",
    },
    "zero-cost-addict": {
        name: "Zero-Cost Addict",
        category: "Mana",
        description: "You saw at least two 0-cost cards and liked all of them.",
        rarity: "epic",
    },
    "legendary-snob": {
        name: "Legendary Snob",
        category: "Rarity",
        description: "You liked at least 80% of seen legendaries (min 2 seen).",
        rarity: "legendary",
    },
    "epic-seeker": {
        name: "Epic Seeker",
        category: "Rarity",
        description: "You liked at least 70% of seen epics (min 2 seen).",
        rarity: "epic",
    },
    "rare-enthusiast": {
        name: "Rare Enthusiast",
        category: "Rarity",
        description: "You liked at least 70% of seen rares (min 3 seen).",
        rarity: "rare",
    },
    "budget-connoisseur": {
        name: "Budget Connoisseur",
        category: "Rarity",
        description: "You liked at least 75% of seen commons (min 5 seen).",
        rarity: "rare",
    },
    "shiny-skeptic": {
        name: "Shiny Skeptic",
        category: "Rarity",
        description: "You saw at least 2 legendaries and liked none.",
        rarity: "epic",
    },
    "rarity-agnostic": {
        name: "Rarity Agnostic",
        category: "Rarity",
        description: "Your like ratios across rarities stayed mostly even.",
        rarity: "rare",
    },
    "neutral-strategist": {
        name: "Neutral Strategist",
        category: "Class",
        description: "You liked at least 60% of seen neutral cards (min 5 seen).",
        rarity: "rare",
    },
    "class-tourist": {
        name: "Class Tourist",
        category: "Class",
        description: "No class dominated your likes.",
        rarity: "common",
    },
    "dual-class-specialist": {
        name: "Dual-Class Specialist",
        category: "Class",
        description: "Two classes each took at least 35% of your likes.",
        rarity: "epic",
    },
    "dragon-devotee": {
        name: "Dragon Devotee",
        category: "Race",
        description: "You liked at least 70% of seen dragons (min 3 seen).",
        rarity: "epic",
    },
    "mech-mechanic": {
        name: "Mech Mechanic",
        category: "Race",
        description: "You liked at least 70% of seen mechs (min 3 seen).",
        rarity: "rare",
    },
    "murloc-maniac": {
        name: "Murloc Maniac",
        category: "Race",
        description: "You liked at least 70% of seen murlocs (min 3 seen).",
        rarity: "rare",
    },
    "demon-dealer": {
        name: "Demon Dealer",
        category: "Race",
        description: "You liked at least 70% of seen demons (min 3 seen).",
        rarity: "rare",
    },
    "beast-master": {
        name: "Beast Master",
        category: "Race",
        description: "You liked at least 70% of seen beasts (min 3 seen).",
        rarity: "rare",
    },
    "elemental-evoker": {
        name: "Elemental Evoker",
        category: "Race",
        description: "You liked at least 70% of seen elementals (min 3 seen).",
        rarity: "rare",
    },
    "tribe-agnostic": {
        name: "Tribe Agnostic",
        category: "Race",
        description: "No race reached a 50% like ratio among races with enough exposure.",
        rarity: "common",
    },
    "battlecry-believer": {
        name: "Battlecry Believer",
        category: "Keywords",
        description: "You liked at least 70% of seen Battlecry cards (min 4 seen).",
        rarity: "rare",
    },
    "deathrattle-devotee": {
        name: "Deathrattle Devotee",
        category: "Keywords",
        description: "You liked at least 70% of seen Deathrattle cards (min 4 seen).",
        rarity: "rare",
    },
    "discover-addict": {
        name: "Discover Addict",
        category: "Keywords",
        description: "You liked at least 75% of seen Discover cards (min 3 seen).",
        rarity: "epic",
    },
    "divine-defender": {
        name: "Divine Defender",
        category: "Keywords",
        description: "You liked at least 70% of seen Divine Shield cards (min 3 seen).",
        rarity: "rare",
    },
    "frost-architect": {
        name: "Frost Architect",
        category: "Keywords",
        description: "You liked at least 70% of seen Freeze cards (min 3 seen).",
        rarity: "rare",
    },
    "life-leech": {
        name: "Life Leech",
        category: "Keywords",
        description: "You liked at least 70% of seen Lifesteal cards (min 3 seen).",
        rarity: "rare",
    },
    "poison-master": {
        name: "Poison Master",
        category: "Keywords",
        description: "You liked at least 70% of seen Poisonous cards (min 3 seen).",
        rarity: "rare",
    },
    "reborn-ritualist": {
        name: "Reborn Ritualist",
        category: "Keywords",
        description: "You liked at least 70% of seen Reborn cards (min 3 seen).",
        rarity: "rare",
    },
    "rush-commander": {
        name: "Rush Commander",
        category: "Keywords",
        description: "You liked at least 70% of seen Rush cards (min 3 seen).",
        rarity: "rare",
    },
    "secret-keeper": {
        name: "Secret Keeper",
        category: "Keywords",
        description: "You liked at least 70% of seen Secret cards (min 3 seen).",
        rarity: "rare",
    },
    "silence-enthusiast": {
        name: "Silence Enthusiast",
        category: "Keywords",
        description: "You liked at least 75% of seen Silence cards (min 2 seen).",
        rarity: "epic",
    },
    "shadow-operative": {
        name: "Shadow Operative",
        category: "Keywords",
        description: "You liked at least 70% of seen Stealth cards (min 3 seen).",
        rarity: "rare",
    },
    "fortress-builder": {
        name: "Fortress Builder",
        category: "Keywords",
        description: "You liked at least 70% of seen Taunt cards (min 4 seen).",
        rarity: "rare",
    },
    "trade-negotiator": {
        name: "Trade Negotiator",
        category: "Keywords",
        description: "You liked at least 75% of seen Tradeable cards (min 2 seen).",
        rarity: "epic",
    },
    "windfury-zealot": {
        name: "Windfury Zealot",
        category: "Keywords",
        description: "You liked at least 80% of seen Windfury cards (min 2 seen).",
        rarity: "epic",
    },
    "druid-of-choice": {
        name: "Druid of Choice",
        category: "Keywords",
        description: "You liked at least 75% of seen Choose One cards (min 3 seen).",
        rarity: "epic",
    },
    "combo-artist": {
        name: "Combo Artist",
        category: "Keywords",
        description: "You liked at least 75% of seen Combo cards (min 3 seen).",
        rarity: "epic",
    },
    "outcast-specialist": {
        name: "Outcast Specialist",
        category: "Keywords",
        description: "You liked at least 80% of seen Outcast cards (min 2 seen).",
        rarity: "epic",
    },
    "overheal-visionary": {
        name: "Overheal Visionary",
        category: "Keywords",
        description: "You liked at least 75% of seen Overheal cards (min 2 seen).",
        rarity: "epic",
    },
    "overload-enthusiast": {
        name: "Overload Enthusiast",
        category: "Keywords",
        description: "You liked at least 70% of seen Overload cards (min 3 seen).",
        rarity: "rare",
    },
    "adapt-architect": {
        name: "Adapt Architect",
        category: "Keywords",
        description: "You liked at least 80% of seen Adapt cards (min 2 seen).",
        rarity: "epic",
    },
    "colossal-commander": {
        name: "Colossal Commander",
        category: "Keywords",
        description: "You liked every seen Colossal card.",
        rarity: "legendary",
    },
    "corruption-connoisseur": {
        name: "Corruption Connoisseur",
        category: "Keywords",
        description: "You liked at least 75% of seen Corrupt cards (min 2 seen).",
        rarity: "epic",
    },
    "dredge-diver": {
        name: "Dredge Diver",
        category: "Keywords",
        description: "You liked at least 75% of seen Dredge cards (min 2 seen).",
        rarity: "epic",
    },
    "echo-enthusiast": {
        name: "Echo Enthusiast",
        category: "Keywords",
        description: "You liked at least 75% of seen Echo cards (min 2 seen).",
        rarity: "epic",
    },
    "frenzy-fanatic": {
        name: "Frenzy Fanatic",
        category: "Keywords",
        description: "You liked at least 75% of seen Frenzy cards (min 2 seen).",
        rarity: "epic",
    },
    "honorable-duelist": {
        name: "Honorable Duelist",
        category: "Keywords",
        description: "You liked at least 75% of seen Honorable Kill cards (min 2 seen).",
        rarity: "epic",
    },
    "infusion-master": {
        name: "Infusion Master",
        category: "Keywords",
        description: "You liked at least 75% of seen Infuse cards (min 2 seen).",
        rarity: "epic",
    },
    "inspire-enthusiast": {
        name: "Inspire Enthusiast",
        category: "Keywords",
        description: "You liked at least 75% of seen Inspire cards (min 2 seen).",
        rarity: "epic",
    },
    "magnetic-engineer": {
        name: "Magnetic Engineer",
        category: "Keywords",
        description: "You liked at least 75% of seen Magnetic cards (min 2 seen).",
        rarity: "epic",
    },
    "quest-seeker": {
        name: "Quest Seeker",
        category: "Keywords",
        description: "You liked every seen Quest card.",
        rarity: "legendary",
    },
    "spellburst-savant": {
        name: "Spellburst Savant",
        category: "Keywords",
        description: "You liked at least 75% of seen Spellburst cards (min 2 seen).",
        rarity: "epic",
    },
    "titan-architect": {
        name: "Titan Architect",
        category: "Keywords",
        description: "You liked every seen Titan card.",
        rarity: "legendary",
    },
    "twinspell-tactician": {
        name: "Twinspell Tactician",
        category: "Keywords",
        description: "You liked at least 75% of seen Twinspell cards (min 2 seen).",
        rarity: "epic",
    },
    "power-hungry": {
        name: "Power Hungry",
        category: "Stats",
        description: "Your liked minions averaged at least 6 attack.",
        rarity: "rare",
    },
    "defensive-architect": {
        name: "Defensive Architect",
        category: "Stats",
        description: "Your liked minions averaged at least 7 health.",
        rarity: "rare",
    },
    "glass-cannon-lover": {
        name: "Glass Cannon Lover",
        category: "Stats",
        description: "Your liked minions were high attack but low health on average.",
        rarity: "epic",
    },
    "tank-enthusiast": {
        name: "Tank Enthusiast",
        category: "Stats",
        description: "Your liked minions were high health but low attack on average.",
        rarity: "epic",
    },
    "expansion-loyalist": {
        name: "Expansion Loyalist",
        category: "Set",
        description: "A single card set dominated at least 60% of your likes.",
        rarity: "epic",
    },
    "classic-collector": {
        name: "Classic Collector",
        category: "Set",
        description: "You liked at least 4 cards from CORE.",
        rarity: "rare",
    },
    "vanilla-veteran": {
        name: "Vanilla Veteran",
        category: "Set",
        description: "You liked at least 4 cards from EXPERT1.",
        rarity: "rare",
    },
    "control-enthusiast": {
        name: "Control Enthusiast",
        category: "Archetype",
        description: "You favored a control profile: Taunt, Freeze, and Lifesteal.",
        rarity: "legendary",
    },
    "aggro-instinct": {
        name: "Aggro Instinct",
        category: "Archetype",
        description: "You favored fast pressure with Rush/Charge and low mana.",
        rarity: "legendary",
    },
    "value-engineer": {
        name: "Value Engineer",
        category: "Archetype",
        description: "You strongly favored Discover and Battlecry value cards.",
        rarity: "legendary",
    },
    "death-engine": {
        name: "Death Engine",
        category: "Archetype",
        description: "You leaned into Deathrattle and Reborn synergy.",
        rarity: "legendary",
    },
    "secret-architect": {
        name: "Secret Architect",
        category: "Archetype",
        description: "You built around Secrets with a low curve.",
        rarity: "legendary",
    },
    "burn-specialist": {
        name: "Burn Specialist",
        category: "Archetype",
        description: "You favored spells and a low mana curve.",
        rarity: "legendary",
    },
    "casino-player": {
        name: "Casino Player",
        category: "Archetype",
        description: "You leaned toward expensive Legendary picks.",
        rarity: "legendary",
    },
    "contrarian": {
        name: "Contrarian",
        category: "Meta",
        description: "You pushed against patterns that usually get liked.",
        rarity: "rare",
    },
    "perfect-read": {
        name: "Perfect Read",
        category: "Meta",
        description: "You hit a 100% like rate on a strongly represented pattern (min 5 seen).",
        rarity: "legendary",
    },
    "coinflip": {
        name: "The Coinflip",
        category: "Meta",
        description: "You ran almost perfectly even between likes and nopes.",
        rarity: "common",
    },
    "run-completed": {
        name: "Run Completed",
        category: "Fallback",
        description: "You finished the full 30-card run.",
        rarity: "common",
    },
    "card-connoisseur": {
        name: "Card Connoisseur",
        category: "Fallback",
        description: "A baseline badge so every run has personality output.",
        rarity: "common",
    },
    "deck-scout": {
        name: "Deck Scout",
        category: "Fallback",
        description: "You sampled the field and built a preference profile.",
        rarity: "common",
    },
};

const BADGE_RARITY_WEIGHT: Record<BadgeRarity, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
};

type BreakdownDimension = "type" | "rarity" | "class" | "race" | "keyword" | "set";

type ExplainContext = {
    dimension: BreakdownDimension;
    key: string;
    threshold: string;
};

const BADGE_EXPLAIN_CONTEXT: Record<string, ExplainContext> = {
    "spell-enthusiast": { dimension: "type", key: "SPELL", threshold: "ratio >= 65% (min seen 5)" },
    "board-builder": { dimension: "type", key: "MINION", threshold: "ratio >= 65% (min seen 5)" },
    "weapon-wielder": { dimension: "type", key: "WEAPON", threshold: "ratio >= 70% (min seen 3)" },
    "hero-admirer": { dimension: "type", key: "HERO", threshold: "ratio >= 80% (min seen 2)" },
    "legendary-snob": { dimension: "rarity", key: "LEGENDARY", threshold: "ratio >= 80% (min seen 2)" },
    "epic-seeker": { dimension: "rarity", key: "EPIC", threshold: "ratio >= 70% (min seen 2)" },
    "rare-enthusiast": { dimension: "rarity", key: "RARE", threshold: "ratio >= 70% (min seen 3)" },
    "budget-connoisseur": { dimension: "rarity", key: "COMMON", threshold: "ratio >= 75% (min seen 5)" },
    "shiny-skeptic": { dimension: "rarity", key: "LEGENDARY", threshold: "liked = 0 (min seen 2)" },
    "neutral-strategist": { dimension: "class", key: "NEUTRAL", threshold: "ratio >= 60% (min seen 5)" },
    "dragon-devotee": { dimension: "race", key: "DRAGON", threshold: "ratio >= 70% (min seen 3)" },
    "mech-mechanic": { dimension: "race", key: "MECHANICAL", threshold: "ratio >= 70% (min seen 3)" },
    "murloc-maniac": { dimension: "race", key: "MURLOC", threshold: "ratio >= 70% (min seen 3)" },
    "demon-dealer": { dimension: "race", key: "DEMON", threshold: "ratio >= 70% (min seen 3)" },
    "beast-master": { dimension: "race", key: "BEAST", threshold: "ratio >= 70% (min seen 3)" },
    "elemental-evoker": { dimension: "race", key: "ELEMENTAL", threshold: "ratio >= 70% (min seen 3)" },
    "battlecry-believer": { dimension: "keyword", key: "BATTLECRY", threshold: "ratio >= 70% (min seen 4)" },
    "deathrattle-devotee": { dimension: "keyword", key: "DEATHRATTLE", threshold: "ratio >= 70% (min seen 4)" },
    "discover-addict": { dimension: "keyword", key: "DISCOVER", threshold: "ratio >= 75% (min seen 3)" },
    "divine-defender": { dimension: "keyword", key: "DIVINE_SHIELD", threshold: "ratio >= 70% (min seen 3)" },
    "frost-architect": { dimension: "keyword", key: "FREEZE", threshold: "ratio >= 70% (min seen 3)" },
    "life-leech": { dimension: "keyword", key: "LIFESTEAL", threshold: "ratio >= 70% (min seen 3)" },
    "poison-master": { dimension: "keyword", key: "POISONOUS", threshold: "ratio >= 70% (min seen 3)" },
    "reborn-ritualist": { dimension: "keyword", key: "REBORN", threshold: "ratio >= 70% (min seen 3)" },
    "rush-commander": { dimension: "keyword", key: "RUSH", threshold: "ratio >= 70% (min seen 3)" },
    "secret-keeper": { dimension: "keyword", key: "SECRET", threshold: "ratio >= 70% (min seen 3)" },
    "silence-enthusiast": { dimension: "keyword", key: "SILENCE", threshold: "ratio >= 75% (min seen 2)" },
    "shadow-operative": { dimension: "keyword", key: "STEALTH", threshold: "ratio >= 70% (min seen 3)" },
    "fortress-builder": { dimension: "keyword", key: "TAUNT", threshold: "ratio >= 70% (min seen 4)" },
    "trade-negotiator": { dimension: "keyword", key: "TRADEABLE", threshold: "ratio >= 75% (min seen 2)" },
    "windfury-zealot": { dimension: "keyword", key: "WINDFURY", threshold: "ratio >= 80% (min seen 2)" },
    "druid-of-choice": { dimension: "keyword", key: "CHOOSE_ONE", threshold: "ratio >= 75% (min seen 3)" },
    "combo-artist": { dimension: "keyword", key: "COMBO", threshold: "ratio >= 75% (min seen 3)" },
    "outcast-specialist": { dimension: "keyword", key: "OUTCAST", threshold: "ratio >= 80% (min seen 2)" },
    "overheal-visionary": { dimension: "keyword", key: "OVERHEAL", threshold: "ratio >= 75% (min seen 2)" },
    "overload-enthusiast": { dimension: "keyword", key: "OVERLOAD", threshold: "ratio >= 70% (min seen 3)" },
    "adapt-architect": { dimension: "keyword", key: "ADAPT", threshold: "ratio >= 80% (min seen 2)" },
    "colossal-commander": { dimension: "keyword", key: "COLOSSAL", threshold: "ratio = 100% (min seen 2)" },
    "corruption-connoisseur": { dimension: "keyword", key: "CORRUPT", threshold: "ratio >= 75% (min seen 2)" },
    "dredge-diver": { dimension: "keyword", key: "DREDGE", threshold: "ratio >= 75% (min seen 2)" },
    "echo-enthusiast": { dimension: "keyword", key: "ECHO", threshold: "ratio >= 75% (min seen 2)" },
    "frenzy-fanatic": { dimension: "keyword", key: "FRENZY", threshold: "ratio >= 75% (min seen 2)" },
    "honorable-duelist": { dimension: "keyword", key: "HONORABLE_KILL", threshold: "ratio >= 75% (min seen 2)" },
    "infusion-master": { dimension: "keyword", key: "INFUSE", threshold: "ratio >= 75% (min seen 2)" },
    "inspire-enthusiast": { dimension: "keyword", key: "INSPIRE", threshold: "ratio >= 75% (min seen 2)" },
    "magnetic-engineer": { dimension: "keyword", key: "MAGNETIC", threshold: "ratio >= 75% (min seen 2)" },
    "quest-seeker": { dimension: "keyword", key: "QUEST", threshold: "ratio = 100% (min seen 2)" },
    "spellburst-savant": { dimension: "keyword", key: "SPELLBURST", threshold: "ratio >= 75% (min seen 2)" },
    "titan-architect": { dimension: "keyword", key: "TITAN", threshold: "ratio = 100% (min seen 2)" },
    "twinspell-tactician": { dimension: "keyword", key: "TWINSPELL", threshold: "ratio >= 75% (min seen 2)" },
    "classic-collector": { dimension: "set", key: "CORE", threshold: "liked >= 4" },
    "vanilla-veteran": { dimension: "set", key: "EXPERT1", threshold: "liked >= 4" },
};

function breakdownForDimension(stats: RunStats, dimension: BreakdownDimension): KeyBreakdownMap {
    switch (dimension) {
        case "type":
            return stats.byType;
        case "rarity":
            return stats.byRarity;
        case "class":
            return stats.byClass;
        case "race":
            return stats.byRace;
        case "keyword":
            return stats.byMechanic;
        case "set":
            return stats.bySet;
    }
}

function normalizeExplainToken(token: string): string {
    return token
        .trim()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_")
        .toUpperCase();
}

function explainFromBreakdown(stats: RunStats, context: ExplainContext): BadgeExplainability {
    const map = breakdownForDimension(stats, context.dimension);
    const seen = seenCount(map, context.key);
    const liked = likedCount(map, context.key);
    const ratio = seen > 0 ? liked / seen : 0;
    return {
        seen,
        liked,
        ratio,
        threshold: context.threshold,
    };
}

function globalExplain(stats: RunStats, threshold: string, seen = stats.totalCards, liked = stats.likes): BadgeExplainability {
    return {
        seen,
        liked,
        ratio: seen > 0 ? liked / seen : 0,
        threshold,
    };
}

function contextFromDetail(detail?: string): ExplainContext | null {
    if (!detail || !detail.includes(":")) {
        return null;
    }
    const [rawPrefix, ...rest] = detail.split(":");
    const prefix = rawPrefix.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!prefix || !value) {
        return null;
    }
    const key = normalizeExplainToken(value);
    if (prefix === "type") {
        return { dimension: "type", key, threshold: "context-specific trigger" };
    }
    if (prefix === "rarity") {
        return { dimension: "rarity", key, threshold: "context-specific trigger" };
    }
    if (prefix === "class") {
        return { dimension: "class", key, threshold: "context-specific trigger" };
    }
    if (prefix === "race" || prefix === "tribe") {
        return { dimension: "race", key, threshold: "context-specific trigger" };
    }
    if (prefix === "keyword") {
        return { dimension: "keyword", key, threshold: "context-specific trigger" };
    }
    if (prefix === "set") {
        return { dimension: "set", key, threshold: "context-specific trigger" };
    }
    return null;
}

function deriveBadgeExplainability(stats: RunStats, id: string, detail?: string): BadgeExplainability {
    const direct = BADGE_EXPLAIN_CONTEXT[id];
    if (direct) {
        return explainFromBreakdown(stats, direct);
    }

    const detailContext = contextFromDetail(detail);
    if (detailContext) {
        const threshold = id.startsWith("preference-spike-")
            ? "ratio >= 80% and at least +25pp above run like rate"
            : id.startsWith("most-loved-")
              ? "highest ratio among exposed tokens"
              : id === "expansion-loyalist"
                ? "share of likes >= 60% (min seen 5)"
                : id === "perfect-read"
                  ? "ratio = 100% (min seen 5)"
                  : id.startsWith("true-loyalist-")
                    ? "share of likes >= 50% (min seen 5)"
                    : detailContext.threshold;
        return explainFromBreakdown(stats, { ...detailContext, threshold });
    }

    if (id === "hopeless-romantic") return globalExplain(stats, "like ratio >= 85%");
    if (id === "cold-blooded-judge") return globalExplain(stats, "like ratio <= 25%");
    if (id === "balanced-mind") return globalExplain(stats, "like ratio between 45% and 55%");
    if (id === "super-like-sniper") return globalExplain(stats, "super likes = 2");
    if (id === "emotionally-reserved") return globalExplain(stats, "super likes = 0");
    if (id === "selective-critic") return globalExplain(stats, "likes <= 8 and super likes = 2");
    if (id === "merciful-swiper") return globalExplain(stats, "likes >= 24");
    if (id === "harsh-critic") return globalExplain(stats, "likes <= 6");
    if (id === "efficient-evaluator") return globalExplain(stats, "likes between 12 and 18");
    if (id === "one-take-wonder") return globalExplain(stats, "reverses used = 0");
    if (id === "mana-minimalist") return globalExplain(stats, "avg liked mana <= 2 (min likes 6)");
    if (id === "aggro-gremlin")
        return globalExplain(stats, "liked cards with cost <=2 ratio >= 70%", stats.likes, stats.likedLowCost);
    if (id === "midrange-architect") return globalExplain(stats, "avg liked mana between 3 and 5 (min likes 6)");
    if (id === "late-game-overlord") return globalExplain(stats, "avg liked mana >= 6 (min likes 6)");
    if (id === "greed-master")
        return globalExplain(stats, "liked cards with cost >=7 ratio >= 60%", stats.likes, stats.likedHighCost);
    if (id === "even-disciple") return globalExplain(stats, "all liked cards have even cost");
    if (id === "oddball-strategist") return globalExplain(stats, "all liked cards have odd cost");
    if (id === "zero-cost-addict")
        return globalExplain(stats, "all seen 0-cost cards were liked (min seen 2)", stats.seenZeroCost, stats.likedZeroCost);
    if (id === "mixed-strategist") return globalExplain(stats, "spell and minion ratios both between 40% and 60%");
    if (id === "rarity-agnostic") return globalExplain(stats, "represented rarity ratios stay between 30% and 50%");
    if (id === "dual-class-specialist") return globalExplain(stats, "top two classes each >= 35% of likes");
    if (id === "class-tourist") return globalExplain(stats, "no single class reached 35% of likes");
    if (id === "tribe-agnostic") return globalExplain(stats, "no heavily favored tribe");
    if (id === "power-hungry") return globalExplain(stats, "avg liked minion attack >= 6 (min 4 minions)");
    if (id === "defensive-architect") return globalExplain(stats, "avg liked minion health >= 7 (min 4 minions)");
    if (id === "glass-cannon-lover") return globalExplain(stats, "avg attack >= 6 and avg health <= 3");
    if (id === "tank-enthusiast") return globalExplain(stats, "avg health >= 7 and avg attack <= 3");
    if (id === "control-enthusiast") return globalExplain(stats, "TAUNT + FREEZE + LIFESTEAL ratios >= 60%");
    if (id === "aggro-instinct") return globalExplain(stats, "RUSH + CHARGE ratios >= 70% and avg mana <= 3");
    if (id === "value-engineer") return globalExplain(stats, "DISCOVER + BATTLECRY ratios >= 60%");
    if (id === "death-engine") return globalExplain(stats, "DEATHRATTLE + REBORN ratios >= 60%");
    if (id === "secret-architect") return globalExplain(stats, "SECRET ratio >= 70% and avg mana <= 4");
    if (id === "burn-specialist") return globalExplain(stats, "SPELL ratio >= 65% and avg mana <= 3");
    if (id === "casino-player") return globalExplain(stats, "LEGENDARY ratio >= 60% and avg mana >= 6");
    if (id === "contrarian") return globalExplain(stats, "found exposed patterns with low like rates");
    if (id === "perfect-read") return globalExplain(stats, "100% likes on a strongly represented pattern");
    if (id === "coinflip") return globalExplain(stats, "like ratio between 48% and 52% with <=1 super like");

    return globalExplain(stats, "rule matched");
}

function seenCount(stats: KeyBreakdownMap, key: string): number {
    return stats[key]?.seen ?? 0;
}

function likedCount(stats: KeyBreakdownMap, key: string): number {
    return stats[key]?.liked ?? 0;
}

function ratioCount(stats: KeyBreakdownMap, key: string): number {
    const seen = seenCount(stats, key);
    if (seen === 0) {
        return 0;
    }
    return likedCount(stats, key) / seen;
}

function ratioAtLeast(stats: KeyBreakdownMap, key: string, minRatio: number, minSeen = 3): boolean {
    const seen = seenCount(stats, key);
    if (seen < minSeen) {
        return false;
    }
    return ratioCount(stats, key) >= minRatio;
}

function ratioBetween(stats: KeyBreakdownMap, key: string, minRatio: number, maxRatio: number, minSeen = 3): boolean {
    const seen = seenCount(stats, key);
    if (seen < minSeen) {
        return false;
    }
    const ratio = ratioCount(stats, key);
    return ratio >= minRatio && ratio <= maxRatio;
}

function prettyToken(token: string): string {
    return token
        .toLowerCase()
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function badgeHueFromId(id: string): number {
    let seed = 0;
    for (let i = 0; i < id.length; i += 1) {
        seed = (seed * 31 + id.charCodeAt(i)) % 360;
    }
    return seed;
}

type BadgeCandidate = BadgeAward & {
    score: number;
};

const CATEGORY_CAPS: Partial<Record<BadgeCategory, number>> = {
    Behavior: 1,
    Mana: 1,
    Keywords: 2,
    Race: 1,
    Rarity: 1,
};

function sortCandidates(candidates: BadgeCandidate[]): BadgeCandidate[] {
    return [...candidates].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        const rarityDelta = BADGE_RARITY_WEIGHT[b.rarity] - BADGE_RARITY_WEIGHT[a.rarity];
        if (rarityDelta !== 0) {
            return rarityDelta;
        }
        const categoryDelta = a.category.localeCompare(b.category);
        if (categoryDelta !== 0) {
            return categoryDelta;
        }
        return a.name.localeCompare(b.name);
    });
}

function exposureScore(stats: KeyBreakdownMap, key: string, minSeen: number): number {
    const ratio = ratioCount(stats, key);
    const seen = seenCount(stats, key);
    return 100 * ratio + 5 * Math.max(0, seen - minSeen);
}

function strongestToken(stats: KeyBreakdownMap, minSeen: number): { key: string; ratio: number; seen: number; liked: number } | null {
    let best: { key: string; ratio: number; seen: number; liked: number } | null = null;
    Object.entries(stats).forEach(([key, value]) => {
        if (value.seen < minSeen) {
            return;
        }
        const ratio = value.seen > 0 ? value.liked / value.seen : 0;
        if (!best || ratio > best.ratio || (ratio === best.ratio && value.seen > best.seen)) {
            best = {
                key,
                ratio,
                seen: value.seen,
                liked: value.liked,
            };
        }
    });
    return best;
}

function tokenDimensionLabel(prefix: string, key: string): string {
    const normalizedPrefix = prefix.trim().replace(/\s+/g, "_");
    return `${prettyToken(normalizedPrefix)}: ${prettyToken(key)}`;
}

function selectShowcase(candidates: BadgeCandidate[], stats: RunStats): BadgeComputationResult {
    const selected: BadgeCandidate[] = [];
    const categoryCounts: Partial<Record<BadgeCategory, number>> = {};

    for (const candidate of sortCandidates(candidates)) {
        const cap = CATEGORY_CAPS[candidate.category] ?? Number.POSITIVE_INFINITY;
        const currentCount = categoryCounts[candidate.category] ?? 0;
        if (currentCount >= cap) {
            continue;
        }
        selected.push(candidate);
        categoryCounts[candidate.category] = currentCount + 1;
        if (selected.length >= 5) {
            break;
        }
    }

    const fallbackIds = ["run-completed", "card-connoisseur", "deck-scout"] as const;
    for (const fallbackId of fallbackIds) {
        if (selected.length >= 3) {
            break;
        }
        if (selected.some((badge) => badge.id === fallbackId)) {
            continue;
        }
        const meta = BADGE_META[fallbackId];
        if (!meta) {
            continue;
        }
        selected.push({
            id: fallbackId,
            ...meta,
            hue: badgeHueFromId(fallbackId),
            explain: deriveBadgeExplainability(stats, fallbackId),
            score: 40,
        });
    }

    const sortedByScore = sortCandidates(selected);
    const nonFallback = sortedByScore.filter((badge) => badge.category !== "Fallback");
    const nonMetaNonFallback = nonFallback.filter((badge) => badge.category !== "Meta");
    const strongNonMeta = nonMetaNonFallback.filter((badge) => badge.score >= 88);
    const strongNonFallback = nonFallback.filter((badge) => badge.score >= 88);

    const titleCandidates =
        strongNonMeta.length > 0
            ? strongNonMeta
            : nonMetaNonFallback.length > 0
              ? nonMetaNonFallback
              : strongNonFallback.length > 0
                ? strongNonFallback
                : nonFallback.length > 0
                  ? nonFallback
                  : sortedByScore;
    const primaryCandidate = [...titleCandidates].sort((a, b) => {
        const rarityDelta = BADGE_RARITY_WEIGHT[b.rarity] - BADGE_RARITY_WEIGHT[a.rarity];
        if (rarityDelta !== 0) {
            return rarityDelta;
        }
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name);
    })[0];

    const toBadgeAward = (candidate: BadgeCandidate): BadgeAward => {
        const { score, ...badge } = candidate;
        void score;
        return badge;
    };

    const primaryTitle = primaryCandidate ? toBadgeAward(primaryCandidate) : null;
    const badges = sortedByScore
        .filter((badge) => badge.id !== primaryCandidate?.id)
        .slice(0, 4)
        .map((badge) => toBadgeAward(badge));

    return {
        primaryTitle,
        badges,
    };
}

export function computeRunBadges(stats: RunStats): BadgeComputationResult {
    const candidateMap = new Map<string, BadgeCandidate>();

    const addBadgeById = (id: string, score: number, detail?: string, explain?: BadgeExplainability) => {
        const meta = BADGE_META[id];
        if (!meta) {
            return;
        }
        const existing = candidateMap.get(id);
        if (existing && existing.score >= score) {
            return;
        }
        candidateMap.set(id, {
            id,
            ...meta,
            hue: badgeHueFromId(id),
            detail,
            explain: explain ?? deriveBadgeExplainability(stats, id, detail),
            score,
        });
    };

    const addCustomBadge = (badge: Omit<BadgeAward, "hue" | "explain">, score: number, explain?: BadgeExplainability) => {
        const existing = candidateMap.get(badge.id);
        if (existing && existing.score >= score) {
            return;
        }
        candidateMap.set(badge.id, {
            ...badge,
            hue: badgeHueFromId(badge.id),
            explain: explain ?? deriveBadgeExplainability(stats, badge.id, badge.detail),
            score,
        });
    };

    const likes = stats.likes;

    // Behavior badges.
    if (stats.likeRatio >= 0.85) addBadgeById("hopeless-romantic", 100 * stats.likeRatio);
    if (stats.likeRatio <= 0.25) addBadgeById("cold-blooded-judge", 100 * (1 - stats.likeRatio));
    if (stats.likeRatio >= 0.45 && stats.likeRatio <= 0.55) addBadgeById("balanced-mind", 70);
    if (stats.superLikes === 2) addBadgeById("super-like-sniper", 75);
    if (stats.superLikes === 0) addBadgeById("emotionally-reserved", 60);
    if (likes <= 8 && stats.superLikes === 2) addBadgeById("selective-critic", 90);
    if (likes >= 24) addBadgeById("merciful-swiper", 90);
    if (likes <= 6) addBadgeById("harsh-critic", 90);
    if (likes >= 12 && likes <= 18) addBadgeById("efficient-evaluator", 65);
    if (stats.reverses === 0) addBadgeById("one-take-wonder", 85);

    // Type badges.
    if (ratioAtLeast(stats.byType, "SPELL", 0.65, 5)) addBadgeById("spell-enthusiast", exposureScore(stats.byType, "SPELL", 5));
    if (ratioAtLeast(stats.byType, "MINION", 0.65, 5)) addBadgeById("board-builder", exposureScore(stats.byType, "MINION", 5));
    if (ratioAtLeast(stats.byType, "WEAPON", 0.7, 3)) addBadgeById("weapon-wielder", exposureScore(stats.byType, "WEAPON", 3));
    if (ratioAtLeast(stats.byType, "HERO", 0.8, 2)) addBadgeById("hero-admirer", exposureScore(stats.byType, "HERO", 2));
    if (ratioBetween(stats.byType, "SPELL", 0.4, 0.6, 5) && ratioBetween(stats.byType, "MINION", 0.4, 0.6, 5)) {
        addBadgeById("mixed-strategist", 85);
    }

    // Mana badges.
    if (likes >= 6 && stats.avgMana !== null && stats.avgMana <= 2) addBadgeById("mana-minimalist", 90);
    if (likes >= 6 && stats.likedLowCost / likes >= 0.7) addBadgeById("aggro-gremlin", 95);
    if (likes >= 6 && stats.avgMana !== null && stats.avgMana >= 3 && stats.avgMana <= 5) addBadgeById("midrange-architect", 75);
    if (likes >= 6 && stats.avgMana !== null && stats.avgMana >= 6) addBadgeById("late-game-overlord", 90);
    if (likes >= 6 && stats.likedHighCost / likes >= 0.6) addBadgeById("greed-master", 90);
    if (likes >= 6 && stats.likedOddCost === 0) addBadgeById("even-disciple", 95);
    if (likes >= 6 && stats.likedEvenCost === 0) addBadgeById("oddball-strategist", 95);
    if (stats.seenZeroCost >= 2 && stats.likedZeroCost === stats.seenZeroCost) addBadgeById("zero-cost-addict", 110);

    // Rarity badges.
    if (ratioAtLeast(stats.byRarity, "LEGENDARY", 0.8, 2)) addBadgeById("legendary-snob", exposureScore(stats.byRarity, "LEGENDARY", 2) + 10);
    if (ratioAtLeast(stats.byRarity, "EPIC", 0.7, 2)) addBadgeById("epic-seeker", exposureScore(stats.byRarity, "EPIC", 2));
    if (ratioAtLeast(stats.byRarity, "RARE", 0.7, 3)) addBadgeById("rare-enthusiast", exposureScore(stats.byRarity, "RARE", 3));
    if (ratioAtLeast(stats.byRarity, "COMMON", 0.75, 5)) addBadgeById("budget-connoisseur", exposureScore(stats.byRarity, "COMMON", 5));
    if (seenCount(stats.byRarity, "LEGENDARY") >= 2 && likedCount(stats.byRarity, "LEGENDARY") === 0) {
        addBadgeById("shiny-skeptic", 90);
    }
    const representedRarities = Object.entries(stats.byRarity).filter(([rarity, entry]) => rarity !== "NONE" && entry.seen >= 3);
    if (representedRarities.length >= 3 && representedRarities.every(([, entry]) => entry.liked / entry.seen >= 0.3 && entry.liked / entry.seen <= 0.5)) {
        addBadgeById("rarity-agnostic", 85);
    }

    // Class badges.
    if (likes > 0) {
        const classShares = Object.entries(stats.byClass)
            .filter(([cardClass, entry]) => cardClass !== "UNKNOWN" && entry.seen >= 3)
            .map(([cardClass, entry]) => ({
                cardClass,
                entry,
                share: entry.liked / likes,
            }))
            .sort((a, b) => b.share - a.share || b.entry.liked - a.entry.liked || b.entry.seen - a.entry.seen);

        const loyalist = classShares.find((entry) => entry.cardClass !== "NEUTRAL" && entry.entry.seen >= 5 && entry.share >= 0.5);
        if (loyalist) {
            const className = prettyToken(loyalist.cardClass);
            addCustomBadge(
                {
                    id: `true-loyalist-${loyalist.cardClass.toLowerCase()}`,
                    name: `True ${className} Loyalist`,
                    category: "Class",
                    description: `At least 50% of your likes came from ${className} (min 5 seen).`,
                    rarity: "epic",
                    detail: tokenDimensionLabel("Class", loyalist.cardClass),
                },
                100 * loyalist.share + 10,
            );
        }

        if (ratioAtLeast(stats.byClass, "NEUTRAL", 0.6, 5)) {
            addBadgeById("neutral-strategist", exposureScore(stats.byClass, "NEUTRAL", 5));
        }

        const strongClassCount = classShares.filter((entry) => entry.share >= 0.35).length;
        if (strongClassCount >= 2) {
            addBadgeById("dual-class-specialist", 90);
        }
        if (classShares.length > 0 && strongClassCount === 0) {
            addBadgeById("class-tourist", 70);
        }
    }

    // Race badges.
    const raceRules: Array<{ id: string; key: string }> = [
        { id: "dragon-devotee", key: "DRAGON" },
        { id: "mech-mechanic", key: "MECHANICAL" },
        { id: "murloc-maniac", key: "MURLOC" },
        { id: "demon-dealer", key: "DEMON" },
        { id: "beast-master", key: "BEAST" },
        { id: "elemental-evoker", key: "ELEMENTAL" },
    ];
    raceRules.forEach((rule) => {
        if (ratioAtLeast(stats.byRace, rule.key, 0.7, 3)) {
            addBadgeById(rule.id, exposureScore(stats.byRace, rule.key, 3));
        }
    });
    const exposedRaces = Object.entries(stats.byRace).filter(([, entry]) => entry.seen >= 3);
    if (likes >= 8 && exposedRaces.length > 0 && exposedRaces.every(([, entry]) => entry.liked / entry.seen < 0.4)) {
        addBadgeById("tribe-agnostic", 70);
    }

    // Keyword badges.
    const keywordRules: Array<{ id: string; key: string; minSeen: number; minRatio: number; bonus?: number }> = [
        { id: "battlecry-believer", key: "BATTLECRY", minSeen: 4, minRatio: 0.7 },
        { id: "deathrattle-devotee", key: "DEATHRATTLE", minSeen: 4, minRatio: 0.7 },
        { id: "discover-addict", key: "DISCOVER", minSeen: 3, minRatio: 0.75, bonus: 10 },
        { id: "divine-defender", key: "DIVINE_SHIELD", minSeen: 3, minRatio: 0.7 },
        { id: "frost-architect", key: "FREEZE", minSeen: 3, minRatio: 0.7 },
        { id: "life-leech", key: "LIFESTEAL", minSeen: 3, minRatio: 0.7 },
        { id: "poison-master", key: "POISONOUS", minSeen: 3, minRatio: 0.7 },
        { id: "reborn-ritualist", key: "REBORN", minSeen: 3, minRatio: 0.7 },
        { id: "rush-commander", key: "RUSH", minSeen: 3, minRatio: 0.7 },
        { id: "secret-keeper", key: "SECRET", minSeen: 3, minRatio: 0.7 },
        { id: "silence-enthusiast", key: "SILENCE", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "shadow-operative", key: "STEALTH", minSeen: 3, minRatio: 0.7 },
        { id: "fortress-builder", key: "TAUNT", minSeen: 4, minRatio: 0.7 },
        { id: "trade-negotiator", key: "TRADEABLE", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "windfury-zealot", key: "WINDFURY", minSeen: 2, minRatio: 0.8, bonus: 10 },
        { id: "druid-of-choice", key: "CHOOSE_ONE", minSeen: 3, minRatio: 0.75, bonus: 10 },
        { id: "combo-artist", key: "COMBO", minSeen: 3, minRatio: 0.75, bonus: 10 },
        { id: "outcast-specialist", key: "OUTCAST", minSeen: 2, minRatio: 0.8, bonus: 10 },
        { id: "overheal-visionary", key: "OVERHEAL", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "overload-enthusiast", key: "OVERLOAD", minSeen: 3, minRatio: 0.7 },
        { id: "adapt-architect", key: "ADAPT", minSeen: 2, minRatio: 0.8, bonus: 15 },
        { id: "colossal-commander", key: "COLOSSAL", minSeen: 2, minRatio: 1, bonus: 30 },
        { id: "corruption-connoisseur", key: "CORRUPT", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "dredge-diver", key: "DREDGE", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "echo-enthusiast", key: "ECHO", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "frenzy-fanatic", key: "FRENZY", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "honorable-duelist", key: "HONORABLE_KILL", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "infusion-master", key: "INFUSE", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "inspire-enthusiast", key: "INSPIRE", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "magnetic-engineer", key: "MAGNETIC", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "quest-seeker", key: "QUEST", minSeen: 2, minRatio: 1, bonus: 30 },
        { id: "spellburst-savant", key: "SPELLBURST", minSeen: 2, minRatio: 0.75, bonus: 10 },
        { id: "titan-architect", key: "TITAN", minSeen: 2, minRatio: 1, bonus: 30 },
        { id: "twinspell-tactician", key: "TWINSPELL", minSeen: 2, minRatio: 0.75, bonus: 10 },
    ];
    keywordRules.forEach((rule) => {
        if (ratioAtLeast(stats.byMechanic, rule.key, rule.minRatio, rule.minSeen)) {
            addBadgeById(rule.id, exposureScore(stats.byMechanic, rule.key, rule.minSeen) + (rule.bonus ?? 0));
        }
    });

    // Stats badges.
    if (stats.likedMinionCount >= 4 && stats.avgLikedMinionAttack !== null && stats.avgLikedMinionAttack >= 6) {
        addBadgeById("power-hungry", 85);
    }
    if (stats.likedMinionCount >= 4 && stats.avgLikedMinionHealth !== null && stats.avgLikedMinionHealth >= 7) {
        addBadgeById("defensive-architect", 85);
    }
    if (
        stats.likedMinionCount >= 4 &&
        stats.avgLikedMinionAttack !== null &&
        stats.avgLikedMinionHealth !== null &&
        stats.avgLikedMinionAttack >= 6 &&
        stats.avgLikedMinionHealth <= 3
    ) {
        addBadgeById("glass-cannon-lover", 95);
    }
    if (
        stats.likedMinionCount >= 4 &&
        stats.avgLikedMinionAttack !== null &&
        stats.avgLikedMinionHealth !== null &&
        stats.avgLikedMinionHealth >= 7 &&
        stats.avgLikedMinionAttack <= 3
    ) {
        addBadgeById("tank-enthusiast", 95);
    }

    // Set badges.
    if (likes > 0) {
        const setLoyalist = Object.entries(stats.bySet)
            .filter(([cardSet, entry]) => cardSet !== "UNKNOWN" && entry.seen >= 5)
            .map(([cardSet, entry]) => ({
                cardSet,
                share: entry.liked / likes,
                entry,
            }))
            .sort((a, b) => b.share - a.share || b.entry.liked - a.entry.liked)[0];

        if (setLoyalist && setLoyalist.share >= 0.6) {
            addBadgeById("expansion-loyalist", 90, tokenDimensionLabel("Set", setLoyalist.cardSet));
        }
    }
    if (likedCount(stats.bySet, "CORE") >= 4) addBadgeById("classic-collector", 75);
    if (likedCount(stats.bySet, "EXPERT1") >= 4) addBadgeById("vanilla-veteran", 75);

    // Archetype badges.
    const hasCombo = (keys: string[], minRatio: number, minSeen = 3) =>
        keys.every((key) => ratioAtLeast(stats.byMechanic, key, minRatio, minSeen));
    if (hasCombo(["TAUNT", "FREEZE", "LIFESTEAL"], 0.6, 2)) addBadgeById("control-enthusiast", 95);
    if (hasCombo(["RUSH", "CHARGE"], 0.7, 2) && stats.avgMana !== null && stats.avgMana <= 3) {
        addBadgeById("aggro-instinct", 95);
    }
    if (hasCombo(["DISCOVER", "BATTLECRY"], 0.6, 2)) addBadgeById("value-engineer", 95);
    if (hasCombo(["DEATHRATTLE", "REBORN"], 0.6, 2)) addBadgeById("death-engine", 95);
    if (ratioAtLeast(stats.byMechanic, "SECRET", 0.7, 3) && stats.avgMana !== null && stats.avgMana <= 4) {
        addBadgeById("secret-architect", 95);
    }
    if (ratioAtLeast(stats.byType, "SPELL", 0.65, 5) && stats.avgMana !== null && stats.avgMana <= 3) {
        addBadgeById("burn-specialist", 90);
    }
    if (ratioAtLeast(stats.byRarity, "LEGENDARY", 0.6, 2) && stats.avgMana !== null && stats.avgMana >= 6) {
        addBadgeById("casino-player", 92);
    }

    // Meta badges.
    const lovedType = strongestToken(stats.byType, 4);
    if (lovedType && lovedType.ratio >= 0.6) {
        addCustomBadge(
            {
                id: `most-loved-type-${lovedType.key.toLowerCase()}`,
                name: "Most Loved Type",
                category: "Meta",
                description: `Your strongest type preference was ${prettyToken(lovedType.key)}.`,
                rarity: "common",
                detail: tokenDimensionLabel("Type", lovedType.key),
            },
            100 + lovedType.ratio * 10,
        );
    }

    const lovedKeyword = strongestToken(stats.byMechanic, 3);
    if (lovedKeyword && lovedKeyword.ratio >= 0.65) {
        addCustomBadge(
            {
                id: `most-loved-keyword-${lovedKeyword.key.toLowerCase()}`,
                name: "Most Loved Keyword",
                category: "Meta",
                description: `Your strongest keyword preference was ${prettyToken(lovedKeyword.key)}.`,
                rarity: "common",
                detail: tokenDimensionLabel("Keyword", lovedKeyword.key),
            },
            100 + lovedKeyword.ratio * 12,
        );
    }

    const lovedRace = strongestToken(stats.byRace, 3);
    if (lovedRace && lovedRace.ratio >= 0.65) {
        addCustomBadge(
            {
                id: `most-loved-race-${lovedRace.key.toLowerCase()}`,
                name: "Most Loved Tribe",
                category: "Meta",
                description: `Your strongest tribe preference was ${prettyToken(lovedRace.key)}.`,
                rarity: "common",
                detail: tokenDimensionLabel("Tribe", lovedRace.key),
            },
            95 + lovedRace.ratio * 10,
        );
    }

    const dimensionMaps: Array<{ prefix: string; map: KeyBreakdownMap }> = [
        { prefix: "Type", map: stats.byType },
        { prefix: "Rarity", map: stats.byRarity },
        { prefix: "Class", map: stats.byClass },
        { prefix: "Race", map: stats.byRace },
        { prefix: "Keyword", map: stats.byMechanic },
        { prefix: "Set", map: stats.bySet },
    ];

    let bestSpike: { prefix: string; key: string; delta: number; ratio: number } | null = null;
    let hasContrarianToken = false;
    let bestPerfectRead: { prefix: string; key: string; seen: number } | null = null;
    for (const { prefix, map } of dimensionMaps) {
        for (const [key, value] of Object.entries(map)) {
            if (value.seen < 3) {
                continue;
            }
            const ratio = value.liked / value.seen;
            const delta = ratio - stats.likeRatio;
            if (ratio >= 0.8 && delta >= 0.25) {
                if (!bestSpike || delta > bestSpike.delta || (delta === bestSpike.delta && ratio > bestSpike.ratio)) {
                    bestSpike = { prefix, key, delta, ratio };
                }
            }
            if (value.seen >= 4 && ratio <= 0.25) {
                hasContrarianToken = true;
            }
            if (value.seen >= 5 && ratio === 1) {
                if (!bestPerfectRead || value.seen > bestPerfectRead.seen) {
                    bestPerfectRead = { prefix, key, seen: value.seen };
                }
            }
        }
    }

    const spike = bestSpike;
    if (spike) {
        addCustomBadge(
            {
                id: `preference-spike-${spike.prefix.toLowerCase()}-${spike.key.toLowerCase()}`,
                name: "Preference Spike",
                category: "Meta",
                description: "You over-indexed on a specific pattern versus your overall like rate.",
                rarity: "rare",
                detail: tokenDimensionLabel(spike.prefix, spike.key),
            },
            110 + spike.delta * 40,
        );
    }

    if (stats.likeRatio >= 0.35 && stats.likeRatio <= 0.65 && hasContrarianToken) {
        addBadgeById("contrarian", 95);
    }

    if (bestPerfectRead) {
        addBadgeById(
            "perfect-read",
            140 + Math.max(0, bestPerfectRead.seen - 5),
            tokenDimensionLabel(bestPerfectRead.prefix, bestPerfectRead.key),
        );
    }

    if (stats.likeRatio >= 0.48 && stats.likeRatio <= 0.52 && stats.superLikes >= 0 && stats.superLikes <= 1) {
        addBadgeById("coinflip", 70);
    }

    return selectShowcase(Array.from(candidateMap.values()), stats);
}

export function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}
