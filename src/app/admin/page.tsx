'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Map, ClipboardList, Banknote, Users, Building2, Home, Landmark,
  TrendingUp, Settings, Calendar, ChevronDown, Loader2,
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

type Team = {
  id: string
  name: string
  color: string
  code: string
  budget: number
  _count: { ownedZones: number; transactions: number }
}

type Zone = {
  id: string
  name: string
  code: string
  type: string
  currentPrice: number
  ownedByTeamId: string | null
  ownedByTeam: { name: string; color: string } | null
}

type GameState = { month: number; rentRate: number }

const MASTER_LABELS: Record<string, string> = {
  realestate: '房地產', bank: '銀行', loan: '高利貸',
  indexfund: '指數基金', admin: '管理',
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
  const [gameState, setGameState] = useState<GameState>({ month: 1, rentRate: 10 })
  const [lastFetch, setLastFetch] = useState<string>(new Date(0).toISOString())

  const fetchData = useCallback(async (since?: string) => {
    const [txRes, teamRes, zoneRes, stateRes] = await Promise.all([
      fetch(`/api/transactions${since ? `?since=${since}` : ''}`),
      fetch('/api/teams'),
      fetch('/api/zones'),
      fetch('/api/game/state'),
    ])
    if (txRes.status === 401) { router.push('/'); return }
    const [txData, teamData, zoneData, stateData] = await Promise.all([
      txRes.json(), teamRes.json(), zoneRes.json(), stateRes.json(),
    ])
    if (since) {
      setTransactions((prev) => [...txData, ...prev].slice(0, 100))
    } else {
      setTransactions(txData)
    }
    setTeams(teamData)
    setZones(zoneData)
    setGameState(stateData)
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

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)

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
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">離開</button>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        <NextMonthPanel
          gameState={gameState}
          zones={zones}
          teams={teams}
          onAdvance={() => fetchData()}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="交易總筆數" value={transactions.length.toString()} icon={<ClipboardList className="w-5 h-5" />} />
          <StatCard label="總金流" value={`$${totalSpent.toLocaleString()}`} icon={<Banknote className="w-5 h-5" />} />
          <StatCard label="小隊數量" value={teams.length.toString()} icon={<Users className="w-5 h-5" />} />
          <StatCard label="已購區域" value={teams.reduce((s, t) => s + t._count.ownedZones, 0).toString()} icon={<Building2 className="w-5 h-5" />} />
        </div>

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
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Next Month Panel ────────────────────────────────────────────────────────

function NextMonthPanel({ gameState, zones, teams, onAdvance }: {
  gameState: GameState
  zones: Zone[]
  teams: Team[]
  onAdvance: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [rentRate, setRentRate] = useState(gameState.rentRate.toString())
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const realEstateZones = zones
    .filter((z) => z.type === 'realestate')
    .sort((a, b) => a.code.localeCompare(b.code))

  function getNewPrice(z: Zone) {
    const v = prices[z.id]
    return v && !isNaN(parseInt(v)) ? parseInt(v) : z.currentPrice
  }

  const rate = parseInt(rentRate) || 0
  const incomePreview = teams
    .map((team) => {
      const owned = realEstateZones.filter((z) => z.ownedByTeamId === team.id)
      const total = owned.reduce((s, z) => s + Math.floor(getNewPrice(z) * rate / 100), 0)
      return { team, owned, total }
    })
    .filter((p) => p.owned.length > 0)

  async function handleAdvance() {
    setSubmitting(true)
    const priceMap: Record<string, number> = {}
    for (const [id, val] of Object.entries(prices)) {
      if (val && !isNaN(parseInt(val))) priceMap[id] = parseInt(val)
    }
    const res = await fetch('/api/game/next-month', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prices: priceMap, rentRate: rate }),
    })
    const data = await res.json()
    if (data.ok) {
      setExpanded(false)
      setPrices({})
      onAdvance()
    }
    setSubmitting(false)
  }

  if (gameState.month >= 4) {
    return (
      <div className="bg-gray-900 rounded-xl border border-yellow-800/50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />
          <span className="text-white font-semibold">遊戲進度</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((m) => (
              <div key={m} className="w-6 h-1.5 rounded-full bg-yellow-500" />
            ))}
          </div>
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
          進入第 {gameState.month + 1} 月
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-5 space-y-5">

          {/* Rent rate */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 flex-shrink-0">月租金率</label>
            <input type="number" value={rentRate} onChange={(e) => setRentRate(e.target.value)}
              className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              min="0" max="100" />
            <span className="text-gray-500 text-sm">% · 依各地區當月房價計算</span>
          </div>

          {/* Zone price inputs */}
          <div>
            <p className="text-xs text-gray-400 mb-3">調整地區房價（不填維持原價）</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-0.5">
              {realEstateZones.map((z) => (
                <div key={z.id} className="bg-gray-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-gray-300">{z.code}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 truncate max-w-[60px]">{z.name.replace(/^.+[市縣]/, '')}</span>
                      {z.ownedByTeam && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: z.ownedByTeam.color }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 flex-shrink-0">${z.currentPrice.toLocaleString()}</span>
                    <span className="text-gray-600 text-xs">→</span>
                    <input
                      type="number"
                      value={prices[z.id] || ''}
                      onChange={(e) => setPrices((prev) => ({ ...prev, [z.id]: e.target.value }))}
                      className="w-0 flex-1 min-w-0 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                      placeholder={z.currentPrice.toString()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income preview */}
          <div>
            <p className="text-xs text-gray-400 mb-2">租金發放預覽</p>
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
              : `確認進入第 ${gameState.month + 1} 月`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-1 text-gray-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
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
        <div className="text-xs text-gray-500">
          {new Date(tx.createdAt).toLocaleTimeString('zh-TW')}
        </div>
      </div>
    </div>
  )
}
