import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'
import type { BPHResult } from '@/types'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

function mockBPHResult(caseId: string): BPHResult {
  return {
    caseId,
    prostateVolumeCc: 58.3,
    bphGrade: '中度 BPH',
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
        bphResult = {
          caseId,
          prostateVolumeCc: data.prostate_volume_cc,
          bphGrade: data.bph_grade,
          riskLevel: data.risk_level,
          color: data.color,
          psaDensity: data.psa_density,
          psaDensityFlag: data.psa_density_flag,
          recommendation: data.recommendation,
          processingTimeMs: data.processing_time_ms,
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
