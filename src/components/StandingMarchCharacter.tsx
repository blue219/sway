import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const CHARACTER_MODEL_URL = '/assets/character.glb'
const CHARACTER_HEIGHT = 5.4
const STANDING_MARCH_ANIMATION = 'StandingMarch_HighKnee'

declare global {
  interface Window {
    __IMG2THREEJS_READY__?: boolean
    __IMG2THREEJS_CAPTURE__?: {
      setCamera: (cameraSpec: { azimuth?: number; elevation?: number; distance?: number }) => void
      setPose: (elapsedSeconds: number | null) => void
      setBackground: (opaque: boolean) => void
      getPartManifest: () => { model: string; parts: Array<{ name: string; kind: string }>; unnamedMeshes: number }
      capturePass: () => Promise<{ ok: true; selector: string }>
    }
  }
}

type StandingMarchCharacterProps = {
  isPaused: boolean
  label: string
}

export function StandingMarchCharacter({ isPaused, label }: StandingMarchCharacterProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(isPaused)

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof window.WebGLRenderingContext === 'undefined') return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40)
    camera.position.set(0, 2.65, 12.5)
    camera.lookAt(0, 2.65, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    host.append(renderer.domElement)

    const characterRoot = new THREE.Group()
    characterRoot.name = 'standing-march-character'
    scene.add(characterRoot)

    const hemisphere = new THREE.HemisphereLight(0xfffaf0, 0x6f7c6d, 1.85)
    scene.add(hemisphere)

    const key = new THREE.DirectionalLight(0xfff3df, 2.5)
    key.position.set(-4, 8, 7)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -4
    key.shadow.camera.right = 4
    key.shadow.camera.top = 7
    key.shadow.camera.bottom = -1
    scene.add(key)

    const rim = new THREE.DirectionalLight(0xe7efff, 1.35)
    rim.position.set(5, 5, -5)
    scene.add(rim)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShadowMaterial({ color: 0x536963, opacity: 0.16 }))
    ground.name = 'contact-shadow-ground'
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.145
    ground.receiveShadow = true
    scene.add(ground)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = new THREE.Timer()
    timer.connect(document)
    let frame = 0
    let disposed = false
    let mixer: THREE.AnimationMixer | null = null
    let marchAction: THREE.AnimationAction | null = null
    let marchClip: THREE.AnimationClip | null = null
    let hasFixedCapturePose = false
    let idleRotation = 0

    const setPose = (elapsedSeconds: number | null) => {
      if (!mixer || !marchAction || !marchClip) return

      if (elapsedSeconds === null) {
        hasFixedCapturePose = false
        timer.reset()
        return
      }

      hasFixedCapturePose = true
      idleRotation = 0
      characterRoot.rotation.y = 0
      const loopTime = ((elapsedSeconds % marchClip.duration) + marchClip.duration) % marchClip.duration
      mixer.setTime(loopTime)
    }

    const handleReducedMotionChange = () => {
      if (reducedMotion.matches) mixer?.setTime(0)
      timer.reset()
    }
    reducedMotion.addEventListener('change', handleReducedMotionChange)

    new GLTFLoader().load(
      CHARACTER_MODEL_URL,
      ({ animations, scene: model }) => {
        if (disposed) {
          disposeModel(model)
          return
        }

        // Normalize the supplied model so asset dimensions do not affect the established framing.
        const bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())
        const scale = CHARACTER_HEIGHT / size.y
        model.scale.setScalar(scale)
        model.position.set(-center.x * scale, -bounds.min.y * scale - 0.145, -center.z * scale)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
          }
        })
        characterRoot.add(model)

        marchClip = THREE.AnimationClip.findByName(animations, STANDING_MARCH_ANIMATION) ?? null
        if (marchClip) {
          mixer = new THREE.AnimationMixer(model)
          marchAction = mixer.clipAction(marchClip)
          marchAction.setLoop(THREE.LoopRepeat, Infinity)
          marchAction.play()
          if (reducedMotion.matches) mixer.setTime(0)
        } else {
          console.error(`Standing march animation "${STANDING_MARCH_ANIMATION}" was not found in ${CHARACTER_MODEL_URL}.`)
        }

        window.__IMG2THREEJS_READY__ = true
        window.__IMG2THREEJS_CAPTURE__ = createCaptureApi(camera, renderer, characterRoot, setPose)
      },
      undefined,
      (error) => console.error('Failed to load the standing march character model.', error),
    )

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const render = (timestamp: number) => {
      timer.update(timestamp)
      const deltaSeconds = Math.min(timer.getDelta(), 0.1)
      if (mixer && !isPausedRef.current && !reducedMotion.matches && !hasFixedCapturePose) {
        mixer.update(deltaSeconds)
      }
      if (!isPausedRef.current && !reducedMotion.matches && !hasFixedCapturePose) {
        idleRotation = Math.sin(timestamp / 1800) * 0.015
      }
      characterRoot.rotation.y = reducedMotion.matches ? 0 : idleRotation
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }
    frame = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      reducedMotion.removeEventListener('change', handleReducedMotionChange)
      timer.dispose()
      mixer?.stopAllAction()
      const animatedModel = characterRoot.children[0]
      if (animatedModel) mixer?.uncacheRoot(animatedModel)
      disposeModel(characterRoot)
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
      delete window.__IMG2THREEJS_READY__
      delete window.__IMG2THREEJS_CAPTURE__
    }
  }, [])

  return <div ref={hostRef} aria-label={label} className="standing-march-character" role="img" />
}

function createCaptureApi(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  characterRoot: THREE.Group,
  setPose: (elapsedSeconds: number | null) => void,
) {
  return {
    setCamera: ({ azimuth = 0, elevation = 0, distance = 12.5 }) => {
      const azimuthRadians = THREE.MathUtils.degToRad(azimuth)
      const elevationRadians = THREE.MathUtils.degToRad(elevation)
      const target = new THREE.Vector3(0, 2.65, 0)
      camera.position.set(
        Math.sin(azimuthRadians) * Math.cos(elevationRadians) * distance,
        target.y + Math.sin(elevationRadians) * distance,
        Math.cos(azimuthRadians) * Math.cos(elevationRadians) * distance,
      )
      camera.lookAt(target)
      camera.updateProjectionMatrix()
    },
    setPose,
    setBackground: (opaque: boolean) => renderer.setClearColor(0xe9edf8, opaque ? 1 : 0),
    getPartManifest: () => {
      const parts: Array<{ name: string; kind: string }> = []
      let unnamedMeshes = 0
      characterRoot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        if (object.name) parts.push({ name: object.name, kind: 'mesh' })
        else unnamedMeshes += 1
      })
      return { model: characterRoot.name, parts, unnamedMeshes }
    },
    capturePass: async () => ({ ok: true as const, selector: '.standing-march-character canvas' }),
  }
}

function disposeModel(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose()
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      material.dispose()
    })
  })
}
