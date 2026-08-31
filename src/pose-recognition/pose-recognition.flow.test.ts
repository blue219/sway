import { createServer, type Server } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import * as tf from '@tensorflow/tfjs'
import { PNG } from 'pngjs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TeachableMachinePoseRecognizer } from './teachable-machine-pose-recognizer'
import type { MovementId } from './types'

const projectRoot = process.cwd()
const publicDirectory = resolve(projectRoot, 'public')
const imageDirectory = resolve(projectRoot, 'src/pose-recognition/test-images')
const validMovementIds = new Set<MovementId>([
  'side-leg-move',
  'mini-squat',
  'cross-body-knee-reach',
  'double-arm-raise',
  'side-to-side-foot-tap',
  'frontal-raise',
  'knee-lift-extension',
  'lateral-raise',
  'arm-above-head',
  'rowing',
])

type ImageExpectation = 'correct' | 'incorrect' | 'none'
type FlowCase = {
  expectation: ImageExpectation
  fileName: string
  filePath: string
  targetMovement: MovementId
}

async function discoverCases(): Promise<FlowCase[]> {
  const expectations: ImageExpectation[] = ['correct', 'incorrect', 'none']
  const cases: FlowCase[] = []

  for (const expectation of expectations) {
    const directory = resolve(imageDirectory, expectation)
    const fileNames = (await readdir(directory)).filter(
      (fileName) => extname(fileName).toLowerCase() === '.png',
    )

    for (const fileName of fileNames) {
      const movementId = fileName.split('--', 1)[0] as MovementId
      if (!validMovementIds.has(movementId)) {
        throw new Error(
          `Invalid test image name "${fileName}": prefix must be a supported MovementId followed by "--"`,
        )
      }

      cases.push({
        expectation,
        fileName,
        filePath: resolve(directory, fileName),
        targetMovement: movementId,
      })
    }
  }

  return cases
}

function createPublicFileServer(): Server {
  return createServer((request, response) => {
    void (async () => {
      try {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const requestedFile = resolve(publicDirectory, decodeURIComponent(pathname).replace(/^\/+/, ''))

        if (!requestedFile.startsWith(`${publicDirectory}${sep}`)) {
          response.writeHead(403).end()
          return
        }

        const body = await readFile(requestedFile)
        const contentType = extname(requestedFile) === '.json'
          ? 'application/json'
          : 'application/octet-stream'
        response.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': contentType,
        })
        response.end(body)
      } catch {
        response.writeHead(404).end()
      }
    })()
  })
}

function listen(server: Server): Promise<string> {
  return new Promise((resolveAddress, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Could not determine the test model server address'))
        return
      }
      resolveAddress(`http://127.0.0.1:${address.port}/`)
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose())
  })
}

async function readPngAsImageData(filePath: string): Promise<ImageData> {
  const png = PNG.sync.read(await readFile(filePath))

  // TensorFlow.js accepts this ImageData-compatible pixel object directly.
  return {
    data: new Uint8Array(png.data),
    width: png.width,
    height: png.height,
  } as unknown as ImageData
}

const flowCases = await discoverCases()

describe('pose recognition with real image flows', () => {
  let server: Server | undefined
  let recognizer: TeachableMachinePoseRecognizer | undefined

  beforeAll(async () => {
    if (flowCases.length === 0) {
      return
    }

    await tf.setBackend('cpu')
    await tf.ready()
    server = createPublicFileServer()
    const modelBaseUrl = await listen(server)
    recognizer = new TeachableMachinePoseRecognizer({ modelBaseUrl })
    await recognizer.load()
  }, 120_000)

  afterAll(async () => {
    if (server?.listening) {
      await close(server)
    }
  })

  if (flowCases.length === 0) {
    it.skip('runs after PNG fixtures are added under test-images/{correct,incorrect,none}')
  }

  for (const flowCase of flowCases) {
    it(`${flowCase.expectation}: ${flowCase.fileName}`, async () => {
      const input = await readPngAsImageData(flowCase.filePath)
      const result = await recognizer?.predict(input, flowCase.targetMovement)
      const expectedMatch = flowCase.expectation === 'correct'

      expect(
        result?.isMatching,
        result
          ? `${flowCase.fileName}: target ${flowCase.targetMovement}=${result.targetConfidence}; detected ${result.detectedMovement}=${result.detectedConfidence}; measurement=${JSON.stringify(result.measurement)}`
          : `${flowCase.fileName}: no result`,
      ).toBe(expectedMatch)
    }, 30_000)
  }
})
