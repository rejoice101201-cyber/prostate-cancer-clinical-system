import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const resp = await fetch(`${INFERENCE_API_URL}/predict_demo_mri/${caseId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(180_000),
    })
    if (!resp.ok) throw new Error(`Server ${resp.status}`)
    const data = await resp.json()

    // Save to MongoDB so it appears in 歷史病例
    try {
      await connectDB()
      await Case.create({
        patientId:   `DEMO-MRI-${caseId}`,
        patientName: 'Demo',
        age:         0,
        studyDate:   new Date().toISOString().slice(0, 10),
        modality:    'mri',
        status:      'completed',
        result: {
          caseId,
          piradsScore:       data.piradsScore       ?? data.pirads_score ?? 3,
          suspiciousRegions: data.suspiciousRegions  ?? [],
          segmentationSlices:data.segmentationSlices ?? [],
          prostateVolumeMl:  data.prostateVolumeMl   ?? data.prostate_volume_ml ?? 0,
          findings:          data.findings           ?? '',
          recommendation:    data.recommendation     ?? '',
          processingTimeMs:  data.processingTimeMs   ?? data.processing_time_ms ?? 0,
          modelType:         data.modelType          ?? data.model_type,
          riskScore:         data.riskScore          ?? data.risk_score,
        },
      })
    } catch (dbErr) {
      console.warn('Demo MRI DB save failed:', dbErr)
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: `Inference failed: ${err}` }, { status: 500 })
  }
}
