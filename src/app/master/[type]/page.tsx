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
  note: string | null
  createdAt: string
  team: { name: string; color: string }
  zone: { name: string; code: string } | null
  master: { displayName: string }
}

const MASTER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  realestate: { label: '房地產關主', icon: '🏠', color: 'blue' },
  bank: { label: '銀行關主', icon: '🏦', color: 'green' },
  market: { label: '市場關主', icon: '🛒', color: 'amber' },
  loan: { label: '高利貸關主', icon: '💰', color: 'yellow' },
  indexfund: { label: '房價指數基金關主', icon: '📈', color: 'purple' },
}

const TYPE_OPTIONS = [
  { value: 'purchase', label: '購買' },
  { value: 'sale', label: '出售' },
  { value: 'fee', label: '費用收取' },
  { value: 'income', label: '給予收入' },
]

const TYPE_LABELS: Record<string, string> = {
  purchase: '購買', sale: '出售', fee: '費用', income: '收入',
  loan: '放款', repayment: '還款',
  long: '做多', short: '做空', long_profit: '做多獲利', short_profit: '做空獲利',
}

export default function MasterPage() {
  const router = useRouter()
  const params = useParams()
  const masterType = params.type as string

  const [zones, setZones] = useState<Zone[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null)

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

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

  async function submitTx(payload: { teamId: string; zoneId?: string | null; type: string; amount: number; note?: string | null }) {
    setErrorMsg('')
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const d = await res.json()
      setErrorMsg(d.error || '提交失敗')
      return false
    }
    setSuccessMsg('交易記錄成功！')
    setTimeout(() => setSuccessMsg(''), 3000)
    fetchData()
    return true
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const info = MASTER_LABELS[masterType] || { label: '關主', icon: '⚙️', color: 'gray' }

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
        <div className="flex items-center gap-3">
          <a href="/log" className="text-xs text-gray-400 hover:text-blue-400 transition-colors">流水帳</a>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">登出</button>
        </div>
      </header>

      {successMsg && (
        <div className="mx-6 mt-4 text-green-400 bg-green-900/30 border border-green-800 rounded-xl px-4 py-3 text-sm text-center">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mx-6 mt-4 text-red-400 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-center">
          ✗ {errorMsg}
        </div>
      )}

      <div className="p-4 max-w-5xl mx-auto">
        {masterType === 'loan' ? (
          <LoanPanel teams={teams} transactions={transactions} onSubmit={submitTx} />
        ) : masterType === 'indexfund' ? (
          <IndexFundPanel teams={teams} transactions={transactions} onSubmit={submitTx} />
        ) : (
          <GenericPanel
            masterType={masterType}
            zones={zones}
            teams={teams}
            transactions={transactions}
            onSubmit={submitTx}
          />
        )}
      </div>
    </div>
  )
}

// ── Generic Panel (realestate / bank / market) ─────────────────────────────

