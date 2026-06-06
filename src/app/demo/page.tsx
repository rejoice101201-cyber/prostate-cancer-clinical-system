'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ScanLine, ChevronRight, Loader } from 'lucide-react'
import BPHReport from '@/components/BPHReport'
import type { BPHResult } from '@/types'

interface DemoCase {
  case_id: string
  display_id: string
  volume_cc: number
  bph_grade: string
  bph_level: number
  color: 'green' | 'yellowgreen' | 'orange' | 'red'
  predicted: boolean
}

const COLOR_BG: Record<string, string> = {
  green:       'bg-green-100 text-green-700',
  yellowgreen: 'bg-yellow-100 text-yellow-700',
  orange:      'bg-orange-100 text-orange-700',
  red:         'bg-red-100 text-red-700',
}

export default function DemoPage() {
  const router = useRouter()
  const [cases, setCases]       = useState<DemoCase[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [running, setRunning]   = useState(false)
  const [result, setResult]     = useState<BPHResult | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    axios.get('/api/demo-ct')
      .then(r => setCases(r.data))
      .catch(() => setError('無法載入 Demo 案例'))
      .finally(() => setLoading(false))
  }, [])

  const runInference = async (caseId: string) => {
    setSelected(caseId)
    setRunning(true)
    setResult(null)
    setError('')
    try {
      const { data } = await axios.post(`/api/predict-demo-ct/${caseId}`)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || '推論失敗，請再試一次')
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <ScanLine className="text-teal-600" size={22} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">CT BPH Demo 模式</h1>
            <p className="text-xs text-gray-500">點選案例 → 伺服器直接推論，無需上傳影像</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Info banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3 text-sm text-teal-800">
          以下案例已預存於 AI 伺服器，點擊「執行推論」即可立即獲得分析結果與切面影像，<strong>無需上傳任何檔案</strong>。
        </div>

        {/* Case cards */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
            <Loader size={20} className="animate-spin" />
            載入案例中...
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cases.map(c => (
              <button
                key={c.case_id}
                onClick={() => !running && runInference(c.case_id)}
                disabled={running}
                className={`bg-white rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md
                  ${selected === c.case_id ? 'border-teal-500 shadow-md' : 'border-gray-200'}
                  ${running ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400">{c.display_id}</span>
                  {selected === c.case_id && running
                    ? <Loader size={14} className="text-teal-500 animate-spin" />
                    : <ChevronRight size={14} className="text-gray-300" />}
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {c.volume_cc} <span className="text-sm font-normal text-gray-500">cc</span>
                </p>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_BG[c.color]}`}>
                  {c.bph_grade}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Running state */}
        {running && (
          <div className="bg-white border border-teal-100 rounded-2xl p-6 text-center">
            <Loader size={32} className="animate-spin text-teal-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">AI 推論中...</p>
            <p className="text-gray-400 text-sm mt-1">伺服器正在執行 nnUNet 分割與體積計算</p>
          </div>
        )}

        {/* Result */}
        {result && !running && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">
              推論結果 — {cases.find(c => c.case_id === selected)?.display_id}
            </h2>
            <BPHReport result={result} />
          </div>
        )}

      </div>
    </main>
  )
}
