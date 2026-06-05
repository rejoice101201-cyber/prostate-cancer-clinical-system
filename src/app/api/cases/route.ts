import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'

export async function GET() {
  try {
    await connectDB()
    const cases = await Case.find({}).sort({ createdAt: -1 }).limit(50).lean()
    return NextResponse.json(cases)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const newCase = await Case.create({
      patientId: body.patientId,
      patientName: body.patientName,
      age: Number(body.age),
      psa: body.psa ? Number(body.psa) : undefined,
      studyDate: body.studyDate,
      status: 'pending',
    })
    return NextResponse.json(newCase, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
  }
}
