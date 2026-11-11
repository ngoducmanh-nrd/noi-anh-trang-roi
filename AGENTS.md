# Repository Guidelines

## Project Structure & Module Organization

The active product is the React + TypeScript + Vite PWA in `app/`. UI entry points are in `app/src/`, with shared state and Firebase access in `state/` and `lib/`, feature code in `features/`, and page and component code in `pages/`, `components/`, and `components-extra/`. Browser tests are in `app/tests/`. Root-level `database.rules.json`, `firebase.json`, `scripts/`, and `tests/database.test.mjs` support Firebase Rules validation. Public runtime configuration belongs in `app/public/app-config.js`; do not restore the archived HTML frontend.

## Build, Test, and Development Commands

Run frontend commands from `app/`:

```powershell
npm ci                 # install the locked dependencies
npm run dev            # start Vite at 127.0.0.1:5173
npm run check          # run the TypeScript project check
npm run build          # create the production bundle in app/dist
npm run test:games     # run the game model tests
npm run test:e2e       # run Playwright browser tests
```

From the repository root, `npm run check` validates app files and Firebase Rules JSON. `npm test` runs Rules tests through the Firebase Database Emulator; Java 21 is required. Use the emulator for browser tests and never write test data to production Firebase.

## Coding Style & Naming Conventions

Use TypeScript and React function components with two-space indentation, semicolons, and existing project formatting. Name components and pages in PascalCase, hooks with `use...`, and variables/functions in camelCase. Keep styles in the existing CSS files and preserve the established mobile-first, accessible UI patterns. Run `npm run check` after TypeScript changes.

## Testing Guidelines

Use Node’s built-in test runner for `app/src/features/games/model.test.ts` and Firebase Rules tests, and Playwright for UI/service coverage. Name browser specs `*.spec.ts`. Add or update focused tests for behavior changes, then run the smallest relevant suite plus the TypeScript check.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, for example `Add local mini games` and `Fix support layout`. Follow that style, keep commits focused, and avoid unrelated generated files. Pull requests should describe behavior changes, list validation commands and results, link the relevant issue or task, and include screenshots or viewport details for UI changes. Do not commit secrets, service-account keys, private tokens, or production data.
