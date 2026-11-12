## Taiwlind Starter

This repository is used to start coding Tailwind projects real quick.
Developers do not have to go through rough steps to create and configure a Tailwind project.

### Getting started

The repository has included Tailwind CSS and it is ready to use without additional actions.

Build & Complie Tailwind Command

```npm

npm run dev

```

### Directory Info

- The dist folder includes index.html & complied style.css
- The dist/js folder includes the modular game scripts used by `game.html`
- The src folder includes input.css which a Tailwind pre-compile file

### Boards

| Players | Page | Board |
| --- | --- | --- |
| 2 - 4 | `dist/game.html` | the square 15x15 grid, built from divs (`dist/js/game-*.js`) |
| 5 | `dist/game5.html` | decagon, drawn as one SVG (`dist/js/boardn-*.js`) |
| 6 | `dist/game6.html` | dodecagon, same code as the 5-player board |
| 7 - 10 | `dist/game5.html?n=7` .. `?n=10` | same code again; no page of their own |

`dist/index.html` picks the board from the seat count and remembers the names.

The `boardn-*` modules are seat-count agnostic: the roster rides on
`cfg.players` and every angle is derived from its length, so `game5.html` and
`game6.html` are the same page with a different `data-players`. Add a seat
count by adding a colour to `ALL_PLAYERS` and an arc pair to `ARCS` in
`dist/js/boardn-geometry.js`; `SEAT_COUNTS` currently runs 4 to 10, and every
page reads the board from it rather than listing counts of its own.

`dist/boardn.html` draws the geometry on its own, with a 4 - 10 player slider,
`?n=` to land on one of them and `?design=1` for the tuning sliders. Rules run headless with:

```bash
node "dist/js/boardn-engine.test.mjs"
```
