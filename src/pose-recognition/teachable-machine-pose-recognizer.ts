import * as tmPose from '@teachablemachine/pose'
import {
  evaluateArmAboveHead,
  evaluateCrossBodyKneeReach,
  evaluateDoubleArmRaise,
  evaluateFrontalRaise,
  evaluateKneeLiftExtension,
  evaluateLateralRaise,
  evaluateMiniSquat,
  evaluateRowing,
  evaluateSideLegMove,
  evaluateSideToSideFootTap,
  type MovementRuleResult,
} from './movement-rules'
import {
  getMovementMode,
  getTeachableMachineLabels,
  toMovementId,
  toTeachableMachineLabel,
} from './teachable-machine-schema'
import type {
  ExerciseMode,
  MovementId,
  PoseInput,
  PoseRecognitionResult,
  PoseRecognizer,
} from './types'

type TeachableMachineModel = tmPose.CustomPoseNet
type ModelLoader = typeof tmPose.load

export type TeachableMachinePoseRecognizerOptions = {
  confidenceThreshold?: number
  modelBaseUrl?: string
}

const modes: readonly ExerciseMode[] = ['seated', 'standing']

/** Browser implementation backed by the two locally exported TM pose models. */
export class TeachableMachinePoseRecognizer implements PoseRecognizer {
  private readonly confidenceThreshold: number
  private readonly modelBaseUrl: string
  private readonly loadModel: ModelLoader
  private models: Map<ExerciseMode, TeachableMachineModel> | undefined
  private loading: Promise<void> | undefined

  constructor(
    options: TeachableMachinePoseRecognizerOptions = {},
    loadModel: ModelLoader = tmPose.load,
  ) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7
    this.modelBaseUrl = options.modelBaseUrl ?? import.meta.env.BASE_URL
    this.loadModel = loadModel

    if (this.confidenceThreshold < 0 || this.confidenceThreshold > 1) {
      throw new RangeError('confidenceThreshold must be between 0 and 1')
    }
  }

  load(): Promise<void> {
    if (this.models) {
      return Promise.resolve()
    }

    if (!this.loading) {
      this.loading = this.loadModels().catch((cause: unknown) => {
        this.loading = undefined
        throw new Error('Failed to load Teachable Machine pose models', { cause })
      })
    }

    return this.loading
  }

  async predict(
    input: PoseInput,
    targetMovement: MovementId,
  ): Promise<PoseRecognitionResult> {
    const mode = getMovementMode(targetMovement)
    const model = this.models?.get(mode)

    if (!model) {
      throw new Error('Pose recognizer has not been loaded')
    }

    try {
      const { pose, posenetOutput } = await model.estimatePose(input)
      const predictions = await model.predict(posenetOutput)
      const targetLabel = toTeachableMachineLabel(targetMovement)
      const targetPrediction = predictions.find(({ className }) => className === targetLabel)
      const topPrediction = predictions.reduce((highest, prediction) => (
        prediction.probability > highest.probability ? prediction : highest
      ))
      const detectedMovement = toMovementId(topPrediction.className)

      if (!targetPrediction) {
        throw new Error(`Model did not return the expected class: ${targetLabel}`)
      }
      if (!detectedMovement) {
        throw new Error(`Model returned an unknown class: ${topPrediction.className}`)
      }

      let movementRule: MovementRuleResult | undefined
      if (targetMovement === 'mini-squat') {
        movementRule = evaluateMiniSquat(pose)
      } else if (targetMovement === 'side-leg-move') {
        movementRule = evaluateSideLegMove(pose)
      } else if (targetMovement === 'cross-body-knee-reach') {
        movementRule = evaluateCrossBodyKneeReach(pose)
      } else if (targetMovement === 'double-arm-raise') {
        movementRule = evaluateDoubleArmRaise(pose)
      } else if (targetMovement === 'side-to-side-foot-tap') {
        movementRule = evaluateSideToSideFootTap(pose)
      } else if (targetMovement === 'frontal-raise') {
        movementRule = evaluateFrontalRaise(pose)
      } else if (targetMovement === 'knee-lift-extension') {
        movementRule = evaluateKneeLiftExtension(pose)
      } else if (targetMovement === 'lateral-raise') {
        movementRule = evaluateLateralRaise(pose)
      } else if (targetMovement === 'arm-above-head') {
        movementRule = evaluateArmAboveHead(pose)
      } else if (targetMovement === 'rowing') {
        movementRule = evaluateRowing(pose)
      }

      return {
        targetMovement,
        targetConfidence: targetPrediction.probability,
        detectedMovement,
        detectedConfidence: topPrediction.probability,
        isMatching: movementRule?.isMatching
          ?? targetPrediction.probability > this.confidenceThreshold,
        measurement: movementRule?.measurement,
        timestamp: performance.now(),
      }
    } catch (cause) {
      throw new Error(`Failed to predict movement: ${targetMovement}`, { cause })
    }
  }

  private async loadModels(): Promise<void> {
    const loadedModels = await Promise.all(
      modes.map(async (mode) => {
        const modelUrl = this.resolveModelUrl(mode, 'model.json')
        const metadataUrl = this.resolveModelUrl(mode, 'metadata.json')
        const model = await this.loadModel(modelUrl, metadataUrl)
        this.validateLabels(mode, model.getClassLabels())
        return [mode, model] as const
      }),
    )

    this.models = new Map(loadedModels)
  }

  private resolveModelUrl(mode: ExerciseMode, fileName: string): string {
    const baseUrl = this.modelBaseUrl.endsWith('/') ? this.modelBaseUrl : `${this.modelBaseUrl}/`
    return `${baseUrl}models/${mode}/${fileName}`
  }

  private validateLabels(mode: ExerciseMode, actualLabels: readonly string[]): void {
    const missingLabels = getTeachableMachineLabels(mode).filter(
      (expectedLabel) => !actualLabels.includes(expectedLabel),
    )

    if (missingLabels.length > 0) {
      throw new Error(`${mode} model is missing labels: ${missingLabels.join(', ')}`)
    }
  }
}