function GenericPanel({
  masterType, zones, teams, transactions, onSubmit,
}: {
  masterType: string
  zones: Zone[]
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; zoneId?: string | null; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [formTeamId, setFormTeamId] = useState('')
  const [formZoneId, setFormZoneId] = useState('')
  const [formType, setFormType] = useState('purchase')
  const [formAmount, setFormAmount] = useState('')
  const [formNote, setFormNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const availableZones = masterType === 'realestate' ? zones.filter((z) => z.type === 'realestate') : zones
  const selectedTeam = teams.find((t) => t.id === formTeamId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTeamId || !formAmount) return
    setSubmitting(true)
    const ok = await onSubmit({ teamId: formTeamId, zoneId: formZoneId || null, type: formType, amount: Number(formAmount), note: formNote || null })
    if (ok) { setFormZoneId(''); setFormAmount(''); setFormNote('') }
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4">新增交易</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">選擇小隊 *</label>
              <select value={formTeamId} onChange={(e) => setFormTeamId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required>
                <option value="">-- 選擇小隊 --</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} (${t.budget.toLocaleString()})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">選擇區域（選填）</label>
              <select value={formZoneId} onChange={(e) => { setFormZoneId(e.target.value); const z = zones.find((z) => z.id === e.target.value); if (z) setFormAmount(z.basePrice.toString()) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option value="">-- 無特定區域 --</option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>[{z.code}] {z.name} - ${z.basePrice.toLocaleString()}{z.ownedByTeam ? ` (${z.ownedByTeam.name})` : ' (空地)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">交易類型 *</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">金額 *</label>
              <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="輸入金額" min="1" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">備註（選填）</label>
              <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="備註說明" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors">
              {submitting ? '提交中...' : '確認交易'}
            </button>
          </form>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <TransactionList transactions={transactions} />
    </div>
  )
}

// ── Loan Panel ─────────────────────────────────────────────────────────────

function LoanPanel({ teams, transactions, onSubmit }: {
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [action, setAction] = useState<'loan' | 'repayment'>('loan')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)

  // Calculate outstanding balance per team from transactions
  const loanMap: Record<string, number> = {}
  for (const tx of transactions) {
    const key = tx.team.name
    if (tx.type === 'loan') loanMap[key] = (loanMap[key] || 0) + tx.amount
    if (tx.type === 'repayment') loanMap[key] = (loanMap[key] || 0) - tx.amount
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !amount) return
    setSubmitting(true)
    const ok = await onSubmit({ teamId, type: action, amount: Number(amount), note: note || null })
    if (ok) { setAmount(''); setNote('') }
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4">💰 放款 / 收款</h2>

          {/* Action toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setAction('loan')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors ${action === 'loan' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              💸 放款
            </button>
            <button onClick={() => setAction('repayment')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors ${action === 'repayment' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              ✅ 收款
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">選擇小隊</label>
              <div className="grid grid-cols-2 gap-2">
                {teams.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTeamId(t.id)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${teamId === t.id ? 'ring-2 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    style={teamId === t.id ? { backgroundColor: `${t.color}33`, borderColor: t.color, border: `2px solid ${t.color}` } : {}}>
                    <div style={{ color: teamId === t.id ? t.color : undefined }}>{t.name}</div>
                    <div className="text-xs text-gray-400">${t.budget.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">金額 *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="輸入金額" min="1" required />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">備註（利率、期限等）</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="例：月息 10%" />
            </div>

            <button type="submit" disabled={submitting || !teamId}
              className={`w-full py-3 font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                action === 'loan' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'
              }`}>
              {submitting ? '處理中...' : action === 'loan' ? '確認放款' : '確認收款'}
            </button>
          </form>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <div className="space-y-4">
        {/* Outstanding loans summary */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="font-semibold text-white mb-3">未還款餘額</h3>
          <div className="space-y-2">
            {teams.map((t) => {
              const balance = loanMap[t.name] || 0
              if (balance === 0) return null
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm text-white">{t.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ${Math.abs(balance).toLocaleString()}
                    {balance < 0 ? ' (超還)' : ''}
                  </span>
                </div>
              )
            })}
            {Object.values(loanMap).every((v) => v === 0) && (
              <div className="text-center text-gray-500 text-sm py-4">目前無未還款記錄</div>
            )}
          </div>
        </div>

        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}

// ── Index Fund Panel ────────────────────────────────────────────────────────

function IndexFundPanel({ teams, transactions, onSubmit }: {
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [phase, setPhase] = useState<'open' | 'settle'>('open')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [settleResult, setSettleResult] = useState<'profit' | 'loss'>('profit')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)

  // Summarize positions per team
  const positions: Record<string, { long: number; short: number; long_profit: number; short_profit: number }> = {}
  for (const tx of transactions) {
    const key = tx.team.name
    if (!positions[key]) positions[key] = { long: 0, short: 0, long_profit: 0, short_profit: 0 }
    if (tx.type === 'long') positions[key].long += tx.amount
    if (tx.type === 'short') positions[key].short += tx.amount
    if (tx.type === 'long_profit') positions[key].long_profit += tx.amount
    if (tx.type === 'short_profit') positions[key].short_profit += tx.amount
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !amount) return
    setSubmitting(true)
    let type: string
    if (phase === 'open') {
      type = direction
    } else {
      type = direction === 'long'
        ? (settleResult === 'profit' ? 'long_profit' : 'fee')
        : (settleResult === 'profit' ? 'short_profit' : 'fee')
    }
    const ok = await onSubmit({ teamId, type, amount: Number(amount), note: note || null })
    if (ok) { setAmount(''); setNote('') }
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4">📈 房價指數基金操作</h2>

          {/* Phase toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setPhase('open')}
              className={`py-2.5 rounded-lg font-semibold text-sm transition-colors ${phase === 'open' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              建立倉位
            </button>
            <button onClick={() => setPhase('settle')}
              className={`py-2.5 rounded-lg font-semibold text-sm transition-colors ${phase === 'settle' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              結算平倉
            </button>
          </div>

          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setDirection('long')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors ${direction === 'long' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              📈 做多 (Long)
            </button>
            <button onClick={() => setDirection('short')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors ${direction === 'short' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              📉 做空 (Short)
            </button>
          </div>

          {/* Settle result */}
          {phase === 'settle' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setSettleResult('profit')}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-colors ${settleResult === 'profit' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                ✅ 獲利
              </button>
              <button onClick={() => setSettleResult('loss')}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-colors ${settleResult === 'loss' ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                ❌ 虧損
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">選擇小隊</label>
              <div className="grid grid-cols-2 gap-2">
                {teams.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTeamId(t.id)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${teamId === t.id ? 'ring-2 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    style={teamId === t.id ? { backgroundColor: `${t.color}33`, border: `2px solid ${t.color}` } : {}}>
                    <div style={{ color: teamId === t.id ? t.color : undefined }}>{t.name}</div>
                    <div className="text-xs text-gray-400">${t.budget.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {phase === 'open' ? '投入金額 *' : '結算金額 *'}
              </label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="輸入金額" min="1" required />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">備註（選填）</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                placeholder="例：指數從 100 漲到 120" />
            </div>

            <button type="submit" disabled={submitting || !teamId}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
              {submitting ? '處理中...' : phase === 'open'
                ? `確認${direction === 'long' ? '做多' : '做空'}`
                : `確認結算（${settleResult === 'profit' ? '獲利' : '虧損'}）`}
            </button>
          </form>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <div className="space-y-4">
        {/* Position summary */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="font-semibold text-white mb-3">各小隊倉位摘要</h3>
          <div className="space-y-2">
            {teams.map((t) => {
              const p = positions[t.name]
              if (!p || (p.long + p.short === 0)) return null
              const netLong = p.long - p.long_profit
              const netShort = p.short - p.short_profit
              return (
                <div key={t.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-medium text-white">{t.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {netLong > 0 && (
                      <div className="bg-green-900/30 rounded px-2 py-1">
                        <span className="text-green-400">📈 做多：${netLong.toLocaleString()}</span>
                      </div>
                    )}
                    {netShort > 0 && (
                      <div className="bg-red-900/30 rounded px-2 py-1">
                        <span className="text-red-400">📉 做空：${netShort.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {Object.values(positions).every((p) => p.long + p.short === 0) && (
              <div className="text-center text-gray-500 text-sm py-4">目前無持倉記錄</div>
            )}
          </div>
        </div>

        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

function TeamStatusCard({ team }: { team: Team }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">小隊狀態</h3>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
        <span className="text-white font-semibold">{team.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-white font-bold">${team.budget.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">剩餘預算</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-white font-bold">{team._count.ownedZones}</div>
          <div className="text-gray-500 text-xs">持有區域</div>
        </div>
      </div>
    </div>
  )
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-white">我的交易記錄</h2>
        <a href="/log" className="text-xs text-blue-400 hover:text-blue-300">查看全部 →</a>
      </div>
      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">尚無交易記錄</div>
        )}
        {transactions.map((tx) => {
          const isPositive = ['income', 'loan', 'long_profit', 'short_profit', 'sale'].includes(tx.type)
          return (
            <div key={tx.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tx.team.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{tx.team.name}</div>
                <div className="text-xs text-gray-400">
                  {TYPE_LABELS[tx.type] || tx.type}
                  {tx.zone ? ` · ${tx.zone.name}` : ''}
                  {tx.note ? ` · ${tx.note}` : ''}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : '-'}${tx.amount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
