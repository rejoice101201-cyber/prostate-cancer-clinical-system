import { NextRequest, NextResponse } from 'next/server'

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
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: `Inference failed: ${err}` }, { status: 500 })
  }
}
