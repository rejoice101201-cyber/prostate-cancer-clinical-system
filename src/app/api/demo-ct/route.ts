import { NextResponse } from 'next/server'

const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'http://140.112.183.111:8000'

export async function GET() {
  try {
    const resp = await fetch(`${INFERENCE_API_URL}/demo_ct_cases`, {
      signal: AbortSignal.timeout(60_000),
    })
    if (!resp.ok) throw new Error(`Server ${resp.status}`)
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('demo_ct_cases error:', err)
    // Return mock demo cases if server unavailable
    return NextResponse.json(MOCK_CT_CASES)
  }
}

const MOCK_CT_CASES = [
  { case_id: 'AEC017', display_id: 'CT 案例 017', volume_cc: 28.3, bph_grade: '正常',     bph_level: 1, color: 'green',       predicted: false },
  { case_id: 'AEC075', display_id: 'CT 案例 075', volume_cc: 35.1, bph_grade: '輕度肥大', bph_level: 2, color: 'yellowgreen', predicted: false },
  { case_id: 'AEC005', display_id: 'CT 案例 005', volume_cc: 61.4, bph_grade: '中度 BPH', bph_level: 3, color: 'orange',      predicted: false },
  { case_id: 'AEC014', display_id: 'CT 案例 014', volume_cc: 72.5, bph_grade: '中度 BPH', bph_level: 3, color: 'orange',      predicted: false },
  { case_id: 'AEC026', display_id: 'CT 案例 026', volume_cc: 88.2, bph_grade: '重度 BPH', bph_level: 4, color: 'red',         predicted: false },
  { case_id: 'AEC053', display_id: 'CT 案例 053', volume_cc: 95.7, bph_grade: '重度 BPH', bph_level: 4, color: 'red',         predicted: false },
]
