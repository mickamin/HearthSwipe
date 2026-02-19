# HearthSwipe

HearthSwipe is a Tinder-style web app for quick-fire Hearthstone card judging.  
Swipe cards, lock in your choices, and run through a curated 30-card draft-sized batch.

## Features

- 30-card runs using collectible cards only
- Actions: Like, Nope, Super Like, Reverse
- Per-run limits: `Super Like` x2, `Reverse` x3
- Reverse rules: latest card only, reverse does not stack, one reverse per card
- Hearthstone-themed visual shell, buttons, and overlays
- Artist + flavor text display with fixed-size flavor box and auto-fitting text

## Controls

- Drag right: `Like`
- Drag left: `Nope`
- Drag up: `Super Like`
- Click buttons: same actions as swipe gestures
- Reverse button: undo your latest valid action (within rules)

## Tech Stack

- React 19
- TypeScript
- Vite
- ESLint

## Run Locally

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

## Data Sources

- Card metadata source: [HearthstoneJSON](https://api.hearthstonejson.com/)
- Card renders source: `art.hearthstonejson.com`

The app fetches:

- `https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json`
- `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png`

## Asset Credits And Attribution

This project uses Hearthstone-themed visual assets for fan UI styling.

- Some UI visual assets in this project were sourced from Hearthstone Wiki pages, including:
- [Hearthstone Wiki](https://hearthstone.fandom.com/wiki/Hearthstone_Wiki)
- [Category: Game assets](https://hearthstone.fandom.com/wiki/Category:Game_assets)
- Additional card/game data is provided by HearthstoneJSON (see above).

Hearthstone and related artwork, names, logos, and game assets are property of Blizzard Entertainment, Inc.

This repository is a fan-made, unofficial project and is not affiliated with or endorsed by Blizzard Entertainment.

## License Notes

- Source code in this repository is licensed under MIT (`LICENSE`).
- Third-party/game IP (including Hearthstone art and extracted visual assets) is not re-licensed by MIT.
- If you redistribute or publish this project, you should keep attribution and ensure your usage complies with the original IP owners' terms.

## Project Structure

```text
src/
  App.tsx
  index.css
  assets/
public/
  favicon.png
```

Current asset files are kept in a single `src/assets` folder with descriptive prefixes (`button-`, `overlay-`, `background-`, `frame-`).  
If the asset set grows, splitting into subfolders (`assets/buttons`, `assets/overlays`, `assets/backgrounds`) is a safe next step.
