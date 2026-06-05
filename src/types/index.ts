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
  riskLevel: string
  color: 'green' | 'yellowgreen' | 'orange' | 'red'
  psaDensity?: number
  psaDensityFlag?: boolean   // true = PSAD > 0.15, possible co-existing cancer
  recommendation: string
  processingTimeMs: number
  modelType?: string
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
