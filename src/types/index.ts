export type PIRADSScore = 1 | 2 | 3 | 4 | 5
export type ModalityMode = 'mri' | 'ct'
export type BPHGrade = '正常' | '輕度肥大' | '中度 BPH' | '重度 BPH'

export interface SuspiciousRegion {
  id: string
  x: number
  y: number
  z: number
  volumeMl: number
  confidence: number
  pirads: PIRADSScore
}

export interface InferenceResult {
  caseId: string
  piradsScore: PIRADSScore
  suspiciousRegions: SuspiciousRegion[]
  segmentationSlices: string[]
  prostateVolumeMl: number
  psaDensity?: number
  findings: string
  recommendation: string
  processingTimeMs: number
  // DL / Radiomics metadata
  modelType?: 'DL_SwinUNETR_mpMRI' | 'DL_ResNet3D' | 'radiomics_fallback' | 'mock'
  riskScore?: number   // raw 0–1 from radiomics fallback
  riskLevel?: string
}

// CT BPH result from /infer_ct
export interface BPHResult {
  caseId: string
  prostateVolumeCc: number
  bphGrade: BPHGrade
  bphLevel: number           // 1–4 numeric level from server
  riskLevel: string
  color: 'green' | 'yellowgreen' | 'orange' | 'red'
  psaDensity?: number
  psaDensityFlag?: boolean
  recommendation: string
  processingTimeMs: number
  modelType?: string
  // Visualization slices (base64 PNG)
  sliceOriginal?: string
  sliceDetection?: string
  sliceSegmentation?: string
}

export interface PatientCase {
  _id?: string
  patientId: string
  patientName: string
  age: number
  psa?: number
  studyDate: string
  modality: ModalityMode        // 'mri' | 'ct'
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: InferenceResult      // MRI result
  bphResult?: BPHResult         // CT result
  createdAt: string
  updatedAt: string
}

export interface MRIUploadState {
  t2w: File | null
  adc: File | null
  hbv: File | null
  patientId: string
  patientName: string
  age: string
  psa: string
  studyDate: string
}

export interface CTUploadState {
  ct: File | null
  patientId: string
  patientName: string
  age: string
  psa: string
  studyDate: string
}
