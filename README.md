# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. A single round supports seated or standing participation, five gentle movements, one multiple-choice question, and a session-only wellbeing tree reward.

## Local startup

Requirements: Node.js 22 LTS and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The prototype does not require a backend, camera, account, or environment variables.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
```

## Interaction and accessibility

- Choose Seated mode or Standing mode with mouse, touch, keyboard Tab, Enter, or Space.
- During a movement, select **I’m ready** to start a four-second hold. The player advances manually after the hold completes.
- Select **Pause** at any point to freeze the timer.
- On the quiz, use Up/Down or Left/Right to move between answers, then press Enter or Space to answer.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round and reset after finishing or refreshing.
- There is no pose detection, camera input, medical guidance, account system, analytics, or facilitator dashboard.
- The included Tūī question is a demonstration item. Any future te reo Māori or community-specific content must be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.
