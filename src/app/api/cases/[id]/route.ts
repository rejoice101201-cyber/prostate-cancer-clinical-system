import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Case from '@/models/Case'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()
    const c = await Case.findById(id).lean()
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(c)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
