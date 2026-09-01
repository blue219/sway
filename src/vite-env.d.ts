/// <reference types="vite/client" />

import type { CustomPoseNet } from '@teachablemachine/pose'

declare global {
  interface Window {
    tmPose?: {
      load(modelUrl: string, metadataUrl: string): Promise<CustomPoseNet>
    }
  }
}

declare module 'animal-island-ui/style'
