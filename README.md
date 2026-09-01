# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. Each round presents five movement videos in a random, non-repeating order, followed by five multiple-choice questions and a session-only wellbeing tree reward.

## Local startup

Requirements: Node.js 22 LTS and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The prototype does not require a backend, account, or environment variables. A camera is optional: grant browser permission to show its live preview on the movement page.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
```

## Interaction and accessibility

- The round opens on one of five preloaded movement videos. Select **Start** to begin playback from the start; its five-second hold starts when playback begins.
- The movement demonstrator loops the selected responsive native video player asset.
- The movement page uses a dedicated two-card layout: the demonstration is on the left, while a live browser camera preview, readiness message, and Start button are on the right. The readiness message becomes **Camera ready** only after a live video track has delivered a frame, and it names the browser-provided video input. It returns to a non-ready state if the stream is interrupted. The preview requests video-only permission, does not record or transmit footage, and stops its camera track when the movement page unmounts. It does not perform movement detection.
- The countdown and action counter display in the upper-left and upper-right corners of the movement video, respectively. Each round contains Side Arm Raise, Standing March, Shallow Squat, Standing Side Bend, and Side Leg Lift in a random, non-repeating order.
- After all five movements, the quiz is the only main-screen module and presents five randomly selected, non-repeating questions.
- On the quiz, use Up/Down or Left/Right to choose an answer. The correct answer turns green for one second; an incorrect chosen answer turns red before the next question appears.
- Each correct answer earns 10 Wellbeing Points, for a maximum of 50 points per round.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round and reset after finishing or refreshing.
- There is no pose detection, camera recording, medical guidance, account system, analytics, or facilitator dashboard.
- The 15-question demonstration bank includes six illustrated and nine text-only questions about te reo Māori, community, welcome customs, food, art and taonga. Any future te reo Māori or community-specific content must be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.
