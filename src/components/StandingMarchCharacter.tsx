import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createStandingMarchElderModel } from '../three/createStandingMarchElderModel'

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
  label: string
}

export function StandingMarchCharacter({ label }: StandingMarchCharacterProps) {
  const hostRef = useRef<HTMLDivElement>(null)

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

    const character = createStandingMarchElderModel()
    scene.add(character.root)

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
    const startedAt = performance.now()
    let frame = 0
    let capturePoseSeconds: number | null = null

    window.__IMG2THREEJS_READY__ = true
    window.__IMG2THREEJS_CAPTURE__ = {
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
      setPose: (elapsedSeconds) => {
        capturePoseSeconds = elapsedSeconds
      },
      setBackground: (opaque) => {
        renderer.setClearColor(0xe9edf8, opaque ? 1 : 0)
      },
      getPartManifest: () => {
        const runtime = character.root.userData.sculptRuntime as { nodes?: Record<string, THREE.Object3D> }
        let unnamedMeshes = 0
        character.root.traverse((object) => {
          if (object instanceof THREE.Mesh && !object.name) unnamedMeshes += 1
        })
        return {
          model: character.root.name,
          parts: Object.keys(runtime.nodes ?? {}).map((name) => ({ name, kind: 'part' })),
          unnamedMeshes,
        }
      },
      capturePass: async () => ({ ok: true, selector: '.standing-march-character canvas' }),
    }

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

    const render = () => {
      const elapsedSeconds = capturePoseSeconds ?? (performance.now() - startedAt) / 1000
      character.update(elapsedSeconds, reducedMotion.matches)
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      character.dispose()
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
