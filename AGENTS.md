# Repository guide

- This is a static, vanilla HTML/CSS/JavaScript browser game. The entry point is `src/index.html`; open it in a browser to run it. No package manifest, build, lint, or automated test command is configured.
- JavaScript files use shared browser globals, not modules. Preserve the script order in `src/index.html`: `maze.js` → `game.js` → `render.js` → `main.js`; later files depend on globals created by earlier ones.
- After game changes, manually smoke-test starting/restarting the game and arrow-key movement in the browser. There is no automated test suite.
- For large feature work, follow the repo's spec-driven workflow in `.agents/skills/spec/SKILL.md` (and its `template.md`).
- Match the existing JavaScript formatting: single quotes and spaces inside parentheses/brackets (for example, `( value )` and `[ key ]`).
