'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Map, Home, Landmark,
  TrendingUp, Settings, Calendar, ChevronDown, Loader2, LayoutGrid,
} from 'lucide-react'

type Transaction = {
  id: string; amount: number; type: string; masterType: string
  note: string | null; createdAt: string
  team: { name: string; color: string; code: string }
  zone: { name: string; code: string } | null
  master: { displayName: string }
}

type Team = {
  id: string; name: string; color: string; code: string; budget: number
  _count: { ownedZones: number; transactions: number }
}

type Zone = {
  id: string; name: string; code: string; type: string
  currentPrice: number; ownedByTeamId: string | null
  ownedByTeam: { name: string; color: string } | null
}

type GameState = { month: number }

type ColumnConfig = {
  column: string; price1: number; price2: number; price3: number; price4: number; rentRate: number
}

const MASTER_LABELS: Record<string, string> = {
  realestate: '房地產', bank: '銀行', loan: '高利貸', indexfund: '指數基金', admin: '管理',
}

function MasterTypeIcon({ type }: { type: string }) {
  const cls = 'w-3.5 h-3.5 inline-block mr-1 opacity-70'
  if (type === 'realestate') return <Home className={cls} />
  if (type === 'bank') return <Landmark className={cls} />
  if (type === 'loan') return <Banknote className={cls} />
  if (type === 'indexfund') return <TrendingUp className={cls} />
  return <Settings className={cls} />
}

const TYPE_LABELS: Record<string, string> = {
  purchase: '購買', sale: '出售', fee: '收錢', income: '給錢', rent: '租金',
  loan: '放款', repayment: '還款',
  long: '做多', short: '做空', long_profit: '做多獲利', short_profit: '做空獲利',
}
const INCOME_TYPES = ['income', 'loan', 'long_profit', 'short_profit', 'sale', 'rent']

