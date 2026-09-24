export const inferenceFrameSize = 257

export function drawInferenceFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
    return false
  }

  // Match Teachable Machine's mirrored square webcam input for both pose models.
  const sourceSize = Math.min(video.videoWidth, video.videoHeight)
  const sourceX = (video.videoWidth - sourceSize) / 2
  const sourceY = (video.videoHeight - sourceSize) / 2
  context.save()
  context.clearRect(0, 0, inferenceFrameSize, inferenceFrameSize)
  context.translate(inferenceFrameSize, 0)
  context.scale(-1, 1)
  context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, inferenceFrameSize, inferenceFrameSize)
  context.restore()
  return true
}
