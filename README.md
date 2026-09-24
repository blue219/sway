# Whakakori Together

Whakakori Together is a non-commercial React prototype for a facilitator-supported movement and quiz activity for older adults. The opening screen offers standing and seated choices. Standing and seated rounds present five movement videos in random, non-repeating order, followed by five illustrated two-choice questions and a session-only wellbeing tree reward.

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

For focused round and recognition checks, run `pnpm exec vitest run src/App.test.tsx src/game.test.ts src/components/CameraPreview.test.tsx src/components/QuizCameraPreview.test.tsx src/poseRecognition.test.ts src/quizRecognition.test.ts`. `pnpm test:watch` runs tests interactively. The build writes a static site to `dist/`; deploy at the site root because asset and model URLs are absolute paths. ESLint checks project code and excludes the vendored, minified runtimes.

## Repository structure

- `src/App.tsx`: selection and round state, screen transitions, quiz feedback, and timer fallback.
- `src/game.ts`: movement and quiz content, randomisation, scoring, and tree stages.
- `src/poseRecognition.ts` and `src/quizRecognition.ts`: confidence threshold, cumulative recognition timers, and quiz gesture choice.
- `src/components/`: header, movement-style selection, movement, camera, quiz, and result presentation.
- `src/styles.css`: responsive styling layered over `animal-island-ui/style`.
- `src/**/*.test.ts(x)` and `src/test/setup.ts`: Vitest and Testing Library regression coverage.
- `public/assets/`, `public/models/`, `public/vendor/`: served media, movement classifiers, and legacy browser runtimes.
- `Movement Game Prototype.docx`: original design reference; this README describes the implemented behaviour.

## Interaction and accessibility

- The opening screen uses two illustrated cards: **Standing** on the left and **Seated** on the right, stacked on mobile. Choosing either option opens a five-movement round in random order, followed by the same five-question quiz. Seated movements are torso twist, arm opening, overhead press, arm reach, and forward reach.
- The header shows **Go back** after navigating away from selection and returns through visited screens. Select the **Whakakori Together** logo at any time to reset the round and return to the opening screen.
- Each round opens on a movement video. Select **Start** to begin playback and recognition. Movements with a model complete after five seconds of cumulative recognition at 70% confidence; gaps longer than 300 milliseconds pause the timer without clearing progress. **Skip** remains available for every movement.
- The movement demonstrator loops the selected responsive native video player asset.
- The movement page uses a two-card layout: the demonstration, movement counter, Start and Skip buttons are on the left; a live browser camera preview or a model-pending placeholder is on the right. The cards stack on mobile. While recognition is active, a green check or red cross appears beside Hold. The preview requests video-only permission, processes footage in the browser, and stops its camera track when the movement page unmounts.
- Start is available while the camera and pose model initialise. Neither mode requires an initial baseline prediction (`Neutral` or `Idle`). Only adjacent target predictions at or above 70% confidence and no more than 300 milliseconds apart add time; baseline, low-confidence, and other movement predictions do not add time. Standing rounds contain Side Arm Raise, Standing March, Shallow Squat, Standing Side Bend, and Side Leg Lift. Seated rounds contain Seated torso twist, Seated arm opening, Seated overhead press, Seated arm reach, and Seated Forward Reach.
- After the movement sequence, the two-card layout remains. The left card shows the supplied hand-choice guide with a visible three-second countdown, then presents five illustrated questions in random order. Each question displays its two answer choices side by side. The right card uses the same camera layout as the movement screen and shows the gesture hold progress in its heading. The guide can be reopened during a question.
- Each question has two shuffled answers: A and B. Raise the left hand for A or the right hand for B. The quiz model must recognize `Option A` or `Option B` at 70% confidence for two cumulative seconds. Gaps longer than 300 milliseconds pause progress. Switching options resets the hold. `Idle` and low-confidence predictions never submit an answer. After each answer, the hand must return to `Idle` before gesture choice is enabled for the next question.
- Participants can also use the large A/B buttons with touch, mouse, or keyboard, including when the quiz camera or model is unavailable. The correct answer turns green for one second; an incorrect chosen answer turns red before the next question appears.
- Select **Skip** beside **Start** to move directly to the next movement. Skipping the final movement opens the quiz.
- Each correct answer earns 10 Wellbeing Points, for a maximum of 50 points per round.
- The UI uses large controls, visible keyboard focus, high contrast, responsive layouts, and reduced motion preferences.

## Prototype boundaries

