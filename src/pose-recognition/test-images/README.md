# Pose recognition flow-test images

Put PNG test images into one of these directories:

- `correct/`: the image should match the target movement.
- `incorrect/`: a person is present but should not match the target movement.
- `none/`: no usable target pose is present.

Each filename must start with the target `MovementId`, followed by `--` and any
description. For example:

```text
correct/mini-squat--front-view-01.png
incorrect/mini-squat--standing-still-01.png
none/mini-squat--empty-room-01.png
```

Supported movement IDs:

```text
side-leg-move
mini-squat
cross-body-knee-reach
double-arm-raise
side-to-side-foot-tap
frontal-raise
knee-lift-extension
lateral-raise
arm-above-head
rowing
```

Run the flow test with:

```bash
pnpm test src/pose-recognition/pose-recognition.flow.test.ts
```

The test serves `public/models` over a temporary local HTTP server. Teachable
Machine also downloads its base PoseNet checkpoint when loading, so the first
real run requires network access.
