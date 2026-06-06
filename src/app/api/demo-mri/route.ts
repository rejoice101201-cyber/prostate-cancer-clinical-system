import { NextResponse } from 'next/server'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

export async function GET() {
  try {
    const resp = await fetch(`${INFERENCE_API_URL}/demo_mri_cases`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (!resp.ok) throw new Error(`Server ${resp.status}`)
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('demo_mri_cases error:', err)
    return NextResponse.json(MOCK_MRI_CASES)
  }
}

// Mock cases while server endpoint is being built
const MOCK_MRI_CASES = [
  { case_id: 'picai_10000_1000000', display_id: 'MRI 案例 001', pirads: 2, risk_score: 0.12, label: 0, psa: 4.2 },
  { case_id: 'picai_10003_1000003', display_id: 'MRI 案例 002', pirads: 3, risk_score: 0.38, label: 0, psa: 6.5 },
  { case_id: 'picai_10004_1000004', display_id: 'MRI 案例 003', pirads: 4, risk_score: 0.65, label: 1, psa: 8.9 },
  { case_id: 'picai_10015_1000015', display_id: 'MRI 案例 004', pirads: 4, risk_score: 0.71, label: 1, psa: 10.2 },
  { case_id: 'picai_10019_1000019', display_id: 'MRI 案例 005', pirads: 5, risk_score: 0.88, label: 1, psa: 15.3 },
  { case_id: 'picai_10100_1000100', display_id: 'MRI 案例 006', pirads: 1, risk_score: 0.05, label: 0, psa: 2.1 },
]
