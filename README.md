# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. A round starts with a standing march video, followed by five multiple-choice questions and a session-only wellbeing tree reward.

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

- The round opens on the Standing March video. Select **Start** to begin its five-second hold.
- The movement demonstrator loops `/assets/standing-march.mp4` in a responsive native video player. Add the final MP4 at `public/assets/standing-march.mp4`; opening the pause dialog pauses playback and resuming the movement continues it.
- The movement page uses a dedicated two-card layout with a visual-only camera preview. It does not request camera permissions or perform movement detection.
- The action counter displays `1 / 5` to match the demonstration layout; the prototype still contains one movement before the quiz.
- After the movement, the quiz is the only main-screen module and presents five randomly selected, non-repeating questions.
- Select **Pause** at any point to freeze the timer.
- On the quiz, use Up/Down or Left/Right to choose an answer. The correct answer turns green for one second; an incorrect chosen answer turns red before the next question appears.
- Each correct answer earns 10 Wellbeing Points, for a maximum of 50 points per round.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round and reset after finishing or refreshing.
- There is no pose detection, camera input, medical guidance, account system, analytics, or facilitator dashboard.
- The 15-question demonstration bank includes six illustrated and nine text-only questions about te reo Māori, community, welcome customs, food, art and taonga. Any future te reo Māori or community-specific content must be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.