export default function AdminPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [gameState, setGameState] = useState<GameState>({ month: 1 })
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([])
  const [lastFetch, setLastFetch] = useState<string>(new Date(0).toISOString())
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const fetchData = useCallback(async (since?: string) => {
    const [txRes, teamRes, zoneRes, stateRes, colRes] = await Promise.all([
      fetch(`/api/transactions${since ? `?since=${since}` : ''}`),
      fetch('/api/teams'),
      fetch('/api/zones'),
      fetch('/api/game/state'),
      fetch('/api/game/column-config'),
    ])
    if (txRes.status === 401) { router.push('/'); return }
    const [txData, teamData, zoneData, stateData, colData] = await Promise.all([
      txRes.json(), teamRes.json(), zoneRes.json(), stateRes.json(), colRes.json(),
    ])
    if (since) {
      setTransactions((prev) => [...txData, ...prev].slice(0, 100))
    } else {
      setTransactions(txData)
    }
    setTeams(teamData)
    setZones(zoneData)
    setGameState(stateData)
    setColumnConfigs(colData)
    setLastFetch(new Date().toISOString())
  }, [router])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(lastFetch), 5000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  async function handleReset() {
    setResetting(true)
    await fetch('/api/seed', { method: 'POST' })
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
          <div>
            <h1 className="text-white font-bold text-lg">總控儀表板</h1>
            <p className="text-gray-400 text-xs">所有金流匯總</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/log" className="text-xs text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5" />流水帳
          </a>
          {!resetConfirm ? (
            <button onClick={() => setResetConfirm(true)} className="text-xs text-red-500/70 hover:text-red-400 transition-colors">重置遊戲</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">清除全部資料？</span>
              <button onClick={handleReset} disabled={resetting}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50">
                {resetting ? '重置中...' : '確認'}
              </button>
              <button onClick={() => setResetConfirm(false)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
            </div>
          )}
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">離開</button>
        </div>
      </header>

      <div className="p-6 space-y-4 max-w-7xl mx-auto">

        <ColumnConfigPanel configs={columnConfigs} onSaved={() => fetchData()} />

        <NextMonthPanel
          gameState={gameState}
          zones={zones}
          teams={teams}
          columnConfigs={columnConfigs}
          onAdvance={() => fetchData()}
        />

<div className="grid md:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="font-semibold text-white">{team.name}</span>
                <span className="ml-auto text-xs text-gray-400">{team.code}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-white font-bold">${team.budget.toLocaleString()}</div>
                  <div className="text-gray-500 text-xs">剩餘預算</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold">{team._count.ownedZones}</div>
                  <div className="text-gray-500 text-xs">持有區域</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold">{team._count.transactions}</div>
                  <div className="text-gray-500 text-xs">交易次數</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">金流記錄</h2>
            <span className="text-xs text-gray-500">每5秒自動更新</span>
          </div>
          <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
            {transactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">尚無交易記錄</div>
            )}
            {transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Column Config Panel ─────────────────────────────────────────────────────

function ColumnConfigPanel({ configs, onSaved }: { configs: ColumnConfig[]; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<ColumnConfig[]>(configs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(configs) }, [configs])

  function update(column: string, field: keyof ColumnConfig, raw: string) {
    const value = parseInt(raw) || 0
    setDraft((prev) => prev.map((c) => c.column === column ? { ...c, [field]: value } : c))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/game/column-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
    setSaving(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button className="w-full px-5 py-4 flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          <span className="text-white font-semibold">月份房價設定</span>
          <span className="text-xs text-gray-500">· 遊戲開始前設定各區每月房價與租金率</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left pb-3 pr-4 font-medium">區域</th>
                  {[1, 2, 3, 4].map((m) => (
                    <th key={m} className="text-center pb-3 px-3 font-medium">第{m}月房價</th>
                  ))}
                  <th className="text-center pb-3 pl-4 font-medium">月租金率</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((c) => (
                  <tr key={c.column} className="border-t border-gray-800/60">
                    <td className="py-2.5 pr-4">
                      <span className="font-mono font-bold text-white bg-gray-800 px-2.5 py-1 rounded text-sm">{c.column} 區</span>
                    </td>
                    {(['price1', 'price2', 'price3', 'price4'] as const).map((field) => (
                      <td key={field} className="py-2.5 px-3">
                        <input
                          type="number"
                          value={c[field]}
                          onChange={(e) => update(c.column, field, e.target.value)}
                          className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500"
                          min="0"
                        />
                      </td>
                    ))}
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="number"
                          value={c.rentRate}
                          onChange={(e) => update(c.column, 'rentRate', e.target.value)}
                          className="w-16 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500"
                          min="0" max="100"
                        />
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors">
              {saving ? '儲存中...' : '儲存設定'}
            </button>
            {saved && <span className="text-green-400 text-sm">已儲存，房價已同步</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Next Month Panel ────────────────────────────────────────────────────────

function NextMonthPanel({ gameState, zones, teams, columnConfigs, onAdvance }: {
  gameState: GameState; zones: Zone[]; teams: Team[]
  columnConfigs: ColumnConfig[]; onAdvance: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const newMonth = gameState.month + 1
  const configMap = Object.fromEntries(columnConfigs.map((c) => [c.column, c]))

  const incomePreview = teams
    .map((team) => {
      const owned = zones.filter((z) => z.type === 'realestate' && z.ownedByTeamId === team.id)
      const total = owned.reduce((s, z) => {
        const config = configMap[z.code.charAt(0)]
        if (!config) return s
        const price = (config as unknown as Record<string, number>)[`price${newMonth}`] ?? z.currentPrice
        return s + Math.floor(price * config.rentRate / 100)
      }, 0)
      return { team, owned, total }
    })
    .filter((p) => p.owned.length > 0)

  async function handleAdvance() {
    setSubmitting(true)
    const res = await fetch('/api/game/next-month', { method: 'POST' })
    const data = await res.json()
    if (data.ok) { setExpanded(false); onAdvance() }
    setSubmitting(false)
  }

  if (gameState.month >= 4) {
    return (
      <div className="bg-gray-900 rounded-xl border border-yellow-800/40 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />
          <span className="text-white font-semibold">遊戲進度</span>
          <div className="flex gap-1">{[1, 2, 3, 4].map((m) => <div key={m} className="w-6 h-1.5 rounded-full bg-yellow-500" />)}</div>
        </div>
        <span className="text-yellow-400 font-bold text-sm">第 4 月 · 遊戲結束</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
          <span className="text-white font-semibold">第 {gameState.month} 月 / 共 4 月</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((m) => (
              <div key={m} className={`w-6 h-1.5 rounded-full ${m <= gameState.month ? 'bg-blue-500' : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5">
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={2} />
          進入第 {newMonth} 月
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-5 space-y-4">

          {/* New prices preview */}
          <div>
            <p className="text-xs text-gray-400 mb-2">第 {newMonth} 月各區房價</p>
            <div className="grid grid-cols-6 gap-2">
              {columnConfigs.map((c) => {
                const newPrice = (c as unknown as Record<string, number>)[`price${newMonth}`]
                const diff = newPrice - (c as unknown as Record<string, number>)[`price${gameState.month}`]
                return (
                  <div key={c.column} className="bg-gray-800 rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-white text-sm">{c.column}</div>
                    <div className="text-white font-semibold text-sm">${newPrice.toLocaleString()}</div>
                    {diff !== 0 && (
                      <div className={`text-xs ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rent preview */}
          <div>
            <p className="text-xs text-gray-400 mb-2">自動發放租金預覽</p>
            {incomePreview.length === 0 ? (
              <p className="text-xs text-gray-600">目前無小隊持有房產，不發放租金</p>
            ) : (
              <div className="space-y-1.5">
                {incomePreview.map(({ team, owned, total }) => (
                  <div key={team.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="text-sm text-white">{team.name}</span>
                      <span className="text-xs text-gray-500">{owned.length} 個地區</span>
                    </div>
                    <span className="text-green-400 font-semibold text-sm">+${total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleAdvance} disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</>
              : `確認進入第 ${newMonth} 月`}
          </button>
        </div>
      )}
    </div>
  )
}


function TransactionRow({ tx }: { tx: Transaction }) {
  const isPositive = INCOME_TYPES.includes(tx.type)
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tx.team.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{tx.team.name}</span>
          {tx.zone && <span className="text-gray-400 text-xs">→ {tx.zone.name}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center">
          <MasterTypeIcon type={tx.masterType} />
          {MASTER_LABELS[tx.masterType] || tx.masterType} · {tx.master.displayName}
          {tx.note && ` · ${tx.note}`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-semibold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : '-'}${tx.amount.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleTimeString('zh-TW')}</div>
      </div>
    </div>
  )
}
