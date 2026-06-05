import type { PIRADSScore } from '@/types'

const CONFIG: Record<PIRADSScore, { color: string; label: string; desc: string }> = {
  1: { color: 'bg-green-100 text-green-800 border-green-200',  label: 'PI-RADS 1', desc: '惡性腫瘤可能性極低' },
  2: { color: 'bg-blue-100 text-blue-800 border-blue-200',    label: 'PI-RADS 2', desc: '惡性腫瘤可能性低' },
  3: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'PI-RADS 3', desc: '惡性腫瘤可能性不確定' },
  4: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'PI-RADS 4', desc: '惡性腫瘤可能性高' },
  5: { color: 'bg-red-100 text-red-800 border-red-200',       label: 'PI-RADS 5', desc: '惡性腫瘤可能性極高' },
}

export default function PIRADSBadge({ score, large }: { score: PIRADSScore; large?: boolean }) {
  const cfg = CONFIG[score]
  return (
    <div className={`inline-flex flex-col items-center border rounded-xl px-4 py-2 ${cfg.color} ${large ? 'text-lg' : 'text-sm'}`}>
      <span className={`font-bold ${large ? 'text-2xl' : ''}`}>{cfg.label}</span>
      {large && <span className="text-sm mt-1 font-normal">{cfg.desc}</span>}
    </div>
  )
}
