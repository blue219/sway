import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuizCameraPreview } from './QuizCameraPreview'

const loadModel = vi.fn()

function cameraStream() {
  const track = {
    readyState: 'live',
    enabled: true,
    muted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    stop: vi.fn(),
  }
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  })
  return track
}

afterEach(() => {
  cleanup()
  loadModel.mockReset()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('QuizCameraPreview', () => {
  it('starts loading the quiz model while camera permission is pending', async () => {
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => undefined))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const loadModel = vi.fn(() => new Promise<never>(() => undefined))
    window.tmPose = { load: loadModel }

    render(<QuizCameraPreview isActive onChoice={vi.fn()} questionKey={1} waitForIdle={false} />)

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce())
    await waitFor(() => expect(loadModel).toHaveBeenCalledWith('/models/quiz/model.json', '/models/quiz/metadata.json'))
  })
  it('loads the quiz model, uses the mirrored 257px crop, and chooses A after a two-second hold', async () => {
    const track = cameraStream()
    const dispose = vi.fn()
    const disposeClassifier = vi.fn()
    const onChoice = vi.fn()
    const estimatePose = vi.fn().mockResolvedValue({ posenetOutput: {} })
    let frameTime = 0
    let frameCallback: FrameRequestCallback | undefined
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as ReturnType<HTMLCanvasElement['getContext']>)
    vi.spyOn(performance, 'now').mockImplementation(() => frameTime)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 12
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    loadModel.mockResolvedValue({
      dispose,
      model: { dispose: disposeClassifier },
      estimatePose,
      getClassLabels: () => ['Idle', 'Option A', 'Option B'],
      predict: vi.fn().mockImplementation(() => Promise.resolve([
        { className: 'Idle', probability: frameTime < 600 ? 0.98 : 0.02 },
        { className: 'Option A', probability: frameTime < 600 ? 0.01 : 0.96 },
        { className: 'Option B', probability: 0.02 },
      ])),
    })
    window.tmPose = { load: loadModel }

    const { unmount } = render(<QuizCameraPreview isActive onChoice={onChoice} questionKey={1} waitForIdle={false} />)
    const video = screen.getByLabelText('Live quiz camera preview') as HTMLVideoElement
    await waitFor(() => expect(video.srcObject).not.toBeNull())
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoHeight: { configurable: true, value: 480 },
      videoWidth: { configurable: true, value: 640 },
    })
    fireEvent.playing(video)
    await waitFor(() => expect(loadModel).toHaveBeenCalledWith('/models/quiz/model.json', '/models/quiz/metadata.json'))
    await waitFor(() => expect(frameCallback).toBeDefined())
    expect(screen.queryByText('Raise your left hand for A or right hand for B.')).not.toBeInTheDocument()
    const cameraCard = screen.getByRole('region', { name: 'Quiz camera preview' })
    expect(cameraCard).toHaveClass('movement-camera-card')
    expect(cameraCard.querySelector('.movement-camera-heading')).toBeInTheDocument()
    expect(cameraCard.querySelector('.camera-preview-panel .camera-preview-area > video')).toBe(video)
    expect(cameraCard.querySelector('.quiz-camera-status, .quiz-camera-overlay, progress')).toBeNull()

    for (frameTime = 0; frameTime <= 2_600; frameTime += 100) {
      await act(async () => {
        frameCallback?.(frameTime)
      })
    }

    expect(onChoice).toHaveBeenCalledOnce()
    expect(onChoice).toHaveBeenCalledWith('A')
    expect(screen.getByText('2.0/2 S')).toBeInTheDocument()
    const inferenceFrame = estimatePose.mock.calls[0][0]
    expect(inferenceFrame).toMatchObject({ width: 257, height: 257 })
    expect(context.translate).toHaveBeenCalledWith(257, 0)
    expect(context.scale).toHaveBeenCalledWith(-1, 1)
    expect(context.drawImage).toHaveBeenCalledWith(video, 80, 0, 480, 480, 0, 0, 257, 257)

    unmount()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
    expect(disposeClassifier).toHaveBeenCalledOnce()
  })

  it('rejects unexpected labels and leaves on-screen choice available', async () => {
    cameraStream()
    const dispose = vi.fn()
    loadModel.mockResolvedValue({ dispose, getClassLabels: () => ['Idle', 'Option A'] })
    window.tmPose = { load: loadModel }
    render(<QuizCameraPreview isActive onChoice={vi.fn()} questionKey={1} waitForIdle={false} />)
    const video = screen.getByLabelText('Live quiz camera preview')
    await waitFor(() => expect((video as HTMLVideoElement).srcObject).not.toBeNull())
    fireEvent.playing(video)
    expect(await screen.findByText('Quiz gesture model is invalid. Choose A or B on screen.')).toBeInTheDocument()
    expect(dispose).toHaveBeenCalledOnce()
  })
})
