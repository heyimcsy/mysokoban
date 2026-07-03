# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Status: greenfield

This directory is currently empty. It is the "context-first" rebuild of the Sokoban
puzzle game. A complete, working reference implementation lives in the sibling directory
`../01-sokoban` — consult it for concrete patterns, but the architecture, conventions, and
product requirements below are the contract to build against.

The product spec is `../01-sokoban/02-prd.md` (Korean). Summary: a lightweight, brick-house
themed Sokoban with 10 progressively harder stages, smooth slide animations, and one-handed
mobile play. UI text is Korean.

## Stack & commands

Vanilla **React 18 + Vite 5**, plain CSS (no TypeScript, no CSS framework, no test runner).

```bash
npm install
npm run dev      # vite dev server
npm run build    # production build -> dist/
npm run preview  # serve the built dist/
```

There is no lint or test tooling configured. Don't assume `npm test` exists; verify game
logic by running the dev server, or add a runner explicitly if asked.

## Architecture

The design deliberately separates **pure game logic** from **React state** from **rendering**.
Keep these three layers decoupled.

### 1. Game logic — pure functions (`src/sokoban.js`)

All rules live in side-effect-free functions: `parseLevel`, `tryMove`, `isWin`, plus
`cellAt` / `boxAt` helpers and the `CELL` / `DIRS` constants. They take a state object and
return a new one (or `null` when a move is illegal) — never mutate. This is what makes undo
a trivial history stack and keeps the logic unit-testable in isolation.

**Static/dynamic split is the core idea.** A parsed level is:
- `grid`: 2D array of `wall | floor | target` — terrain that never moves.
- `player`: `{ x, y }`.
- `boxes`: `[{ id, x, y }]` — **`id` is stable and preserved across moves** (`tryMove` maps
  over boxes, only changing the moved one's coords). This stable identity is what lets React
  animate a box sliding rather than snapping. Do not regenerate box ids on each move.

A box is "on target" by checking `cellAt(grid, box.x, box.y) === TARGET` — on-target state is
derived, never stored.

### 2. App state — `useReducer` (`src/App.jsx`)

One reducer drives everything via a `screen` machine: `start | play | clear | allclear`.
Actions: `START`, `SELECT`, `HOME`, `RESTART`, `UNDO`, `NEXT`, `MOVE`. The reducer calls the
pure logic; `MOVE` pushes the prior game state onto a `history` array (undo) and computes the
next screen from `isWin` + whether it's the last level. Input handlers (keyboard, swipe) only
dispatch — they hold no game rules.

### 3. Rendering — two layers (`src/components/Board.jsx`)

- Static terrain is laid out with **CSS Grid** (`--cols` / `--rows` custom properties).
- Player and boxes are **absolutely positioned** over the grid and moved with
  `transform: translate(calc(var(--cell) * x), calc(var(--cell) * y))`. CSS transitions on
  `transform` produce the smooth slide (PRD asks for ~100–150ms ease-in-out). The cell size
  lives in the `--cell` CSS variable so layout and movement stay in sync.

Keep `src/components/Controls.jsx` (on-screen d-pad + undo/restart) presentational.

### Level format (`src/levels.js`)

Levels are arrays of strings using standard Sokoban ASCII notation, parsed by `parseLevel`:

| char | meaning            | char | meaning              |
|------|--------------------|------|----------------------|
| `#`  | wall               | `*`  | box on target        |
| ` `  | floor              | `@`  | player               |
| `.`  | target             | `+`  | player on target     |
| `$`  | box                |      |                      |

`parseLevel` pads short rows to the widest row's length, so rows need not be equal length.

## Conventions

- **Input parity:** every action must work via keyboard, touch, and on-screen buttons.
  Keyboard = arrow keys + WASD (move), `U` (undo), `R` (restart); touch = swipe with a ~24px
  threshold; plus the d-pad/aux buttons. Wire new actions into all three.
- UI strings are Korean — match existing tone.
- No mutation in the logic layer; thread new state through the reducer rather than reaching
  into game objects from components.
