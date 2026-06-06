import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'
import type { BPHResult } from '@/types'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

const GRADE_MAP: Record<number, string> = { 1: '正常', 2: '輕度肥大', 3: '中度 BPH', 4: '重度 BPH' }
const RISK_MAP:  Record<number, string> = { 1: '低風險', 2: '中低風險', 3: '中高風險', 4: '高風險' }
const COLOR_MAP: Record<number, BPHResult['color']> = { 1: 'green', 2: 'yellowgreen', 3: 'orange', 4: 'red' }
const REC_MAP:   Record<number, string> = {
  1: '建議常規追蹤，每年 PSA 複查。',
  2: '建議 6 個月複查 PSA，必要時安排 MRI。',
  3: '建議泌尿科門診評估，考慮藥物治療（α-blocker / 5-ARI）。',
  4: '強烈建議泌尿科手術評估（TURP / 雷射手術）。',
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const resp = await fetch(`${INFERENCE_API_URL}/predict_demo_ct/${caseId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(180_000),
    })
    if (!resp.ok) throw new Error(`Server ${resp.status}`)
    const data = await resp.json()

    const level: number = data.bph_level ?? 3
    const result: BPHResult = {
      caseId,
      prostateVolumeCc:  data.volume_cc ?? 0,
      bphGrade:          (GRADE_MAP[level] ?? '中度 BPH') as any,
      bphLevel:          level,
      riskLevel:         RISK_MAP[level] ?? '中高風險',
      color:             COLOR_MAP[level] ?? 'orange',
      recommendation:    data.recommendation?.includes('?') ? REC_MAP[level] : (data.recommendation ?? REC_MAP[level]),
      processingTimeMs:  data.processing_time_ms ?? 0,
      modelType:         'nnUNet005_CT',
      sliceOriginal:     data.slice_original     || undefined,
      sliceDetection:    data.slice_detection    || undefined,
      sliceSegmentation: data.slice_segmentation || undefined,
    }
    // Save to MongoDB so it appears in 歷史病例
    try {
      await connectDB()
      await Case.create({
        patientId:   `DEMO-CT-${caseId}`,
        patientName: 'Demo',
        age:         0,
        studyDate:   new Date().toISOString().slice(0, 10),
        modality:    'ct',
        status:      'completed',
        bphResult:   result,
      })
    } catch (dbErr) {
      console.warn('Demo CT DB save failed:', dbErr)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('predict_demo_ct error:', err)
    return NextResponse.json({ error: `Inference failed: ${err}` }, { status: 500 })
  }
}
