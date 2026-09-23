# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. The opening screen offers standing and seated choices. Standing rounds present five movement videos in a random, non-repeating order; the seated round presents knee extension, torso twist, arm opening, marching, then overhead press. Both modes continue to five multiple-choice questions and a session-only wellbeing tree reward.

## Local startup

Requirements: Node.js 22 LTS and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. The prototype does not require a backend, account, or environment variables. Pose recognition requires camera permission in a secure browser context (localhost or HTTPS). The movement classifiers and browser runtimes are included; the PoseNet backbone weights may still be fetched from Google Cloud Storage by the runtime.

## Commands

```bash
pnpm test
pnpm lint
pnpm build
```

For focused round and recognition checks, run `pnpm exec vitest run src/App.test.tsx src/game.test.ts src/components/CameraPreview.test.tsx src/poseRecognition.test.ts`. `pnpm test:watch` runs tests interactively. The build writes a static site to `dist/`; deploy at the site root because asset and model URLs are absolute paths. ESLint checks project code and excludes the vendored, minified runtimes.

## Repository structure

- `src/App.tsx`: selection and round state, screen transitions, quiz feedback, and timer fallback.
- `src/game.ts`: movement and quiz content, randomisation, scoring, and tree stages.
- `src/poseRecognition.ts`: confidence threshold and cumulative recognition timer.
- `src/components/`: header, movement-style selection, movement, camera, quiz, and result presentation.
- `src/styles.css`: responsive styling layered over `animal-island-ui/style`.
- `src/**/*.test.ts(x)` and `src/test/setup.ts`: Vitest and Testing Library regression coverage.
- `public/assets/`, `public/models/`, `public/vendor/`: served media, movement classifiers, and legacy browser runtimes.
- `Movement Game Prototype.docx`: original design reference; this README describes the implemented behaviour.

## Interaction and accessibility

- The opening screen uses two illustrated cards: **Standing** on the left and **Seated** on the right, stacked on mobile. Choosing Standing opens the five-movement round. Choosing Seated opens knee extension, torso twist, arm opening, marching, and overhead press, followed by the same five-question quiz.
- The header shows **Go back** after navigating away from selection and returns through visited screens. Select the **Whakakori Together** logo at any time to reset the round and return to the opening screen.
- The standing round opens on one of five preloaded movement videos; the seated round presents knee extension, torso twist, arm opening, marching, and overhead press in that order. Select **Start** to begin playback and recognition from the start. A movement completes after five seconds of cumulative recognition at 70% confidence; gaps longer than 300 milliseconds pause the timer without clearing progress. Torso twist, arm opening, marching, and overhead press show their videos without requesting the camera or loading pose models; use **Skip** to continue.
- The movement demonstrator loops the selected responsive native video player asset.
- The movement page uses a two-card layout: the demonstration, movement counter, Start and Skip buttons are on the left; a live browser camera preview or a model-pending placeholder is on the right. The cards stack on mobile. While recognition is active, a green check or red cross appears beside Hold. The preview requests video-only permission, processes footage in the browser, and stops its camera track when the movement page unmounts.
- Start is available while the camera and pose model initialise. An initial baseline prediction (`Neutral` or `Idle`) is not required. Only adjacent target predictions at or above 70% confidence and no more than 300 milliseconds apart add time; baseline, low-confidence, and other movement predictions do not add time. Standing rounds contain Side Arm Raise, Standing March, Shallow Squat, Standing Side Bend, and Side Leg Lift. Seated rounds contain Seated knee extension, Seated torso twist, Seated arm-opening, Seated marching, then Seated Overhead Press.
- After the movement sequence, the quiz is the only main-screen module and presents five randomly selected, non-repeating questions.
- On the quiz, answer choices are shuffled for every question. Use Up/Down or Left/Right to choose an answer. The correct answer turns green for one second; an incorrect chosen answer turns red before the next question appears.
- Select **Skip** beside **Start** to move directly to the next movement. Skipping the final movement opens the quiz.
- Each correct answer earns 10 Wellbeing Points, for a maximum of 50 points per round.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round. Points are revealed on the result screen. Both **Play another round** and **Finish for today** reset the round and return to the movement-style selection screen; refreshing also returns to selection.
- There is no camera recording, medical guidance, account system, analytics, or facilitator dashboard. Pose classification only identifies the trained movement category; it does not assess exercise quality, range of motion, or safety.
- The 15-question demonstration bank includes six illustrated and nine text-only questions about te reo Māori, community, welcome customs, food, art and taonga. Any future te reo Māori or community-specific content must be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.

