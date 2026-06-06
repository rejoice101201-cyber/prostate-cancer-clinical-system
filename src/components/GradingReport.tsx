import { CheckCircle, AlertTriangle, Target, Clock, Brain, FlaskConical } from 'lucide-react'
import type { InferenceResult } from '@/types'
import PIRADSBadge from './PIRADSBadge'

const MODEL_LABELS: Record<string, { label: string; color: string }> = {
  DL_SwinUNETR_mpMRI:  { label: 'SwinUNETR · mpMRI',       color: 'bg-violet-100 text-violet-700' },
  DL_ResNet3D:         { label: 'ResNet3D · mpMRI',          color: 'bg-violet-100 text-violet-700' },
  radiomics_fallback:  { label: 'Radiomics · T2W only',      color: 'bg-amber-100 text-amber-700'  },
  radiomics_xgboost:   { label: 'XGBoost Radiomics · T2W',   color: 'bg-blue-100 text-blue-700'    },
  'XGBoost+isotonic':  { label: 'XGBoost+isotonic · T2W',    color: 'bg-blue-100 text-blue-700'    },
  mock:                { label: 'Demo Mock',                  color: 'bg-gray-100 text-gray-500'    },
}

export default function GradingReport({ result }: { result: InferenceResult }) {
  const modelMeta = result.modelType ? MODEL_LABELS[result.modelType] : null

  return (
    <div className="space-y-6">
      {/* Header: Overall score */}
      <div className="flex items-center gap-6 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <PIRADSBadge score={result.piradsScore} large />
        <div className="space-y-1">
          {result.prostateVolumeMl > 0 && (
            <p className="text-sm text-gray-600">
              攝護腺體積：<span className="font-semibold">{result.prostateVolumeMl} mL</span>
            </p>
          )}
          {result.psaDensity && (
            <p className="text-sm text-gray-500">PSA 密度：{result.psaDensity.toFixed(2)} ng/mL/mL</p>
          )}
          {result.riskScore !== undefined && (
            <p className="text-sm text-gray-500">
              風險分數：<span className="font-semibold">{(result.riskScore * 100).toFixed(1)}%</span>
              {result.riskLevel && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">{result.riskLevel}</span>
              )}
            </p>
          )}
          {modelMeta && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${modelMeta.color}`}>
              <Brain size={11} />
              {modelMeta.label}
            </span>
          )}
        </div>
        <div className="ml-auto text-right text-sm text-gray-400">
          {result.processingTimeMs > 0 && (
            <>
              <Clock size={14} className="inline mr-1" />
              {(result.processingTimeMs / 1000).toFixed(1)}s
            </>
          )}
        </div>
      </div>

      {/* Suspicious regions */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Target size={18} className="text-orange-500" />
          可疑病灶 ({result.suspiciousRegions.length} 處)
        </h3>
        <div className="grid gap-2">
          {result.suspiciousRegions.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border">
              <div>
                <PIRADSBadge score={r.pirads} />
                <p className="text-xs text-gray-500 mt-1">
                  位置 ({r.x}, {r.y}, {r.z}) · 體積 {r.volumeMl} mL
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">信心度</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.confidence > 0.8 ? 'bg-red-500' : r.confidence > 0.6 ? 'bg-orange-400' : 'bg-yellow-400'}`}
                      style={{ width: `${r.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{(r.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visualization slices */}
      {(result.sliceOriginal || result.sliceDetection || result.sliceSegmentation) && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Brain size={18} className="text-blue-500" />
            MRI 切面影像
          </h3>
          <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden border border-gray-200">
            {[
              { key: 'sliceOriginal',     label: 'T2W 原始切面' },
              { key: 'sliceDetection',    label: '攝護腺偵測框' },
              { key: 'sliceSegmentation', label: '分割結果'      },
            ].map(({ key, label }) => {
              const src = result[key as keyof typeof result] as string | undefined
              return src ? (
                <div key={key} className="relative">
                  <img src={`data:image/png;base64,${src}`} alt={label}
                    className="w-full aspect-square object-cover" />
                  <span className="absolute bottom-1 left-0 right-0 text-center text-white text-[10px] font-medium
                    bg-black/40 py-0.5">
                    {label}
                  </span>
                </div>
              ) : (
                <div key={key} className="bg-gray-100 aspect-square flex items-center justify-center text-gray-400 text-xs">
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">影像發現</h3>
        <p className="text-sm text-blue-900 leading-relaxed">{result.findings}</p>
      </div>

      {/* Recommendation */}
      <div className={`rounded-2xl p-4 border flex gap-3 ${
        result.piradsScore >= 4 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
      }`}>
        {result.piradsScore >= 4
          ? <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          : <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
        }
        <div>
          <h3 className={`font-semibold mb-1 ${result.piradsScore >= 4 ? 'text-red-800' : 'text-green-800'}`}>
            臨床建議
          </h3>
          <p className={`text-sm ${result.piradsScore >= 4 ? 'text-red-700' : 'text-green-700'}`}>
            {result.recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}
