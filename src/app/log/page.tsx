'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Home, Landmark, Banknote, TrendingUp,
  Settings, ArrowLeft, X,
} from 'lucide-react'

type Transaction = {
  id: string
  amount: number
  type: string
  masterType: string
  note: string | null
  createdAt: string
  team: { name: string; color: string; code: string }
  zone: { name: string; code: string } | null
  master: { displayName: string }
}

const TYPE_LABELS: Record<string, { label: string; color: string; sign: '+' | '-' }> = {
  purchase:    { label: '購買',     color: 'text-red-400',    sign: '-' },
  sale:        { label: '出售',     color: 'text-green-400',  sign: '+' },
  fee:         { label: '收錢',     color: 'text-red-400',    sign: '-' },
  income:      { label: '給錢',     color: 'text-green-400',  sign: '+' },
  rent:        { label: '租金',     color: 'text-green-400',  sign: '+' },
  loan:        { label: '放款',     color: 'text-yellow-400', sign: '+' },
  repayment:   { label: '還款',     color: 'text-green-400',  sign: '-' },
  long:        { label: '做多',     color: 'text-red-400',    sign: '-' },
  short:       { label: '做空',     color: 'text-red-400',    sign: '-' },
  long_profit: { label: '做多獲利', color: 'text-green-400',  sign: '+' },
  short_profit:{ label: '做空獲利', color: 'text-green-400',  sign: '+' },
}

function MasterTypeIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4'
  if (type === 'realestate') return <Home className={cls} strokeWidth={1.5} />
  if (type === 'bank') return <Landmark className={cls} strokeWidth={1.5} />
  if (type === 'loan') return <Banknote className={cls} strokeWidth={1.5} />
  if (type === 'indexfund') return <TrendingUp className={cls} strokeWidth={1.5} />
  return <Settings className={cls} strokeWidth={1.5} />
}

export default function LogPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterType, setFilterType] = useState('')

  const fetchData = useCallback(async () => {
    const meRes = await fetch('/api/auth/me')
    if (meRes.status === 401) { router.push('/'); return }
    const res = await fetch('/api/transactions?all=true')
    const data = await res.json()
    setTransactions(data)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const allTeams = [...new Set(transactions.map((t) => t.team.name))]
  const allTypes = [...new Set(transactions.map((t) => t.type))]

  const filtered = transactions.filter((tx) => {
    if (filterTeam && tx.team.name !== filterTeam) return false
    if (filterType && tx.type !== filterType) return false
    return true
  })

  const totalOut = filtered.reduce((s, tx) => TYPE_LABELS[tx.type]?.sign === '-' ? s + tx.amount : s, 0)
  const totalIn = filtered.reduce((s, tx) => TYPE_LABELS[tx.type]?.sign === '+' ? s + tx.amount : s, 0)

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
          <div>
            <h1 className="text-white font-bold text-lg">交易流水帳</h1>
            <p className="text-gray-400 text-xs">所有交易記錄</p>
          </div>
        </div>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
      </header>

      {/* Summary bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-6 text-sm">
        <div>
          <span className="text-gray-500">總計筆數 </span>
          <span className="text-white font-semibold">{filtered.length}</span>
        </div>
        <div>
          <span className="text-gray-500">支出 </span>
          <span className="text-red-400 font-semibold">${totalOut.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">收入 </span>
          <span className="text-green-400 font-semibold">${totalIn.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-3 overflow-x-auto">
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none flex-shrink-0">
          <option value="">所有小隊</option>
          {allTeams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none flex-shrink-0">
          <option value="">所有類型</option>
          {allTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]?.label || t}</option>)}
        </select>
        {(filterTeam || filterType) && (
          <button onClick={() => { setFilterTeam(''); setFilterType('') }}
            className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-600 flex-shrink-0 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> 清除篩選
          </button>
        )}
      </div>

      {/* Transaction list */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        {loading ? (
          <div className="text-center py-20 text-gray-500">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">無符合條件的記錄</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx, i) => {
              const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, color: 'text-gray-400', sign: '-' as const }
              const prevDate = i > 0 ? new Date(filtered[i - 1].createdAt).toLocaleDateString('zh-TW') : null
              const thisDate = new Date(tx.createdAt).toLocaleDateString('zh-TW')
              const showDateSep = i === 0 || thisDate !== prevDate

              return (
                <div key={tx.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-gray-800" />
                      <span className="text-xs text-gray-500">{thisDate}</span>
                      <div className="h-px flex-1 bg-gray-800" />
                    </div>
                  )}
                  <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 flex items-center gap-3">
                    {/* Master icon */}
                    <div className="text-gray-400 flex-shrink-0">
                      <MasterTypeIcon type={tx.masterType} />
                    </div>

                    {/* Team color dot */}
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tx.team.color }} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{tx.team.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-gray-800 ${typeInfo.color}`}>{typeInfo.label}</span>
                        {tx.zone && <span className="text-xs text-gray-400">{tx.zone.name}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>{tx.master.displayName}</span>
                        {tx.note && <><span>·</span><span className="truncate">{tx.note}</span></>}
                      </div>
                    </div>

                    {/* Amount + time */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${typeInfo.color}`}>
                        {typeInfo.sign}${tx.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(tx.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
