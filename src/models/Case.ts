import mongoose, { Schema } from 'mongoose'
import type { PatientCase } from '@/types'

const SuspiciousRegionSchema = new Schema({
  id: String,
  x: Number,
  y: Number,
  z: Number,
  volumeMl: Number,
  confidence: Number,
  pirads: Number,
}, { _id: false })

const InferenceResultSchema = new Schema({
  caseId: String,
  piradsScore: Number,
  suspiciousRegions: [SuspiciousRegionSchema],
  segmentationSlices: [String],
  prostateVolumeMl: Number,
  psaDensity: Number,
  findings: String,
  recommendation: String,
  processingTimeMs: Number,
}, { _id: false })

const BPHResultSchema = new Schema({
  caseId: String,
  prostateVolumeCc: Number,
  bphGrade: String,
  bphLevel: Number,
  riskLevel: String,
  color: String,
  psaDensity: Number,
  psaDensityFlag: Boolean,
  recommendation: String,
  processingTimeMs: Number,
  modelType: String,
  // Visualization slices (base64 PNG from server)
  sliceOriginal:     String,
  sliceDetection:    String,
  sliceSegmentation: String,
}, { _id: false })

const CaseSchema = new Schema<PatientCase>({
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  psa: Number,
  studyDate: { type: String, required: true },
  modality: { type: String, enum: ['mri', 'ct'], default: 'mri' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'error'], default: 'pending' },
  result: InferenceResultSchema,       // MRI cancer result
  bphResult: BPHResultSchema,          // CT BPH result
}, { timestamps: true })

export default mongoose.models.Case || mongoose.model<PatientCase>('Case', CaseSchema)
