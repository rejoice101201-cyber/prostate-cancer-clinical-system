import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'
import type { BPHResult } from '@/types'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

function defaultRec(level: number): string {
  const recs: Record<number, string> = {
    1: '建議常規追蹤，每年 PSA 複查。',
    2: '建議 6 個月複查 PSA，必要時安排 MRI。',
    3: '建議安排多參數 MRI（mpMRI）及泌尿科會診。',
    4: '強烈建議 mpMRI + 前列腺穿刺切片（biopsy）。',
  }
  return recs[level] ?? recs[2]
}

function mockBPHResult(caseId: string): BPHResult {
  return {
    caseId,
    prostateVolumeCc: 58.3,
    bphGrade: '中度 BPH',
    bphLevel: 3,
    riskLevel: '中高風險',
    color: 'orange',
    psaDensity: 0.13,
    psaDensityFlag: false,
    recommendation: '建議泌尿科門診評估，考慮 IPSS 問卷與尿流速測定。',
    processingTimeMs: 3800,
    modelType: 'mock',
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const caseId = formData.get('caseId') as string
    const ctFile = formData.get('ct') as File | null

    if (!caseId || !ctFile) {
      return NextResponse.json({ error: 'caseId and ct file are required' }, { status: 400 })
    }

    await connectDB()
    await Case.findByIdAndUpdate(caseId, { status: 'processing' })

    let bphResult: BPHResult

    try {
      const upstream = new FormData()
      upstream.append('case_id', caseId)
      upstream.append('ct_file', ctFile, ctFile.name)

      const psa = formData.get('psa')
      const age = formData.get('age')
      if (psa) upstream.append('psa', psa)
      if (age) upstream.append('age', age)

      const resp = await fetch(`${INFERENCE_API_URL}/infer_ct`, {
        method: 'POST',
        body: upstream,
        signal: AbortSignal.timeout(240_000), // 4 min — CT segmentation is slow
      })

      if (resp.status === 404 || resp.status === 503) {
        console.warn('CT inference endpoint not ready, using mock')
        bphResult = mockBPHResult(caseId)
      } else {
        if (!resp.ok) throw new Error(`Server ${resp.status}`)
        const data = await resp.json()

        // Map bph_level (1–4) to Chinese grade (server Chinese text may be garbled)
        const GRADE_MAP: Record<number, import('@/types').BPHGrade> = {
          1: '正常', 2: '輕度肥大', 3: '中度 BPH', 4: '重度 BPH',
        }
        const RISK_MAP: Record<number, string> = {
          1: '低風險', 2: '中低風險', 3: '中高風險', 4: '高風險',
        }
        const COLOR_MAP: Record<number, BPHResult['color']> = {
          1: 'green', 2: 'yellowgreen', 3: 'orange', 4: 'red',
        }
        const level: number = data.bph_level ?? 2

        bphResult = {
          caseId,
          prostateVolumeCc: data.volume_cc ?? data.prostate_volume_cc ?? 0,
          bphGrade: GRADE_MAP[level] ?? '中度 BPH',
          bphLevel: level,
          riskLevel: RISK_MAP[level] ?? '中高風險',
          color: COLOR_MAP[level] ?? (data.color as BPHResult['color']) ?? 'orange',
          psaDensity: data.psa_density,
          psaDensityFlag: data.psa_density_flag,
          recommendation: data.recommendation?.includes('?') ? defaultRec(level) : data.recommendation,
          processingTimeMs: data.processing_time_ms ?? 0,
          sliceOriginal:     data.slice_original    || undefined,
          sliceDetection:    data.slice_detection   || undefined,
          sliceSegmentation: data.slice_segmentation || undefined,
          modelType: 'nnUNet005_CT',
        }
      }
    } catch (err) {
      console.warn('CT inference failed, using mock:', err)
      bphResult = mockBPHResult(caseId)
    }

    await Case.findByIdAndUpdate(caseId, { status: 'completed', bphResult })
    return NextResponse.json({ success: true, bphResult })
  } catch (err) {
    console.error('CT inference route error:', err)
    return NextResponse.json({ error: 'CT inference failed' }, { status: 500 })
  }
}
