'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Microscope, Upload, CheckCircle, X, ScanLine, Brain, Loader2 } from 'lucide-react'
import type { ModalityMode } from '@/types'

// All uploads go through Vercel rewrite → HTTP 8000 (no cert issues, no size limit)
const PROXY = '/proxy'
const POLL_INTERVAL_MS  = 10_000   // 10 s between polls
const MAX_WAIT_MS       = 20 * 60 * 1000  // 20 min max wait

// ── Single file drop-zone ──────────────────────────────────────────────────────
function ModalityZone({
  label, sublabel, color, file, onFile, accept = '.nii,.gz,.mha',
}: {
  label: string; sublabel: string; color: string; file: File | null
  onFile: (f: File | null) => void; accept?: string
}) {
  const ref  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const border: Record<string, string> = {
    blue:   'border-blue-300 bg-blue-50 hover:border-blue-500',
    purple: 'border-purple-300 bg-purple-50 hover:border-purple-500',
    green:  'border-green-300 bg-green-50 hover:border-green-500',
    teal:   'border-teal-300 bg-teal-50 hover:border-teal-500',
  }
  const active: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-100', purple: 'border-purple-500 bg-purple-100',
    green: 'border-green-500 bg-green-100', teal: 'border-teal-500 bg-teal-100',
  }
  const badge: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700', teal: 'bg-teal-100 text-teal-700',
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
        ${drag ? active[color] : border[color]}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0] ?? null) }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <div className="flex items-center gap-3">
        <div className={`text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 ${badge[color]}`}>{label}</div>
        <div className="flex-1 min-w-0">
          {file ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{sublabel}</p>
          )}
        </div>
        {file
          ? <button onClick={(e) => { e.stopPropagation(); onFile(null) }} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={16} /></button>
          : <Upload size={16} className="text-gray-400 flex-shrink-0" />}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const [mode, setMode]     = useState<ModalityMode>('mri')
  const [mriFiles, setMriFiles] = useState({ t2w: null as File|null, adc: null as File|null, hbv: null as File|null })
  const [ctFile, setCtFile] = useState<File|null>(null)

  // 'idle' | 'uploading' | 'waiting' (polling)
  const [step, setStep]       = useState<'idle' | 'uploading' | 'waiting'>('idle')
  const [elapsed, setElapsed] = useState(0)   // seconds since job started
  const [error, setError]     = useState('')

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const hasFile = mode === 'mri' ? !!mriFiles.t2w : !!ctFile
    if (!hasFile) {
      setError(mode === 'mri' ? '請上傳 T2W 影像' : '請上傳 CT 影像')
      return
    }
    setError('')
    setElapsed(0)
    setStep('uploading')

    try {
      await doUpload()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
      setError(msg?.response?.data?.error || msg?.message || '發生錯誤，請再試一次')
      setStep('idle')
    }
  }

  const doUpload = async () => {
    const fd = new FormData()
    const endpoint = mode === 'ct' ? `${PROXY}/submit_ct` : `${PROXY}/submit_mri`

    if (mode === 'ct') {
      fd.append('ct_file', ctFile!, ctFile!.name)
    } else {
      fd.append('t2w_file', mriFiles.t2w!, mriFiles.t2w!.name)
      if (mriFiles.adc) fd.append('adc_file', mriFiles.adc, mriFiles.adc.name)
      if (mriFiles.hbv) fd.append('hbv_file', mriFiles.hbv, mriFiles.hbv.name)
    }

    // Step 1: Submit job — returns immediately with job_id
    const submitResp = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(120_000),  // 2 min for upload only
    })
    if (!submitResp.ok) {
      const e = await submitResp.json().catch(() => ({}))
      throw new Error(e?.detail || `上傳失敗 (${submitResp.status})`)
    }
    const { job_id } = await submitResp.json()

    // Step 2: Poll for completion
    setStep('waiting')
    const result = await pollJob(job_id)

    // Step 3: Save to MongoDB → navigate to result page
    const { data: saved } = await axios.post('/api/save-case', { ...result, modality: mode })
    router.push(`/results/${saved.id}`)
  }

  const pollJob = async (job_id: string): Promise<Record<string, unknown>> => {
    const start = Date.now()
    let tick = 0

    // Timer to update elapsed display
    const timer = setInterval(() => {
      tick++
      setElapsed(tick)
    }, 1000)

    try {
      while (Date.now() - start < MAX_WAIT_MS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))

        const pollResp = await fetch(`${PROXY}/job_status/${job_id}`, {
          signal: AbortSignal.timeout(15_000),
        })
        if (!pollResp.ok) {
          if (pollResp.status === 404) throw new Error('推論任務已過期，請重新提交')
          continue  // transient error — keep polling
        }

        const { status, result, error } = await pollResp.json()
        if (status === 'completed') return result
        if (status === 'error')    throw new Error(error || '伺服器推論失敗')
        // status === 'processing' → keep waiting
      }
      throw new Error('等待超時（超過 20 分鐘），請確認伺服器狀態後重新提交')
    } finally {
      clearInterval(timer)
    }
  }

  const busy      = step !== 'idle'
  const canSubmit = mode === 'mri' ? !!mriFiles.t2w : !!ctFile

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}分${sec.toString().padStart(2,'0')}秒` : `${sec}秒`
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Microscope className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">ProstateScan AI</h1>
            <p className="text-xs text-gray-500">攝護腺疾病 AI 風險評估系統</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button onClick={() => router.push('/demo')} className="text-sm text-teal-600 hover:underline font-medium">🎬 Demo</button>
            <button onClick={() => router.push('/cases')} className="text-sm text-blue-600 hover:underline">歷史病例 →</button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { m: 'mri' as const, icon: Brain,    title: 'MRI 攝護腺癌篩檢',     sub: 'mpMRI → ISUP 風險分級',     color: 'blue' },
            { m: 'ct'  as const, icon: ScanLine, title: 'CT 攝護腺肥大（BPH）',  sub: 'CT → 體積計算 → BPH 分級', color: 'teal' },
          ]).map(({ m, icon: Icon, title, sub, color }) => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              disabled={busy}
              className={`rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-50
                ${mode === m
                  ? color === 'blue' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-teal-500 bg-teal-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <Icon size={22} className={mode === m
                ? color === 'blue' ? 'text-blue-600' : 'text-teal-600'
                : 'text-gray-400'} />
              <p className={`font-semibold text-sm mt-2 ${mode === m ? 'text-gray-900' : 'text-gray-500'}`}>{title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </button>
          ))}
        </div>

        {/* MRI Upload */}
        {mode === 'mri' && (
          <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Brain size={16} className="text-blue-500" />
              mpMRI 影像上傳
              <span className="text-xs text-gray-400 font-normal">（T2W 必填 · ADC/HBV 選填）</span>
            </h2>
            <ModalityZone label="T2W *" color="blue"
              sublabel="T2-weighted MRI (.nii.gz / .mha) — 必填"
              file={mriFiles.t2w} onFile={(f) => setMriFiles(s => ({ ...s, t2w: f }))} />
            <ModalityZone label="ADC" color="purple"
              sublabel="ADC Map (.nii.gz / .mha) — 選填"
              file={mriFiles.adc} onFile={(f) => setMriFiles(s => ({ ...s, adc: f }))} />
            <ModalityZone label="HBV" color="green"
              sublabel="High b-value DWI (.nii.gz / .mha) — 選填"
              file={mriFiles.hbv} onFile={(f) => setMriFiles(s => ({ ...s, hbv: f }))} />
          </section>
        )}

        {/* CT Upload */}
        {mode === 'ct' && (
          <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <ScanLine size={16} className="text-teal-500" />
              CT 影像上傳
            </h2>
            <ModalityZone label="CT *" color="teal"
              sublabel="骨盆腔 CT (.nii.gz / .mha) — 必填"
              file={ctFile} onFile={setCtFile} accept=".nii,.gz,.mha,.dcm" />
          </section>
        )}

        {/* Progress display during polling */}
        {step === 'waiting' && (
          <div className={`rounded-2xl border px-5 py-4 space-y-2
            ${mode === 'mri' ? 'bg-blue-50 border-blue-200' : 'bg-teal-50 border-teal-200'}`}>
            <div className="flex items-center gap-3">
              <Loader2 size={20} className={`animate-spin ${mode === 'mri' ? 'text-blue-500' : 'text-teal-500'}`} />
              <p className={`font-semibold text-sm ${mode === 'mri' ? 'text-blue-800' : 'text-teal-800'}`}>
                AI 模型推論中…（每 10 秒自動更新）
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>已等待：<strong>{fmtElapsed(elapsed)}</strong></span>
              <span>{mode === 'ct' ? '預計約 1–3 分鐘（GPU）' : '預計約 3–5 分鐘（GPU）'}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${mode === 'mri' ? 'bg-blue-400' : 'bg-teal-400'}`}
                style={{ width: `${Math.min((elapsed / (mode === 'ct' ? 180 : 300)) * 100, 95)}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <button onClick={handleSubmit} disabled={busy || !canSubmit}
          className={`w-full py-4 text-white font-semibold rounded-2xl transition-colors text-lg shadow-md
            ${mode === 'mri'
              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
              : 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300'}`}>
          {step === 'idle' && (mode === 'mri' ? '🧠 MRI 癌症風險評估' : '📐 CT BPH 體積分析')}
          {step === 'uploading' && (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              上傳影像中…
            </span>
          )}
          {step === 'waiting' && (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {mode === 'ct' ? 'nnUNet 分析中（約 1–3 分鐘）' : 'AI 推論中（約 3–5 分鐘）'}
            </span>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">本系統為 AI 輔助診斷工具，最終診斷須由專業醫師判讀。</p>
      </div>
    </main>
  )
}
