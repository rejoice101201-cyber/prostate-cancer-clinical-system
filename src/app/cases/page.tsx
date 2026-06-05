'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import PIRADSBadge from '@/components/PIRADSBadge'
import type { PatientCase, PIRADSScore } from '@/types'

const STATUS_ICON = {
  pending: <Clock size={16} className="text-gray-400" />,
  processing: <Loader size={16} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle size={16} className="text-green-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
}

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<PatientCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/cases')
      .then((r) => setCases(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">歷史病例</h1>
          <span className="ml-auto text-sm text-gray-400">{cases.length} 筆紀錄</span>
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
          {cases.map((c) => (
            <button
              key={c._id}
              onClick={() => c._id && router.push(`/results/${c._id}`)}
              className="w-full bg-white border rounded-2xl px-5 py-4 hover:shadow-md transition-shadow text-left flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {STATUS_ICON[c.status]}
                  <span className="font-semibold text-gray-900 truncate">{c.patientName}</span>
                  <span className="text-xs text-gray-400">{c.patientId}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{c.age} 歲</span>
                  {c.psa && <span>PSA {c.psa}</span>}
                  <span>{c.studyDate}</span>
                </div>
              </div>
              {c.status === 'completed' && c.result && (
                <PIRADSBadge score={c.result.piradsScore as PIRADSScore} />
              )}
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
