import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraPreview } from './CameraPreview'

const mockLoad = vi.fn()

const requiredLabels = ['Neutral', 'Side Arm Raise', 'Standing March', 'Shallow Squat', 'Standing Side Bend', 'Side Leg Lift']

function createCameraStream() {
  const track = {
    addEventListener: vi.fn(),
    enabled: true,
    label: 'Test camera',
    muted: false,
    readyState: 'live',
    stop: vi.fn(),
  }
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream

  return { stream, track }
}

function renderPreview(isTracking = false, movementLabel = 'Side Arm Raise') {
  const recognitionStatus = vi.fn()
  const completion = vi.fn()
  const activeDuration = vi.fn()
  const recognitionState = vi.fn()
  const view = render(
    <CameraPreview
      isTracking={isTracking}
      movementLabel={movementLabel}
      onRecognitionStatusChange={recognitionStatus}
      onComplete={completion}
      onActiveDurationChange={activeDuration}
      onRecognitionStateChange={recognitionState}
    />,
  )

  return { recognitionStatus, completion, activeDuration, recognitionState, ...view }
}

afterEach(() => {
  cleanup()
  mockLoad.mockReset()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CameraPreview', () => {
  beforeEach(() => {
    window.tmPose = { load: mockLoad }
  })

  it('loads a valid local model after the camera is playing and releases model and camera resources on unmount', async () => {
    const { stream, track } = createCameraStream()
    const dispose = vi.fn()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose, getClassLabels: () => requiredLabels })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const requestAnimationFrame = vi.fn().mockReturnValue(12)
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

    const { recognitionStatus, recognitionState, unmount } = renderPreview(true, 'Standing March')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    Object.defineProperty(video, 'requestVideoFrameCallback', { configurable: true, value: undefined })
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/pose/model.json', '/models/pose/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
    await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalledOnce())
    expect(recognitionState).toHaveBeenLastCalledWith(false)

    unmount()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(12)
  })

  it('reports a missing or failed model and keeps recognition unavailable', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockRejectedValue(new Error('missing model'))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview()
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'unavailable', message: 'Pose model files could not be loaded.' }))
  })

  it('rejects a model with unexpected labels', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    const dispose = vi.fn()
    mockLoad.mockResolvedValue({ dispose, getClassLabels: () => ['Neutral', 'Standing March'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview()
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'unavailable', message: 'Pose model does not support this movement.' }))
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('shows a green check while the target movement is recognised', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    let frameCallback: FrameRequestCallback | undefined
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 12
    })
    mockLoad.mockResolvedValue({
      dispose: vi.fn(),
      estimatePose: vi.fn().mockResolvedValue({ posenetOutput: {} }),
      getClassLabels: () => ['Neutral', 'Standing March'],
      predict: vi.fn()
        .mockResolvedValueOnce([{ className: 'Neutral', probability: 0.9 }])
        .mockResolvedValue([{ className: 'Standing March', probability: 0.9 }]),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)

    const { recognitionState } = renderPreview(true, 'Standing March')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoHeight: { configurable: true, value: 480 },
      videoWidth: { configurable: true, value: 640 },
    })
    fireEvent.playing(video)

    await waitFor(() => expect(frameCallback).toBeDefined())
    frameCallback?.(0)

    await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalledTimes(2))
    frameCallback?.(16)

    await waitFor(() => expect(recognitionState).toHaveBeenLastCalledWith(true))
  })

  it('classifies a mirrored square crop that matches the model training input', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    let frameCallback: FrameRequestCallback | undefined
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 12
    })
    const estimatePose = vi.fn().mockResolvedValue({ posenetOutput: {} })
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as ReturnType<HTMLCanvasElement['getContext']>)
    mockLoad.mockResolvedValue({
      dispose: vi.fn(),
      estimatePose,
      getClassLabels: () => ['Neutral', 'Standing March'],
      predict: vi.fn().mockResolvedValue([
        { className: 'Neutral', probability: 0.99 },
        { className: 'Standing March', probability: 0.01 },
      ]),
    })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)

    const { activeDuration } = renderPreview(true, 'Standing March')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoHeight: { configurable: true, value: 480 },
      videoWidth: { configurable: true, value: 640 },
    })
    fireEvent.playing(video)

    await waitFor(() => expect(frameCallback).toBeDefined())
    frameCallback?.(0)

    await waitFor(() => expect(estimatePose).toHaveBeenCalledOnce())
    const inferenceFrame = estimatePose.mock.calls[0][0]
    expect(inferenceFrame).toBeInstanceOf(HTMLCanvasElement)
    expect(inferenceFrame).toMatchObject({ height: 257, width: 257 })
    expect(context.translate).toHaveBeenCalledWith(257, 0)
    expect(context.scale).toHaveBeenCalledWith(-1, 1)
    expect(context.drawImage).toHaveBeenCalledWith(video, 80, 0, 480, 480, 0, 0, 257, 257)
    expect(activeDuration).toHaveBeenLastCalledWith(0)
  })

  it('accepts a two-class model for its matching movement', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose: vi.fn(), getClassLabels: () => ['Neutral', 'Standing March'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview(false, 'Standing March')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
  })

  it('loads the dedicated Shallow Squat model', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose: vi.fn(), getClassLabels: () => ['Neutral', 'Shallow Squat'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview(false, 'Shallow Squat')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/shallow-squat/model.json', '/models/shallow-squat/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
  })

  it('loads the dedicated Side Leg Lift model', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose: vi.fn(), getClassLabels: () => ['Neutral', 'Side Leg Lift'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview(false, 'Side Leg Lift')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/side-leg-lift/model.json', '/models/side-leg-lift/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
  })

  it('loads the dedicated Standing Side Bend model', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose: vi.fn(), getClassLabels: () => ['Neutral', 'Standing Side Bend'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview(false, 'Standing Side Bend')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/standing-side-bend/model.json', '/models/standing-side-bend/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
  })

  it('loads the dedicated Side Arm Raise model', async () => {
    const { stream } = createCameraStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    mockLoad.mockResolvedValue({ dispose: vi.fn(), getClassLabels: () => ['Neutral', 'Side Arm Raise'] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const { recognitionStatus } = renderPreview(false, 'Side Arm Raise')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/side-arm-raise/model.json', '/models/side-arm-raise/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
  })
})
