# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. Each round presents five movement videos in a random, non-repeating order, followed by five multiple-choice questions and a session-only wellbeing tree reward.

## Local startup

Requirements: Node.js 22 LTS and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The prototype does not require a backend, account, or environment variables. Pose recognition requires a browser camera and a locally deployed Teachable Machine pose model.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
```

## Interaction and accessibility

- The round opens on one of five preloaded movement videos. Select **Start** to begin playback and recognition from the start. A movement completes after five seconds of cumulative recognition at 70% confidence; gaps longer than 300 milliseconds pause the timer without clearing progress. The action then runs a five-second countdown before the next movement begins.
- The movement demonstrator loops the selected responsive native video player asset.
- The movement page uses a dedicated two-card layout: the demonstration is on the left, while a live browser camera preview, recognition status, and Start button are on the right. The preview requests video-only permission, does not record or transmit footage, and stops its camera track when the movement page unmounts.
- Start is available while the camera and pose model initialise. A participant earns recognised movement time whenever the current movement is predicted with at least 70% confidence. Recognition can be continuous; returning to neutral is not required. Gaps longer than 300 milliseconds pause the timer without clearing prior progress. After five seconds of recognised movement time, the movement runs a five-second countdown before advancing. Each round contains Side Arm Raise, Standing March, Shallow Squat, Standing Side Bend, and Side Leg Lift in a random, non-repeating order.
- After all five movements, the quiz is the only main-screen module and presents five randomly selected, non-repeating questions.
- On the quiz, use Up/Down or Left/Right to choose an answer. The correct answer turns green for one second; an incorrect chosen answer turns red before the next question appears.
- Each correct answer earns 10 Wellbeing Points, for a maximum of 50 points per round.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round and reset after finishing or refreshing.
- There is no camera recording, medical guidance, account system, analytics, or facilitator dashboard. Pose classification only identifies the trained movement category; it does not assess exercise quality, range of motion, or safety.
- The 15-question demonstration bank includes six illustrated and nine text-only questions about te reo Māori, community, welcome customs, food, art and taonga. Any future te reo Māori or community-specific content must be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.

## Pose model setup

Train one six-class **Pose** model in Teachable Machine and export it as TensorFlow.js. Copy every exported file, including `model.json`, `metadata.json`, and the referenced `.bin` weights file, into `public/models/pose/`.

The model labels must match these values exactly:

- `Neutral`
- `Side Arm Raise`
- `Standing March`
- `Shallow Squat`
- `Standing Side Bend`
- `Side Leg Lift`

The app loads the model only from these local files. It uses the matching Teachable Machine browser runtime from `public/vendor/` rather than bundling this legacy TensorFlow.js version through Vite. When the camera or pose recognition is unavailable, the participant can choose to continue the current round with a five-second timer for every remaining movement. Train and test with the intended participants, camera position, lighting, clothing, mobility aids, and left/right movement variations. This prototype is not a medical or rehabilitation assessment tool.

A two-class model containing `Neutral` and one movement label is also supported for that movement only. The included model is trained for `Standing March`; all other movements use the existing unavailable/timeout fallback until a six-class model replaces it.