## Pose model setup

The seated catalog in `src/game.ts` contains Seated knee extension, Seated torso twist, Seated arm opening, Seated marching, and Seated Overhead Press in a fixed order. Knee extension, torso twist, and arm opening use dedicated models; marching and overhead press currently show their videos without pose recognition.

The included models are dedicated two-class **Pose** models exported from Teachable Machine as TensorFlow.js. No training or file copying is required to run the supplied prototype. `CameraPreview.tsx` selects these paths by movement title:

- `public/models/pose/`: `Neutral` and `Standing March`
- `public/models/side-arm-raise/`: `Neutral` and `Side Arm Raise`
- `public/models/shallow-squat/`: `Neutral` and `Shallow Squat`
- `public/models/side-leg-lift/`: `Neutral` and `Side Leg Lift`
- `public/models/standing-side-bend/`: `Neutral` and `Standing Side Bend`
- `public/models/seated-knee-extension/`: `Idle` and `Seated knee extension`
- `public/models/seated-arm-opening/`: `Idle` and `Seated arm opening`
- `public/models/seated-torso-twist/`: `Idle` and `Seated torso twist`

The model labels must match these values exactly:

- `Neutral`
- `Side Arm Raise`
- `Standing March`
- `Shallow Squat`
- `Standing Side Bend`
- `Side Leg Lift`

The seated knee extension labels are `Idle` and `Seated knee extension`. The seated arm opening labels are `Idle` and `Seated arm opening`. The seated torso twist labels are `Idle` and `Seated torso twist`.

To replace a classifier, copy every exported file, including `model.json`, `metadata.json`, and the referenced `.bin` weights file, into its movement directory. A shared six-class standing model is also supported: place its files in `public/models/pose/` and remove the standing entries in `modelUrlsByMovement` in `CameraPreview.tsx` so those movements use `defaultModelUrls`. Replacing only `public/models/pose/` changes Standing March, not the other four standing classifiers. Each supported seated movement uses a dedicated model.

The seated demonstration videos are `public/assets/seated-knee-extension.mp4`, `public/assets/seated-torso-twist.mp4`, `public/assets/seated-arm-opening.mp4`, `public/assets/seated-marching.mp4`, and `public/assets/seated-overhead-press.mp4`. The app loads the movement classifiers from local files. `index.html` loads TensorFlow.js before the Teachable Machine browser runtime from `public/vendor/`; Vite does not bundle those legacy runtimes. The runtime can download PoseNet backbone weights from `storage.googleapis.com`, so fully offline recognition is not guaranteed. When the camera or pose recognition is unavailable, the participant can choose to continue the current round with a five-second timer for every remaining movement. Train and test with the intended participants, camera position, lighting, clothing, mobility aids, and left/right movement variations. This prototype is not a medical or rehabilitation assessment tool.

### Camera preprocessing invariant

Pose inference must receive the same input geometry used by the Teachable Machine webcam workflow. Before calling `estimatePose`, `CameraPreview` must draw each camera frame into a reusable 257 × 257 canvas using a centred square crop and horizontal mirroring, then pass that canvas to the model.

Do not replace this canvas with the raw `<video>` element. The preview's CSS `transform: scaleX(-1)` changes only what the participant sees; it does not mirror the pixels used for inference. In `@teachablemachine/pose` 0.8.6, passing `true` to `estimatePose(video, true)` flips the returned keypoint coordinates but does not flip the `posenetOutput` consumed by the classifier. Passing the raw rectangular video therefore makes production inference differ from Teachable Machine testing and can cause a neutral standing pose to be classified as the target movement, which incorrectly advances the hold timer.

Keep the `CameraPreview` regression test that verifies the model receives a mirrored, centred 257 × 257 canvas and that a high-confidence `Neutral` prediction leaves the active duration at zero.

A two-class model containing `Neutral` or `Idle` and one movement label is supported only for that movement. Keep movement titles and model labels aligned when editing the content.
