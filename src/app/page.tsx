'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Microscope, Upload, CheckCircle, X, ScanLine, Brain } from 'lucide-react'
import type { MRIUploadState, CTUploadState, ModalityMode } from '@/types'

const MRI_INITIAL: MRIUploadState = {
  t2w: null, adc: null, hbv: null,
  patientId: '', patientName: '', age: '', psa: '',
  studyDate: new Date().toISOString().slice(0, 10),
}

const CT_INITIAL: CTUploadState = {
  ct: null,
  patientId: '', patientName: '', age: '', psa: '',
  studyDate: new Date().toISOString().slice(0, 10),
}

// Single MRI modality file drop zone
function ModalityZone({
  label, sublabel, color, file, onFile, accept = '.nii,.gz,.mha',
}: {
  label: string; sublabel: string; color: string; file: File | null
  onFile: (f: File | null) => void; accept?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const colors: Record<string, string> = {
    blue:   'border-blue-300 bg-blue-50 hover:border-blue-500',
    purple: 'border-purple-300 bg-purple-50 hover:border-purple-500',
    green:  'border-green-300 bg-green-50 hover:border-green-500',
  }
  const active: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-100', purple: 'border-purple-500 bg-purple-100',
    green: 'border-green-500 bg-green-100',
  }
  const badge: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
        ${drag ? active[color] : colors[color]}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0] ?? null) }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />

      <div className="flex items-center gap-3">
        <div className={`text-xs font-bold px-2 py-1 rounded-md ${badge[color]}`}>{label}</div>
        <div className="flex-1 min-w-0">
          {file ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{sublabel}</p>
          )}
        </div>
        {file ? (
          <button onClick={(e) => { e.stopPropagation(); onFile(null) }}
            className="text-gray-400 hover:text-red-500 flex-shrink-0">
            <X size={16} />
          </button>
        ) : (
          <Upload size={16} className="text-gray-400 flex-shrink-0" />
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<ModalityMode>('mri')
  const [mriFiles, setMriFiles] = useState({ t2w: null as File|null, adc: null as File|null, hbv: null as File|null })
  const [ctFile,   setCtFile]   = useState<File|null>(null)
  const [step, setStep] = useState<'idle' | 'uploading' | 'inferring'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const hasFile = mode === 'mri' ? !!mriFiles.t2w : !!ctFile
    if (!hasFile) {
      setError(mode === 'mri' ? '請上傳 T2W 影像' : '請上傳 CT 影像')
      return
    }
    setError('')
    setStep('uploading')
    try {
      // Auto-generate anonymous case info
      const autoId = `CASE-${Date.now()}`
      const { data: newCase } = await axios.post('/api/cases', {
        patientId:   autoId,
        patientName: 'Anonymous',
        age:         0,
        psa:         undefined,
        studyDate:   new Date().toISOString().slice(0, 10),
        modality:    mode,
      })
      setStep('inferring')
      const fd = new FormData()
      fd.append('caseId', newCase._id)

      if (mode === 'mri') {
        fd.append('t2w', mriFiles.t2w!, mriFiles.t2w!.name)
        if (mriFiles.adc) fd.append('adc', mriFiles.adc, mriFiles.adc.name)
        if (mriFiles.hbv) fd.append('hbv', mriFiles.hbv, mriFiles.hbv.name)
        await axios.post('/api/inference', fd)
      } else {
        fd.append('ct', ctFile!, ctFile!.name)
        await axios.post('/api/infer-ct', fd)
      }
      router.push(`/results/${newCase._id}`)
    } catch (err: any) {
      setError(err?.response?.data?.error || '發生錯誤，請再試一次')
      setStep('idle')
    }
  }

  const busy = step !== 'idle'
  const canSubmit = mode === 'mri' ? !!mriFiles.t2w : !!ctFile

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Microscope className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">ProstateScan AI</h1>
            <p className="text-xs text-gray-500">攝護腺疾病 AI 風險評估系統</p>
          </div>
          <button onClick={() => router.push('/cases')}
            className="ml-auto text-sm text-blue-600 hover:underline">
            歷史病例 →
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { m: 'mri' as const, icon: Brain,    title: 'MRI 攝護腺癌篩檢',    sub: 'mpMRI → ISUP 風險分級',     color: 'blue' },
            { m: 'ct'  as const, icon: ScanLine, title: 'CT 攝護腺肥大（BPH）', sub: 'CT → 體積計算 → BPH 分級', color: 'teal' },
          ]).map(({ m, icon: Icon, title, sub, color }) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-2xl border-2 p-4 text-left transition-all
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
            <div className="flex gap-2 pt-1 flex-wrap">
              {(['t2w', 'adc', 'hbv'] as const).map((k) => (
                <div key={k} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full
                  ${mriFiles[k] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {mriFiles[k] && <CheckCircle size={10} />}
                  {k.toUpperCase()}
                </div>
              ))}
              {mriFiles.adc && mriFiles.hbv &&
                <span className="text-xs text-green-600 font-medium ml-auto">✓ 完整 mpMRI</span>}
            </div>
          </section>
        )}

        {/* CT Upload */}
        {mode === 'ct' && (
          <section className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <ScanLine size={16} className="text-teal-500" />
              CT 影像上傳
            </h2>
            <ModalityZone label="CT *" color="blue"
              sublabel="腹/骨盆腔 CT (.nii.gz / .mha / .dcm) — 必填"
              file={ctFile} onFile={setCtFile} accept=".nii,.gz,.mha,.dcm" />
          </section>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
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
              上傳中...
            </span>
          )}
          {step === 'inferring' && (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              AI 分析中...
            </span>
          )}
        </button>
        <p className="text-center text-xs text-gray-400">本系統為 AI 輔助診斷工具，最終診斷須由專業醫師判讀。</p>
      </div>
    </main>
  )
}
