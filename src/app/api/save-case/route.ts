/**
 * /api/save-case
 * Lightweight endpoint: receives inference result from direct server upload
 * and saves it to MongoDB.  Returns the created case's _id so the frontend
 * can navigate to /results/{id}.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'

const GRADE_MAP: Record<number, string> = { 1: '正常', 2: '輕度肥大', 3: '中度 BPH', 4: '重度 BPH' }
const COLOR_MAP: Record<number, string> = { 1: 'green', 2: 'yellowgreen', 3: 'orange', 4: 'red' }
const REC_MAP:   Record<number, string> = {
  1: '建議常規追蹤，每年 PSA 複查。',
  2: '建議 6 個月複查 PSA，必要時安排 MRI。',
  3: '建議泌尿科門診評估，考慮藥物治療（α-blocker / 5-ARI）。',
  4: '強烈建議泌尿科手術評估（TURP / 雷射手術）。',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await connectDB()

    const modality: 'ct' | 'mri' = body.modality ?? 'mri'

    let caseData: Record<string, unknown>

    if (modality === 'ct') {
      // CT: server returns volume_cc, bph_level, recommendation, slices
      const level: number = body.bph_level ?? body.bphLevel ?? 3
      caseData = {
        patientId:   body.patientId   ?? `CT-${Date.now()}`,
        patientName: body.patientName ?? '本地上傳',
        age:         body.age         ?? 0,
        studyDate:   new Date().toISOString().slice(0, 10),
        modality:    'ct',
        status:      'completed',
        bphResult: {
          caseId:             body.case_id ?? 'local',
          prostateVolumeCc:   body.volume_cc ?? 0,
          bphGrade:           body.bph_grade ?? GRADE_MAP[level] ?? '中度 BPH',
          bphLevel:           level,
          riskLevel:          body.risk_level ?? '中高風險',
          color:              body.color ?? COLOR_MAP[level] ?? 'orange',
          recommendation:     body.recommendation?.includes('?') ? REC_MAP[level] : (body.recommendation ?? REC_MAP[level]),
          processingTimeMs:   body.processing_time_ms ?? 0,
          modelType:          'nnUNet005_CT',
          sliceOriginal:      body.slice_original     || undefined,
          sliceDetection:     body.slice_detection    || undefined,
          sliceSegmentation:  body.slice_segmentation || undefined,
        },
      }
    } else {
      // MRI: server returns piradsScore, riskScore, findings, slices etc.
      caseData = {
        patientId:   body.patientId   ?? `MRI-${Date.now()}`,
        patientName: body.patientName ?? '本地上傳',
        age:         body.age         ?? 0,
        studyDate:   new Date().toISOString().slice(0, 10),
        modality:    'mri',
        status:      'completed',
        result: {
          caseId:             body.caseId ?? body.case_id ?? 'local',
          piradsScore:        body.piradsScore ?? body.pirads_score ?? 3,
          suspiciousRegions:  body.suspiciousRegions  ?? [],
          segmentationSlices: body.segmentationSlices ?? [],
          prostateVolumeMl:   body.prostateVolumeMl   ?? body.prostate_volume_ml ?? 0,
          findings:           body.findings     ?? '',
          recommendation:     body.recommendation ?? '',
          processingTimeMs:   body.processingTimeMs ?? body.processing_time_ms ?? 0,
          modelType:          body.modelType    ?? body.model_type,
          riskScore:          body.riskScore    ?? body.risk_score,
          riskLevel:          body.riskLevel    ?? body.risk_level,
          sliceOriginal:      body.sliceOriginal     || undefined,
          sliceDetection:     body.sliceDetection    || undefined,
          sliceSegmentation:  body.sliceSegmentation || undefined,
        },
      }
    }

    const created = await Case.create(caseData)
    return NextResponse.json({ id: created._id.toString(), ok: true })
  } catch (err) {
    console.error('save-case error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
