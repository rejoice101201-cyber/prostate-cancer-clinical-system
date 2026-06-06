'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Loader, Brain, ScanLine } from 'lucide-react'
import PIRADSBadge from '@/components/PIRADSBadge'
import type { PatientCase, PIRADSScore } from '@/types'

const STATUS_ICON = {
  pending:    <Clock size={15} className="text-gray-400" />,
  processing: <Loader size={15} className="text-blue-500 animate-spin" />,
  completed:  <CheckCircle size={15} className="text-green-500" />,
  error:      <AlertCircle size={15} className="text-red-500" />,
}

const BPH_COLOR: Record<string, string> = {
  green:       'bg-green-100 text-green-700',
  yellowgreen: 'bg-yellow-100 text-yellow-700',
  orange:      'bg-orange-100 text-orange-700',
  red:         'bg-red-100 text-red-700',
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const time = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return `${date} ${time}`
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<PatientCase[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCases = () => {
    axios.get('/api/cases')
      .then((r) => setCases(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCases()
    // Auto-refresh every 5s if any case is still processing
    const interval = setInterval(() => {
      setCases(prev => {
        const hasProcessing = prev.some(c => c.status === 'processing' || c.status === 'pending')
        if (hasProcessing) fetchCases()
        return prev
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">歷史病例</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-400">{cases.length} 筆紀錄</span>
            <button onClick={fetchCases} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <Loader size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading && <p className="text-center text-gray-400 py-12">載入中...</p>}
        {!loading && cases.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg mb-2">尚無病例紀錄</p>
            <button onClick={() => router.push('/')} className="text-blue-600 hover:underline text-sm">
              新增第一筆 →
            </button>
          </div>
        )}

        <div className="space-y-3">
          {cases.map((c) => {
            const isCT  = c.modality === 'ct'
            const isMRI = !isCT

            return (
              <button
                key={c._id}
                onClick={() => c._id && router.push(`/results/${c._id}`)}
                className="w-full bg-white border rounded-2xl px-5 py-4 hover:shadow-md transition-shadow text-left flex items-center gap-3"
              >
                {/* Modality icon */}
                <div className={`rounded-xl p-2 flex-shrink-0 ${isCT ? 'bg-teal-50' : 'bg-blue-50'}`}>
                  {isCT
                    ? <ScanLine size={18} className="text-teal-500" />
                    : <Brain    size={18} className="text-blue-500" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {STATUS_ICON[c.status]}
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isCT ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isCT ? 'CT BPH' : 'MRI Cancer'}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{c.patientId}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{formatDateTime(c.createdAt)}</span>
                    {/* CT-specific fields */}
                    {isCT && c.status === 'completed' && c.bphResult && (
                      <span className="font-medium text-gray-700">
                        {c.bphResult.prostateVolumeCc.toFixed(1)} cc
                      </span>
                    )}
                    {/* MRI-specific fields */}
                    {isMRI && c.status === 'completed' && c.result && (
                      <span className="text-gray-500">
                        PI-RADS {c.result.piradsScore}
                      </span>
                    )}
                  </div>
                </div>

                {/* Result badge */}
                {isCT && c.status === 'completed' && c.bphResult && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl flex-shrink-0 ${BPH_COLOR[c.bphResult.color] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.bphResult.bphGrade}
                  </span>
                )}
                {isMRI && c.status === 'completed' && c.result && (
                  <PIRADSBadge score={c.result.piradsScore as PIRADSScore} />
                )}

                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}
