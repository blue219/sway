## Repository description
Whakakori Together is a frontend-only, non-commercial movement and quiz prototype for older adults. See README.md for current behaviour and model setup; Movement Game Prototype.docx is the original design reference.

## Goal
Preserve the five-movement round, five-question quiz, and session-only wellbeing reward while keeping the facilitator-supported experience simple and accessible.

## Local Startup
- Run `pnpm install`, then `pnpm dev`.
- Camera access requires localhost or HTTPS and browser permission. PoseNet may download backbone weights even though movement classifiers are included locally.
- No backend or environment variables are required.

## Tech stack
- Node.js 22 LTS
- Vite
- React
- TypeScript
- animal-island-ui

## Repository structure
- `src/App.tsx`: round orchestration and fallback timer.
- `src/game.ts`: content, randomisation, scoring, and tree stages.
- `src/poseRecognition.ts`: cumulative recognition timer.
- `src/components/`: screen and camera components.
- `public/`: media, model exports, and vendored browser runtimes.
- Tests live beside the source; shared setup is in `src/test/`.

## Project rules
- Using animal-island-ui style when modify front-end code
- Preserve the mirrored, centred 257 x 257 inference canvas and its regression test.
- Keep movement titles aligned with model labels and the paths in `CameraPreview.tsx`.
- Run focused Vitest tests for the changed behaviour, then `pnpm lint` and `pnpm build`.
- Keep README.md aligned with implemented behaviour and retain third-party attribution and non-commercial terms.
