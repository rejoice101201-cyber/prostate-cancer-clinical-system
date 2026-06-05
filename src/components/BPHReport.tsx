import { CheckCircle, AlertTriangle, AlertCircle, Clock, Ruler } from 'lucide-react'
import type { BPHResult } from '@/types'

const GRADE_CONFIG = {
  '正常':     { bar: 15,  barColor: 'bg-green-400' },
  '輕度肥大': { bar: 40,  barColor: 'bg-yellow-400' },
  '中度 BPH': { bar: 65,  barColor: 'bg-orange-400' },
  '重度 BPH': { bar: 90,  barColor: 'bg-red-500' },
}

const COLOR_MAP = {
  green:       { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800',  sub: 'text-green-700' },
  yellowgreen: { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-800', sub: 'text-yellow-700' },
  orange:      { bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-800', sub: 'text-orange-700' },
  red:         { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',    sub: 'text-red-700' },
}

export default function BPHReport({ result }: { result: BPHResult }) {
  const gradeCfg = GRADE_CONFIG[result.bphGrade] ?? GRADE_CONFIG['中度 BPH']
  const colorCfg = COLOR_MAP[result.color] ?? COLOR_MAP.orange
  const isHighRisk = result.color === 'red' || result.color === 'orange'

  return (
    <div className="space-y-5">

      {/* Header card */}
      <div className={`rounded-2xl border p-5 ${colorCfg.bg} ${colorCfg.border}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-3xl font-black ${colorCfg.text}`}>
              {result.prostateVolumeCc.toFixed(1)} <span className="text-lg font-semibold">cc</span>
            </p>
            <p className={`text-xl font-bold mt-1 ${colorCfg.text}`}>{result.bphGrade}</p>
            <p className={`text-sm mt-0.5 ${colorCfg.sub}`}>{result.riskLevel}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            {result.processingTimeMs > 0 && (
              <span><Clock size={12} className="inline mr-1" />{(result.processingTimeMs / 1000).toFixed(1)}s</span>
            )}
            {result.modelType && (
              <p className="mt-1 bg-white/60 rounded-full px-2 py-0.5 text-gray-500">{result.modelType}</p>
            )}
          </div>
        </div>

        {/* Volume gauge */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>0 cc</span><span>30</span><span>50</span><span>80</span><span>120+ cc</span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden relative">
            {/* Zone markers */}
            <div className="absolute inset-0 flex">
              <div className="bg-green-200" style={{ width: '25%' }} />
              <div className="bg-yellow-200" style={{ width: '16.7%' }} />
              <div className="bg-orange-200" style={{ width: '25%' }} />
              <div className="bg-red-200" style={{ flex: 1 }} />
            </div>
            {/* Thumb */}
            <div
              className={`absolute top-0 h-full w-1.5 rounded-full bg-gray-800 transition-all`}
              style={{ left: `${Math.min(gradeCfg.bar, 97)}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: 'transparent' }}>
            <span>正常</span><span>輕度</span><span>中度</span><span>重度</span>
          </div>
        </div>
      </div>

      {/* PSA Density */}
      {result.psaDensity !== undefined && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3
          ${result.psaDensityFlag
            ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-50 border-gray-200'}`}>
          <Ruler size={18} className={result.psaDensityFlag ? 'text-amber-500 mt-0.5' : 'text-gray-400 mt-0.5'} />
          <div>
            <p className="font-semibold text-sm text-gray-700">
              PSA 密度：{result.psaDensity.toFixed(3)} ng/mL/cc
            </p>
            {result.psaDensityFlag ? (
              <p className="text-xs text-amber-700 mt-0.5">
                ⚠️ PSAD &gt; 0.15 — 建議排除合併攝護腺癌可能，考慮 mpMRI 評估
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">PSAD 正常（&lt; 0.15）</p>
            )}
          </div>
        </div>
      )}

      {/* Volume reference table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Ruler size={15} className="text-blue-500" /> 臨床體積對照
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-4 py-2">體積</th>
              <th className="text-left px-4 py-2">分級</th>
              <th className="text-left px-4 py-2">說明</th>
            </tr>
          </thead>
          <tbody>
            {[
              { vol: '< 30 cc',  grade: '正常',     desc: '無 BPH',          active: result.bphGrade === '正常' },
              { vol: '30–50 cc', grade: '輕度肥大', desc: '觀察追蹤',         active: result.bphGrade === '輕度肥大' },
              { vol: '50–80 cc', grade: '中度 BPH', desc: '藥物治療考慮',      active: result.bphGrade === '中度 BPH' },
              { vol: '> 80 cc',  grade: '重度 BPH', desc: '手術治療考慮',      active: result.bphGrade === '重度 BPH' },
            ].map((row) => (
              <tr key={row.grade}
                className={`border-t border-gray-50 ${row.active ? 'bg-blue-50 font-semibold' : ''}`}>
                <td className="px-4 py-2 text-gray-600">{row.vol}</td>
                <td className="px-4 py-2">{row.grade}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      <div className={`rounded-2xl p-4 border flex gap-3
        ${isHighRisk ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
        {isHighRisk
          ? <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          : <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />}
        <div>
          <h3 className={`font-semibold mb-1 ${isHighRisk ? 'text-red-800' : 'text-green-800'}`}>
            臨床建議
          </h3>
          <p className={`text-sm leading-relaxed ${isHighRisk ? 'text-red-700' : 'text-green-700'}`}>
            {result.recommendation}
          </p>
        </div>
      </div>

    </div>
  )
}
