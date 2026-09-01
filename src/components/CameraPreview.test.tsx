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
  const view = render(
    <CameraPreview
      isTracking={isTracking}
      movementLabel={movementLabel}
      onRecognitionStatusChange={recognitionStatus}
      onComplete={completion}
      onActiveDurationChange={activeDuration}
    />,
  )

  return { recognitionStatus, completion, activeDuration, ...view }
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

    const { recognitionStatus, unmount } = renderPreview(true, 'Standing March')
    const video = screen.getByLabelText('Live camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).toBe(stream))
    Object.defineProperty(video, 'requestVideoFrameCallback', { configurable: true, value: undefined })
    fireEvent.playing(video)

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('/models/pose/model.json', '/models/pose/metadata.json'))
    await waitFor(() => expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'ready' }))
    await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalledOnce())
    expect(screen.getByText('Start Standing March. 0.0/5.0 seconds recognised.')).toBeInTheDocument()

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

    expect(await screen.findByText('Pose model files could not be loaded.')).toBeInTheDocument()
    expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'unavailable', message: 'Pose model files could not be loaded.' })
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

    expect(await screen.findByText('Pose model does not support this movement.')).toBeInTheDocument()
    expect(recognitionStatus).toHaveBeenLastCalledWith({ kind: 'unavailable', message: 'Pose model does not support this movement.' })
    expect(dispose).toHaveBeenCalledOnce()
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