- Scores and tree state are held only for the current round. Points are revealed on the result screen. Both **Play another round** and **Finish for today** reset the round and return to the movement-style selection screen; refreshing also returns to selection.
- There is no camera recording, medical guidance, account system, analytics, or facilitator dashboard. Pose classification only identifies the trained movement category; it does not assess exercise quality, range of motion, or safety.
- The five illustrated questions cover pōhutukawa, kākāpō, koru, harakeke, and the New Zealand flag. Their detailed, warm-toned illustrations use a shared painted nature style that matches the growing-tree reward. Factual references are [DOC pōhutukawa](https://www.doc.govt.nz/pohutukawa), [DOC kākāpō](https://www.doc.govt.nz/kakapo), [Te Ara koru](https://teara.govt.nz/en/photograph/10852/silver-fern-koru), [Te Papa harakeke](https://collections.tepapa.govt.nz/topic/3623), and the [Ministry for Culture and Heritage flag description](https://www.mch.govt.nz/our-work/flags-anthems-and-emblems/new-zealand-flag). Any future te reo Māori or community-specific content should be reviewed by fluent speakers and community partners before use.

## Third-party licence

This non-commercial prototype uses [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.4.0 and imports its official style entry point. The dependency is licensed under CC BY-NC 4.0. Its attribution and non-commercial terms must remain in place; do not use this prototype or the component library in a commercial product.

## Pose model setup

The seated catalog in `src/game.ts` contains Seated torso twist, Seated arm opening, Seated overhead press, Seated arm reach, and Seated Forward Reach. Both modes use the same random round ordering, camera preprocessing, inference pipeline, confidence threshold, and cumulative recognition timer. Each seated movement uses a dedicated model. Standing classifier weights cannot recognize their seated labels.

The included movement models are dedicated two-class **Pose** models exported from Teachable Machine as TensorFlow.js. No training or file copying is required to run the supplied prototype. `CameraPreview.tsx` selects these paths by movement title:

- `public/models/pose/`: `Neutral` and `Standing March`
- `public/models/side-arm-raise/`: `Neutral` and `Side Arm Raise`
- `public/models/shallow-squat/`: `Neutral` and `Shallow Squat`
- `public/models/side-leg-lift/`: `Neutral` and `Side Leg Lift`
- `public/models/standing-side-bend/`: `Neutral` and `Standing Side Bend`
- `public/models/seated-arm-opening/`: `Idle` and `Seated arm opening`
- `public/models/seated-torso-twist/`: `Idle` and `Seated torso twist`
- `public/models/seated-overhead-press/`: `Idle` and `Seated overhead press`
- `public/models/seated-arm-reach/`: `Idle` and `Seated arm reach`
- `public/models/seated-forward-reach/`: `Idle` and `Seated Forward Reach`

The separate quiz model in `public/models/quiz/` has exactly three labels: `Idle`, `Option A`, and `Option B`. Its files came from the supplied Teachable Machine export. `QuizCameraPreview.tsx` loads it while the three-second hand guide is visible. When camera or model recognition fails, the on-screen A/B buttons remain available.

The model labels must match these values exactly:

- `Neutral`
- `Side Arm Raise`
- `Standing March`
- `Shallow Squat`
- `Standing Side Bend`
- `Side Leg Lift`

The seated model labels are `Idle` plus the exact matching movement title: `Seated arm opening`, `Seated torso twist`, `Seated overhead press`, `Seated arm reach`, or `Seated Forward Reach`.

To replace a classifier, copy every exported file, including `model.json`, `metadata.json`, and the referenced `.bin` weights file, into its movement directory. A shared six-class standing model is also supported: place its files in `public/models/pose/` and remove the standing entries in `modelUrlsByMovement` in `CameraPreview.tsx` so those movements use `defaultModelUrls`. Replacing only `public/models/pose/` changes Standing March, not the other four standing classifiers. Each seated classifier uses a dedicated model.

The seated demonstration videos are `public/assets/seated-torso-twist.mp4`, `public/assets/seated-arm-opening.mp4`, `public/assets/seated-overhead-press.mp4`, `public/assets/seated-arm-reach.mp4`, and `public/assets/seated-forward-reach.mp4`. The app loads the movement classifiers from local files. `index.html` loads TensorFlow.js before the Teachable Machine browser runtime from `public/vendor/`; Vite does not bundle those legacy runtimes. The runtime can download PoseNet backbone weights from `storage.googleapis.com`, so fully offline recognition is not guaranteed. When the camera or pose recognition is unavailable, the participant can choose to continue the current round with a five-second timer for every remaining movement. Train and test with the intended participants, camera position, lighting, clothing, mobility aids, and left/right movement variations. This prototype is not a medical or rehabilitation assessment tool.

### Camera preprocessing invariant

Pose inference must receive the same input geometry used by the Teachable Machine webcam workflow. Before calling `estimatePose`, both movement and quiz previews draw each camera frame into a reusable 257 × 257 canvas using a centred square crop and horizontal mirroring, then pass that canvas to the model.

Do not replace this canvas with the raw `<video>` element. The preview's CSS `transform: scaleX(-1)` changes only what the participant sees; it does not mirror the pixels used for inference. In `@teachablemachine/pose` 0.8.6, passing `true` to `estimatePose(video, true)` flips the returned keypoint coordinates but does not flip the `posenetOutput` consumed by the classifier. Passing the raw rectangular video therefore makes production inference differ from Teachable Machine testing and can cause a neutral standing pose to be classified as the target movement, which incorrectly advances the hold timer.

Keep the `CameraPreview` regression test that verifies the model receives a mirrored, centred 257 × 257 canvas and that a high-confidence `Neutral` prediction leaves the active duration at zero.

A two-class model containing `Neutral` or `Idle` and one movement label is supported only for that movement. Keep movement titles and model labels aligned when editing the content.
