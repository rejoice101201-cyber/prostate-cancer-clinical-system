'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, Printer, RefreshCw, Brain, ScanLine } from 'lucide-react'
import GradingReport from '@/components/GradingReport'
import BPHReport from '@/components/BPHReport'
import type { PatientCase } from '@/types'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [caseData, setCaseData] = useState<PatientCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    axios.get(`/api/cases/${id}`)
      .then((r) => setCaseData(r.data))
      .catch(() => setError('無法載入結果'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p>載入結果中...</p>
      </div>
    </div>
  )

  if (error || !caseData) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error || '找不到此病例'}</p>
        <button onClick={() => router.push('/')} className="text-blue-600 hover:underline">← 返回首頁</button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">分析報告</h1>
              {caseData.modality === 'ct'
                ? <span className="flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium"><ScanLine size={11}/>CT BPH</span>
                : <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"><Brain size={11}/>MRI Cancer</span>
              }
            </div>
            <p className="text-xs text-gray-500">{caseData.patientName} · {caseData.patientId} · {caseData.studyDate}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <RefreshCw size={18} />
            </button>
            <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <Printer size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Patient summary bar */}
        <div className="bg-white border rounded-2xl px-5 py-3 mb-6 flex flex-wrap gap-4 text-sm text-gray-600 shadow-sm">
          <span><strong>姓名：</strong>{caseData.patientName}</span>
          <span><strong>ID：</strong>{caseData.patientId}</span>
          <span><strong>年齡：</strong>{caseData.age} 歲</span>
          {caseData.psa && <span><strong>PSA：</strong>{caseData.psa} ng/mL</span>}
          <span><strong>檢查日期：</strong>{caseData.studyDate}</span>
        </div>

        {caseData.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center text-blue-700">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            AI 模型分析中，請稍候...
          </div>
        )}

        {caseData.status === 'completed' && caseData.modality === 'ct' && caseData.bphResult && (
          <BPHReport result={caseData.bphResult} />
        )}
        {caseData.status === 'completed' && caseData.modality !== 'ct' && caseData.result && (
          <GradingReport result={caseData.result} />
        )}

        {caseData.status === 'error' && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
            分析過程發生錯誤，請重新提交。
          </div>
        )}
      </div>
    </main>
  )
}
