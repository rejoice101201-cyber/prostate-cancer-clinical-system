import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'
import type { InferenceResult } from '@/types'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

// Mock result — used when DL model is still training or server unreachable
function mockInferenceResult(caseId: string): InferenceResult {
  return {
    caseId,
    piradsScore: 4,
    suspiciousRegions: [
      { id: 'r1', x: 45, y: 62, z: 18, volumeMl: 1.2, confidence: 0.87, pirads: 4 },
      { id: 'r2', x: 38, y: 55, z: 22, volumeMl: 0.4, confidence: 0.61, pirads: 3 },
    ],
    segmentationSlices: [],
    prostateVolumeMl: 38.5,
    psaDensity: undefined,
    findings: 'A 1.2 mL T2-hypointense lesion with restricted diffusion (ADC low) in the left peripheral zone at mid-gland (PI-RADS 4). A smaller 0.4 mL indeterminate focus in the right transition zone (PI-RADS 3). Prostate volume: 38.5 mL.',
    recommendation: 'PI-RADS 4 lesion warrants targeted biopsy. Urology referral recommended.',
    processingTimeMs: 4200,
    modelType: 'mock',
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const caseId  = formData.get('caseId')  as string
    const t2wFile = formData.get('t2w')     as File | null
    const adcFile = formData.get('adc')     as File | null
    const hbvFile = formData.get('hbv')     as File | null

    if (!caseId || !t2wFile) {
      return NextResponse.json({ error: 'caseId and t2w file are required' }, { status: 400 })
    }

    await connectDB()
    await Case.findByIdAndUpdate(caseId, { status: 'processing' })

    let result: InferenceResult

    try {
      const upstream = new FormData()
      upstream.append('case_id', caseId)
      upstream.append('t2w', t2wFile, t2wFile.name)
      if (adcFile) upstream.append('adc', adcFile, adcFile.name)
      if (hbvFile) upstream.append('hbv', hbvFile, hbvFile.name)

      // First try DL endpoint; fall back to Radiomics endpoint if DL not ready
      let resp = await fetch(`${INFERENCE_API_URL}/infer_mri`, {
        method: 'POST',
        body: upstream,
        signal: AbortSignal.timeout(180_000), // 3 min — DL inference is slower
      })

      if (resp.status === 404 || resp.status === 503) {
        // DL model not ready yet — fall back to radiomics /predict endpoint
        console.warn('DL endpoint not ready, falling back to radiomics')
        const fallback = new FormData()
        fallback.append('case_id', caseId)
        fallback.append('t2w', t2wFile, t2wFile.name)
        resp = await fetch(`${INFERENCE_API_URL}/predict`, {
          method: 'POST',
          body: fallback,
          signal: AbortSignal.timeout(120_000),
        })
      }

      if (!resp.ok) throw new Error(`Server ${resp.status}: ${await resp.text()}`)
      const data = await resp.json()

      // Normalise server response → InferenceResult shape
      result = normaliseServerResponse(caseId, data)
    } catch (inferErr) {
      console.warn('Inference server unavailable, using mock:', inferErr)
      result = mockInferenceResult(caseId)
    }

    await Case.findByIdAndUpdate(caseId, { status: 'completed', result })
    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error('Inference route error:', err)
    return NextResponse.json({ error: 'Inference failed' }, { status: 500 })
  }
}

/** Map either DL or Radiomics server response to InferenceResult */
function normaliseServerResponse(caseId: string, data: any): InferenceResult {
  // DL response has piradsScore; Radiomics response has risk_score / risk_level
  if (data.piradsScore !== undefined) {
    return { ...data, caseId }
  }
  // Radiomics fallback
  const score: number = data.risk_score ?? 0
  const pirads = score >= 0.75 ? 5 : score >= 0.50 ? 4 : score >= 0.25 ? 3 : 2
  return {
    caseId,
    piradsScore: pirads as any,
    suspiciousRegions: [],
    segmentationSlices: [],
    prostateVolumeMl: 0,
    psaDensity: undefined,
    findings: data.recommendation ?? '',
    recommendation: data.recommendation ?? '',
    processingTimeMs: 0,
    modelType: 'radiomics_fallback',
    riskScore: score,
    riskLevel: data.risk_level,
  }
}
