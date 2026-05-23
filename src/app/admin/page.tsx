'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  realestate: '🏠 房地產',
  bank: '🏦 銀行',
  market: '🛒 市場',
  admin: '⚙️ 管理',
}

const TYPE_LABELS: Record<string, string> = {
  purchase: '購買',
  sale: '出售',
  fee: '費用',
  income: '收入',
}

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
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-white font-bold text-lg">總控儀表板</h1>
            <p className="text-gray-400 text-xs">所有金流匯總</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
          登出
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="交易總筆數" value={transactions.length.toString()} icon="📋" />
          <StatCard label="總金流" value={`$${totalSpent.toLocaleString()}`} icon="💰" />
          <StatCard label="小隊數量" value={teams.length.toString()} icon="👥" />
          <StatCard label="已購區域" value={teams.reduce((s, t) => s + t._count.ownedZones, 0).toString()} icon="🏘️" />
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

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const MASTER_LABELS: Record<string, string> = {
    realestate: '🏠 房地產',
    bank: '🏦 銀行',
    market: '🛒 市場',
    admin: '⚙️ 管理',
  }
  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tx.team.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{tx.team.name}</span>
          {tx.zone && <span className="text-gray-400 text-xs">→ {tx.zone.name}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {MASTER_LABELS[tx.masterType] || tx.masterType} · {tx.master.displayName}
          {tx.note && ` · ${tx.note}`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
          {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(tx.createdAt).toLocaleTimeString('zh-TW')}
        </div>
      </div>
    </div>
  )
}
