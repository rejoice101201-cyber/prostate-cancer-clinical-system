'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ArrowLeft, ScanLine, Brain, Loader, Filter } from 'lucide-react'
import BPHReport from '@/components/BPHReport'
import GradingReport from '@/components/GradingReport'
import PIRADSBadge from '@/components/PIRADSBadge'
import type { BPHResult, InferenceResult, PIRADSScore } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface CTCase {
  case_id: string; display_id: string; volume_cc: number
  bph_grade: string; bph_level: number; color: string; predicted: boolean
}

interface MRICase {
  case_id: string; display_id: string; pirads: number
  risk_score: number; label: number; psa?: number
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const BPH_COLOR: Record<string, string> = {
  green: 'bg-green-100 text-green-700', yellowgreen: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700',
}
const PIRADS_COLOR: Record<number, string> = {
  1: 'bg-green-100 text-green-700', 2: 'bg-blue-100 text-blue-700',
  3: 'bg-yellow-100 text-yellow-700', 4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const router = useRouter()
  const [tab, setTab]             = useState<'ct' | 'mri'>('ct')
  const [ctCases, setCtCases]     = useState<CTCase[]>([])
  const [mriCases, setMriCases]   = useState<MRICase[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<string | null>(null)
  const [running, setRunning]     = useState(false)
  const [bphResult, setBphResult] = useState<BPHResult | null>(null)
  const [mriResult, setMriResult] = useState<InferenceResult | null>(null)
  const [error, setError]         = useState('')

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all')

  // Load both CT and MRI cases
  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/demo-ct').then(r => setCtCases(r.data)).catch(() => {}),
      axios.get('/api/demo-mri').then(r => setMriCases(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Reset result when switching tabs
  useEffect(() => {
    setSelected(null); setBphResult(null); setMriResult(null); setError('')
    setSeverityFilter('all')
  }, [tab])

  // ── Filtered cases ─────────────────────────────────────────────────────────
  const filteredCT = useMemo(() => {
    if (severityFilter === 'all') return ctCases
    const levelMap: Record<string, number[]> = {
      'normal': [1], 'mild': [2], 'moderate': [3], 'severe': [4]
    }
    return ctCases.filter(c => (levelMap[severityFilter] ?? []).includes(c.bph_level))
  }, [ctCases, severityFilter])

  const filteredMRI = useMemo(() => {
    if (severityFilter === 'all') return mriCases
    const piradsMap: Record<string, number[]> = {
      'low': [1, 2], 'moderate': [3], 'high': [4, 5]
    }
    return mriCases.filter(c => (piradsMap[severityFilter] ?? []).includes(c.pirads))
  }, [mriCases, severityFilter])

  // ── Inference ──────────────────────────────────────────────────────────────
  const runCT = async (caseId: string) => {
    setSelected(caseId); setRunning(true); setBphResult(null); setMriResult(null); setError('')
    try {
      const { data } = await axios.post(`/api/predict-demo-ct/${caseId}`)
      setBphResult(data)
    } catch { setError('推論失敗，請再試一次') }
    finally { setRunning(false) }
  }

  const runMRI = async (caseId: string) => {
    setSelected(caseId); setRunning(true); setBphResult(null); setMriResult(null); setError('')
    try {
      const { data } = await axios.post(`/api/predict-demo-mri/${caseId}`)
      setMriResult(data)
    } catch { setError('推論失敗，請再試一次') }
    finally { setRunning(false) }
  }

  // ── CT filter options ─────────────────────────────────────────────────────
  const ctFilters = [
    { key: 'all', label: '全部' },
    { key: 'normal', label: '正常' },
    { key: 'mild', label: '輕度肥大' },
    { key: 'moderate', label: '中度 BPH' },
    { key: 'severe', label: '重度 BPH' },
  ]
  const mriFilters = [
    { key: 'all', label: '全部' },
    { key: 'low', label: 'PI-RADS 1–2（低風險）' },
    { key: 'moderate', label: 'PI-RADS 3（不確定）' },
    { key: 'high', label: 'PI-RADS 4–5（高風險）' },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Demo 模式</h1>
            <p className="text-xs text-gray-500">點選案例 → 伺服器直接推論，無需上傳影像</p>
          </div>
        </div>

        {/* CT / MRI tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {([
            { key: 'ct'  as const, icon: ScanLine, label: 'CT BPH 攝護腺肥大', color: 'teal' },
            { key: 'mri' as const, icon: Brain,    label: 'MRI 攝護腺癌篩檢',   color: 'blue' },
          ]).map(({ key, icon: Icon, label, color }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
                ${tab === key
                  ? color === 'teal'
                    ? 'border-teal-500 text-teal-700 bg-teal-50/50'
                    : 'border-blue-500 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <Icon size={16} />
              {label}
              <span className="text-xs font-normal opacity-60">
                {key === 'ct' ? `${ctCases.length} 案` : `${mriCases.length} 案`}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Info */}
        <div className={`rounded-2xl px-5 py-3 text-sm border
          ${tab === 'ct' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          案例已預存於 AI 伺服器，點擊即可立即獲得分析結果與切面影像，<strong>無需上傳任何檔案</strong>。
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">嚴重程度：</span>
          {(tab === 'ct' ? ctFilters : mriFilters).map(f => (
            <button key={f.key} onClick={() => setSeverityFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${severityFilter === f.key
                  ? tab === 'ct' ? 'bg-teal-500 text-white' : 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
              {f.label}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-auto">
            顯示 {tab === 'ct' ? filteredCT.length : filteredMRI.length} 筆
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
            <Loader size={20} className="animate-spin" />載入案例中...
          </div>
        )}

        {/* CT case grid */}
        {!loading && tab === 'ct' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filteredCT.map(c => (
              <button key={c.case_id}
                onClick={() => !running && runCT(c.case_id)}
                disabled={running}
                className={`bg-white rounded-xl border-2 p-3 text-left transition-all hover:shadow-md
                  ${selected === c.case_id ? 'border-teal-500 shadow-md' : 'border-gray-200'}
                  ${running ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <p className="text-xs text-gray-400 mb-1 truncate">{c.display_id}</p>
                <p className="text-lg font-bold text-gray-800">
                  {c.volume_cc}<span className="text-xs font-normal text-gray-400 ml-0.5">cc</span>
                </p>
                <span className={`inline-block mt-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${BPH_COLOR[c.color] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.bph_grade}
                </span>
                {selected === c.case_id && running && (
                  <Loader size={12} className="text-teal-500 animate-spin mt-1" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* MRI case grid */}
        {!loading && tab === 'mri' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filteredMRI.map(c => (
              <button key={c.case_id}
                onClick={() => !running && runMRI(c.case_id)}
                disabled={running}
                className={`bg-white rounded-xl border-2 p-3 text-left transition-all hover:shadow-md
                  ${selected === c.case_id ? 'border-blue-500 shadow-md' : 'border-gray-200'}
                  ${running ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <p className="text-xs text-gray-400 mb-1 truncate">{c.display_id}</p>
                <PIRADSBadge score={c.pirads as PIRADSScore} />
                {c.psa && <p className="text-xs text-gray-400 mt-1">PSA {c.psa}</p>}
                {selected === c.case_id && running && (
                  <Loader size={12} className="text-blue-500 animate-spin mt-1" />
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Running */}
        {running && (
          <div className="bg-white border rounded-2xl p-6 text-center">
            <Loader size={32} className={`animate-spin mx-auto mb-3 ${tab === 'ct' ? 'text-teal-500' : 'text-blue-500'}`} />
            <p className="text-gray-600 font-medium">AI 推論中...</p>
            <p className="text-gray-400 text-sm mt-1">伺服器正在執行 nnUNet 分割與分析</p>
          </div>
        )}

        {/* Results */}
        {bphResult && !running && (
          <div>
            <p className="text-xs text-gray-400 font-medium mb-3 px-1">
              推論結果 — {ctCases.find(c => c.case_id === selected)?.display_id}
            </p>
            <BPHReport result={bphResult} />
          </div>
        )}

        {mriResult && !running && (
          <div>
            <p className="text-xs text-gray-400 font-medium mb-3 px-1">
              推論結果 — {mriCases.find(c => c.case_id === selected)?.display_id}
            </p>
            <GradingReport result={mriResult} />
          </div>
        )}

      </div>
    </main>
  )
}
