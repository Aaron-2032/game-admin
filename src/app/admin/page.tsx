'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Map, ClipboardList, Banknote, Users, Building2, Home, Landmark, ShoppingCart, TrendingUp, Settings } from 'lucide-react'

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

const MASTER_LABELS: Record<string, string> = {
  realestate: '房地產',
  bank: '銀行',
  market: '市場',
  loan: '高利貸',
  indexfund: '指數基金',
  admin: '管理',
}

function MasterTypeIcon({ type }: { type: string }) {
  const cls = 'w-3.5 h-3.5 inline-block mr-1 opacity-70'
  if (type === 'realestate') return <Home className={cls} />
  if (type === 'bank') return <Landmark className={cls} />
  if (type === 'market') return <ShoppingCart className={cls} />
  if (type === 'loan') return <Banknote className={cls} />
  if (type === 'indexfund') return <TrendingUp className={cls} />
  return <Settings className={cls} />
}

const TYPE_LABELS: Record<string, string> = {
  purchase: '購買', sale: '出售', fee: '費用', income: '收入',
  loan: '放款', repayment: '還款',
  long: '做多', short: '做空', long_profit: '做多獲利', short_profit: '做空獲利',
}
const INCOME_TYPES = ['income', 'loan', 'long_profit', 'short_profit', 'sale']

export default function AdminPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [lastFetch, setLastFetch] = useState<string>(new Date(0).toISOString())

  const fetchData = useCallback(async (since?: string) => {
    const [txRes, teamRes] = await Promise.all([
      fetch(`/api/transactions${since ? `?since=${since}` : ''}`),
      fetch('/api/teams'),
    ])
    if (txRes.status === 401) { router.push('/'); return }
    const [txData, teamData] = await Promise.all([txRes.json(), teamRes.json()])
    if (since) {
      setTransactions((prev) => [...txData, ...prev].slice(0, 100))
    } else {
      setTransactions(txData)
    }
    setTeams(teamData)
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
