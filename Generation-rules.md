## Movement Sprite Sheet Generation Rules

- Follow these rules when generating movement sprite sheets.

### Character Reference
- Always use the approved master character as the visual reference.
- Keep the same:
  - face
  - hairstyle
  - skin tone
  - clothing
  - body proportions
  - illustration style

### Sprite Sheet
- Generate 1 sprite sheet per movement.
- Layout: 2 × 4
- Total frames: 8
- Each frame cell: 1200 × 1200 px
- Full sprite sheet: 4800 × 2400 px
- Background: transparent
- No visible grid, text, numbers, borders, floor, or shadows.

### Internal Frame Grid
- Each 1200 × 1200 frame uses an invisible 12 × 12 reference grid.
- Cell size: 100 px.
- Default body center line: x = 600.
- Default foot baseline: y = 1020.
- Standing character height: about 840–900 px.

### Neutral Standing Pose
- Left foot center: x = 520, y = 1020.
- Right foot center: x = 680, y = 1020.

### Consistency Rules
- Full body must remain fully visible.
- Keep camera angle fixed.
- Keep character scale consistent.
- Keep character identity and clothing identical.
- Keep framing consistent between frames.
- Avoid unnecessary horizontal or vertical character drift.
- Keep head position as stable as reasonably possible.
- Do not zoom in or out between frames.
- Preserve enough empty space for extended arms and legs.

### Movement Rules
- Only body parts required by the movement should change.
- Arms, legs, torso, hips, and knees may move when the exercise requires it.
- For single-support movements, keep the supporting foot anchored to the baseline.
- Do not force the supporting foot to remain fixed when the exercise naturally requires stepping, squatting, heel raising, or weight shifting.
- Motion between adjacent frames should progress gradually and naturally.

### Output
- Source: transparent PNG sprite sheet.
- Final animation: WebM, 960 × 960 px.
- Playback: approximately 12–15 fps.
