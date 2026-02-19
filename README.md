# HearthSwipe

A fan-made, non-commercial Hearthstone companion app built with React and TypeScript.

HearthSwipe is a Tinder-style web app for quick-fire Hearthstone card judging.
Swipe cards, lock in your choices, and run through a curated 30-card draft-sized batch.

## Features

- 30-card runs using collectible cards only
- Actions: Like, Nope, Super Like, Reverse
- Per-run limits: Super Like x2, Reverse x3
- Reverse rules: latest card only, reverse does not stack, one reverse per card
- Custom fantasy-themed visual shell, buttons, and overlays (original / AI-generated assets)
- Artist and flavor text display with fixed-size flavor box and auto-fitting text

## Controls

- Drag right -> Like
- Drag left -> Nope
- Drag up -> Super Like
- Click buttons -> same actions as swipe gestures
- Reverse button -> undo your latest valid action (within rules)

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

- Card metadata source: https://api.hearthstonejson.com/
- Card renders source: https://art.hearthstonejson.com/

The app fetches:

- https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json
- https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png

This project does not host or redistribute card metadata or card artwork. All card images and artwork are property of Blizzard Entertainment, Inc. and are fetched dynamically from publicly available API endpoints.

## Fan Project Disclaimer

This project is a non-commercial, fan-made application created for educational and portfolio purposes only.

It is not affiliated with, endorsed by, sponsored by, or approved by Blizzard Entertainment, Inc.

No monetization, advertising, or commercial distribution is associated with this project.

## Intellectual Property Notice

Hearthstone® is a registered trademark of Blizzard Entertainment, Inc.

Hearthstone, its artwork, card designs, names, logos, characters, and related materials are trademarks and/or copyrighted property of Blizzard Entertainment, Inc.

All such intellectual property remains the property of their respective owners.

This repository does not claim ownership of any Hearthstone intellectual property.

## Visual Assets

All UI elements, frames, overlays, and background assets used in this project are original works created specifically for this application, including AI-generated assets.

These assets are not official Blizzard assets and are not extracted from the Hearthstone game.

## License

The original source code and original visual assets in this repository are licensed under the MIT License (see `LICENSE`).

Important:

- The MIT license applies only to the original source code and original visual assets created for this project.
- Hearthstone-related artwork, card renders, names, logos, and other Blizzard intellectual property are not covered by the MIT license.
- Redistribution or reuse of Hearthstone intellectual property must comply with Blizzard Entertainment’s terms and applicable copyright law.

Users are responsible for ensuring their usage complies with original rights holders' terms.

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