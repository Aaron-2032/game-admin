'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Zone = {
  id: string
  name: string
  code: string
  gridX: number
  gridY: number
  type: string
  basePrice: number
  ownedByTeamId: string | null
  ownedByTeam: { name: string; color: string; code: string } | null
}

type Team = {
  id: string
  name: string
  color: string
  code: string
  budget: number
  _count: { ownedZones: number }
}

type Transaction = {
  id: string
  amount: number
  type: string
  createdAt: string
  team: { name: string; color: string }
  zone: { name: string; code: string } | null
}

const MASTER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  realestate: { label: '房地產關主', icon: '🏠', color: 'blue' },
  bank: { label: '銀行關主', icon: '🏦', color: 'green' },
  market: { label: '市場關主', icon: '🛒', color: 'amber' },
}

const TYPE_OPTIONS = [
  { value: 'purchase', label: '購買' },
  { value: 'sale', label: '出售' },
  { value: 'fee', label: '費用收取' },
  { value: 'income', label: '給予收入' },
]

export default function MasterPage() {
  const router = useRouter()
  const params = useParams()
  const masterType = params.type as string

  const [zones, setZones] = useState<Zone[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null)

  const [formTeamId, setFormTeamId] = useState('')
  const [formZoneId, setFormZoneId] = useState('')
  const [formType, setFormType] = useState('purchase')
  const [formAmount, setFormAmount] = useState('')
  const [formNote, setFormNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(async () => {
    const [meRes, zoneRes, teamRes, txRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/zones'),
      fetch('/api/teams'),
      fetch('/api/transactions'),
    ])
    if (meRes.status === 401) { router.push('/'); return }
    const [me, zonesData, teamsData, txData] = await Promise.all([
      meRes.json(), zoneRes.json(), teamRes.json(), txRes.json(),
    ])
    setUser(me)
    setZones(zonesData)
    setTeams(teamsData)
    setTransactions(txData)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTeamId || !formAmount) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: formTeamId,
          zoneId: formZoneId || null,
          type: formType,
          amount: Number(formAmount),
          note: formNote || null,
        }),
      })
      if (!res.ok) throw new Error('提交失敗')
      setSuccessMsg('交易記錄成功！')
      setFormZoneId('')
      setFormAmount('')
      setFormNote('')
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchData()
    } catch {
      alert('提交失敗，請重試')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const info = MASTER_LABELS[masterType] || { label: '關主', icon: '⚙️', color: 'gray' }
  const selectedTeam = teams.find((t) => t.id === formTeamId)
  const availableZones = masterType === 'realestate'
    ? zones.filter((z) => z.type === 'realestate')
    : zones

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h1 className="text-white font-bold text-lg">{info.label}操作台</h1>
            <p className="text-gray-400 text-xs">{user?.displayName}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">登出</button>
      </header>

      <div className="p-6 max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="font-semibold text-white mb-4">新增交易</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">選擇小隊 *</label>
                <select
                  value={formTeamId}
                  onChange={(e) => setFormTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- 選擇小隊 --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (預算: ${t.budget.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">選擇區域（選填）</label>
                <select
                  value={formZoneId}
                  onChange={(e) => {
                    setFormZoneId(e.target.value)
                    const zone = zones.find((z) => z.id === e.target.value)
                    if (zone) setFormAmount(zone.basePrice.toString())
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- 無特定區域 --</option>
                  {availableZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      [{z.code}] {z.name} - ${z.basePrice.toLocaleString()}
                      {z.ownedByTeam ? ` (${z.ownedByTeam.name})` : ' (空地)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">交易類型 *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">金額 *</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="輸入金額"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">備註（選填）</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="備註說明"
                />
              </div>

              {successMsg && (
                <div className="text-green-400 bg-green-900/30 border border-green-800 rounded-lg px-3 py-2 text-sm">
                  ✓ {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
              >
                {submitting ? '提交中...' : '確認交易'}
              </button>
            </form>
          </div>

          {selectedTeam && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">小隊狀態</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTeam.color }} />
                <span className="text-white font-semibold">{selectedTeam.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <div className="text-white font-bold">${selectedTeam.budget.toLocaleString()}</div>
                  <div className="text-gray-500 text-xs">剩餘預算</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <div className="text-white font-bold">{selectedTeam._count.ownedZones}</div>
                  <div className="text-gray-500 text-xs">持有區域</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">我的交易記錄</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
            {transactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">尚無交易記錄</div>
            )}
            {transactions.map((tx) => (
              <div key={tx.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tx.team.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{tx.team.name}</div>
                  {tx.zone && <div className="text-xs text-gray-400">{tx.zone.name}</div>}
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleTimeString('zh-TW')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
