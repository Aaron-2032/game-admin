'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Home, Landmark, Banknote, TrendingUp, TrendingDown,
  ClipboardList, CheckCircle2, XCircle, ArrowRight, Loader2,
  ArrowDownToLine, ArrowUpToLine,
} from 'lucide-react'

type Zone = {
  id: string
  name: string
  code: string
  gridX: number
  gridY: number
  type: string
  basePrice: number
  currentPrice: number
  ownedByTeamId: string | null
  ownedByTeam: { name: string; color: string; code: string } | null
}

type Team = {
  id: string
  name: string
  color: string
  code: string
  budget: number
  debt: number
  fundValue: number
  realEstateValue: number
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

const MASTER_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  realestate: { label: '房地產關主', icon: <Home className="w-6 h-6" strokeWidth={1.5} />, color: 'blue' },
  bank: { label: '銀行關主', icon: <Landmark className="w-6 h-6" strokeWidth={1.5} />, color: 'green' },
  loan: { label: '高利貸關主', icon: <Banknote className="w-6 h-6" strokeWidth={1.5} />, color: 'yellow' },
  indexfund: { label: '房價指數基金關主', icon: <TrendingUp className="w-6 h-6" strokeWidth={1.5} />, color: 'purple' },
}

const TYPE_LABELS: Record<string, string> = {
  purchase: '購買', sale: '出售', fee: '收錢', income: '給錢', rent: '租金',
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

  const info = MASTER_LABELS[masterType] || { label: '關主', icon: null, color: 'gray' }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gray-300">{info.icon}</span>
          <div>
            <h1 className="text-white font-bold text-lg">{info.label}操作台</h1>
            <p className="text-gray-400 text-xs">{user?.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/log" className="text-xs text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5" />流水帳
          </a>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">離開</button>
        </div>
      </header>

      {successMsg && (
        <div className="mx-6 mt-4 text-green-400 bg-green-900/30 border border-green-800 rounded-xl px-4 py-3 text-sm text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mx-6 mt-4 text-red-400 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-center flex items-center justify-center gap-2">
          <XCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      <div className="p-4 max-w-5xl mx-auto">
        {masterType === 'loan' ? (
          <LoanPanel teams={teams} transactions={transactions} onSubmit={submitTx} />
        ) : masterType === 'indexfund' ? (
          <IndexFundPanel teams={teams} transactions={transactions} onSubmit={submitTx} />
        ) : masterType === 'realestate' ? (
          <RealestatePanel zones={zones} teams={teams} transactions={transactions} onSubmit={submitTx} />
        ) : (
          <BankPanel teams={teams} transactions={transactions} onSubmit={submitTx} />
        )}
      </div>
    </div>
  )
}

// ── Realestate Panel (buy / sell only) ────────────────────────────────────

function RealestatePanel({
  zones, teams, transactions, onSubmit,
}: {
  zones: Zone[]
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; zoneId?: string | null; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [formType, setFormType] = useState<'purchase' | 'sale'>('purchase')
  const [teamId, setTeamId] = useState('')
  const [zoneIds, setZoneIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const availableZones = [...zones].sort((a, b) => a.code.localeCompare(b.code))
  const selectedTeam = teams.find((t) => t.id === teamId)
  const selectedZones = zones.filter((z) => zoneIds.includes(z.id))
  const zonesTotal = selectedZones.reduce((s, z) => s + z.currentPrice, 0)

  function toggleZone(z: Zone) {
    setZoneIds((prev) => prev.includes(z.id) ? prev.filter((id) => id !== z.id) : [...prev, z.id])
  }

  const canSubmit = teamId && zoneIds.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    for (const z of selectedZones) {
      const ok = await onSubmit({ teamId, zoneId: z.id, type: formType, amount: z.currentPrice, note: note || null })
      if (!ok) break
    }
    setZoneIds([])
    setNote('')
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {([['purchase', '購買', 'bg-red-600 text-white'], ['sale', '出售', 'bg-green-600 text-white']] as const).map(([value, label, active]) => (
            <button key={value} onClick={() => { setFormType(value); setZoneIds([]) }}
              className={`py-3 rounded-xl font-bold text-sm transition-colors ${formType === value ? active : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Team selection */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-2.5 font-medium">選擇小隊</p>
          <div className="grid grid-cols-3 gap-2">
            {teams.map((t) => (
              <button key={t.id} onClick={() => setTeamId((prev) => prev === t.id ? '' : t.id)}
                className="px-2 py-2.5 rounded-lg text-left transition-all"
                style={teamId === t.id
                  ? { backgroundColor: `${t.color}22`, border: `2px solid ${t.color}` }
                  : { backgroundColor: '#1f2937', border: '2px solid transparent' }}>
                <div className="text-xs font-semibold" style={{ color: teamId === t.id ? t.color : '#d1d5db' }}>{t.name}</div>
                <div className="text-xs text-gray-500">${t.budget.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone grid */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs text-gray-400 font-medium">選擇地區（可複選）</p>
            {zoneIds.length > 0 && (
              <button onClick={() => setZoneIds([])} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                清除 {zoneIds.length} 個
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
            {availableZones.map((z) => {
              const shortName = z.name.replace(/^.+[市縣]/, '')
              const isSelected = zoneIds.includes(z.id)
              return (
                <button key={z.id} onClick={() => toggleZone(z)}
                  className={`p-2 rounded-lg text-left transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-700'}`}
                  style={{ backgroundColor: isSelected ? '#1e3a5f' : z.ownedByTeam ? `${z.ownedByTeam.color}18` : '#1f2937' }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-xs font-bold text-gray-300">{z.code}</span>
                    {z.ownedByTeam && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: z.ownedByTeam.color }} />}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{shortName}</div>
                  <div className="text-xs text-gray-500">${z.currentPrice.toLocaleString()}</div>
                </button>
              )
            })}
          </div>
          {selectedZones.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedZones.map((z) => (
                <div key={z.id} className="flex items-center justify-between text-xs bg-blue-950/50 rounded-lg px-3 py-1.5">
                  <span className="text-blue-300">[{z.code}] {z.name}</span>
                  <span className="text-blue-400 font-semibold">${z.currentPrice.toLocaleString()}</span>
                </div>
              ))}
              {selectedZones.length > 1 && (
                <div className="flex items-center justify-between text-xs bg-gray-800 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400">合計 {selectedZones.length} 筆</span>
                  <span className="text-white font-bold">${zonesTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note + submit */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="備註說明" />
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</>
              : selectedZones.length > 1
                ? `確認交易（${selectedZones.length} 筆 · $${zonesTotal.toLocaleString()}）`
                : '確認交易'}
          </button>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <TransactionList transactions={transactions} />
    </div>
  )
}

// ── Bank Panel (give / collect money only) ────────────────────────────────

function BankPanel({
  teams, transactions, onSubmit,
}: {
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [formType, setFormType] = useState<'fee' | 'income'>('fee')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)
  const canSubmit = teamId && !!amount && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const ok = await onSubmit({ teamId, type: formType, amount: Number(amount), note: note || null })
    if (ok) { setAmount(''); setNote('') }
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {([['fee', '收錢', 'bg-orange-500 text-white'], ['income', '給錢', 'bg-blue-600 text-white']] as const).map(([value, label, active]) => (
            <button key={value} onClick={() => setFormType(value)}
              className={`py-3 rounded-xl font-bold text-sm transition-colors ${formType === value ? active : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Team selection */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-2.5 font-medium">選擇小隊</p>
          <div className="grid grid-cols-3 gap-2">
            {teams.map((t) => (
              <button key={t.id} onClick={() => setTeamId((prev) => prev === t.id ? '' : t.id)}
                className="px-2 py-2.5 rounded-lg text-left transition-all"
                style={teamId === t.id
                  ? { backgroundColor: `${t.color}22`, border: `2px solid ${t.color}` }
                  : { backgroundColor: '#1f2937', border: '2px solid transparent' }}>
                <div className="text-xs font-semibold" style={{ color: teamId === t.id ? t.color : '#d1d5db' }}>{t.name}</div>
                <div className="text-xs text-gray-500">${t.budget.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount + note + submit */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">金額</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg font-semibold focus:outline-none focus:border-blue-500"
              placeholder="0" min="1" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="備註說明" />
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</> : '確認交易'}
          </button>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <TransactionList transactions={transactions} />
    </div>
  )
}

// ── Loan Panel ─────────────────────────────────────────────────────────────

const INTEREST_RATE = 0.2
const LOAN_RATIO = 0.3

function LoanPanel({ teams, transactions, onSubmit }: {
  teams: Team[]
  transactions: Transaction[]
  onSubmit: (p: { teamId: string; type: string; amount: number; note?: string | null }) => Promise<boolean>
}) {
  const [action, setAction] = useState<'loan' | 'repayment'>('loan')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)
  const totalAssets = selectedTeam ? selectedTeam.budget + selectedTeam.realEstateValue : 0
  const maxLoan = Math.floor(totalAssets * LOAN_RATIO)
  const outstanding = selectedTeam?.debt ?? 0
  const remainingCapacity = Math.max(0, maxLoan - outstanding)

  const repayWithInterest = outstanding > 0 ? Math.round(outstanding * (1 + INTEREST_RATE)) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !amount) return
    setSubmitting(true)
    const principal = Number(amount)
    const autoNote = action === 'loan'
      ? `本金 $${principal.toLocaleString()}，含息需還 $${Math.round(principal * (1 + INTEREST_RATE)).toLocaleString()}`
      : undefined
    const ok = await onSubmit({ teamId, type: action, amount: principal, note: autoNote ?? null })
    if (ok) setAmount('')
    setSubmitting(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-yellow-400" strokeWidth={1.5} /> 放款 / 收款
          </h2>
          <p className="text-xs text-yellow-500 mb-4">利率：{INTEREST_RATE * 100}% · 借款上限：總資產 {LOAN_RATIO * 100}%</p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setAction('loan')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${action === 'loan' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <ArrowDownToLine className="w-4 h-4" /> 放款
            </button>
            <button onClick={() => setAction('repayment')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${action === 'repayment' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <ArrowUpToLine className="w-4 h-4" /> 收款
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">選擇小隊</label>
              <div className="grid grid-cols-3 gap-2">
                {teams.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTeamId(t.id)}
                    className="px-2 py-2.5 rounded-lg text-left transition-all"
                    style={teamId === t.id
                      ? { backgroundColor: `${t.color}22`, border: `2px solid ${t.color}` }
                      : { backgroundColor: '#1f2937', border: '2px solid transparent' }}>
                    <div className="text-xs font-semibold" style={{ color: teamId === t.id ? t.color : '#d1d5db' }}>{t.name}</div>
                    <div className="text-xs text-gray-500">${t.budget.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedTeam && (
              <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">總資產（現金 + 房產）</span>
                  <span className="text-white">${totalAssets.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">借款上限（{LOAN_RATIO * 100}%）</span>
                  <span className="text-white">${maxLoan.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">已借金額</span>
                  <span className={outstanding > 0 ? 'text-red-400' : 'text-gray-400'}>${outstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-1.5">
                  <span className="text-gray-400">剩餘可借</span>
                  <span className={remainingCapacity > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>${remainingCapacity.toLocaleString()}</span>
                </div>
                {outstanding > 0 && action === 'repayment' && (
                  <div className="flex justify-between border-t border-gray-700 pt-1.5">
                    <span className="text-yellow-400">建議還款（含息）</span>
                    <span className="text-yellow-400 font-semibold">${repayWithInterest.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {action === 'loan' ? '放款金額' : '收款金額'} *
              </label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="輸入金額" min="1" required />
              {action === 'loan' && amount && (
                <p className="text-xs text-yellow-500 mt-1">含息需還：${Math.round(Number(amount) * (1 + INTEREST_RATE)).toLocaleString()}</p>
              )}
            </div>

            <button type="submit" disabled={submitting || !teamId}
              className={`w-full py-3 font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                action === 'loan' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'
              }`}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</> : action === 'loan' ? '確認放款' : '確認收款'}
            </button>
          </form>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="font-semibold text-white mb-3">未還款餘額</h3>
          <div className="space-y-2">
            {teams.filter((t) => t.debt > 0).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm text-white">{t.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-400">${t.debt.toLocaleString()}</div>
                  <div className="text-xs text-yellow-500">含息 ${Math.round(t.debt * (1 + INTEREST_RATE)).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {teams.every((t) => t.debt === 0) && (
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
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" strokeWidth={1.5} /> 房價指數基金操作
          </h2>

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

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setDirection('long')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${direction === 'long' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <TrendingUp className="w-4 h-4" /> 做多
            </button>
            <button onClick={() => setDirection('short')}
              className={`py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${direction === 'short' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <TrendingDown className="w-4 h-4" /> 做空
            </button>
          </div>

          {phase === 'settle' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setSettleResult('profit')}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${settleResult === 'profit' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                <CheckCircle2 className="w-4 h-4" /> 獲利
              </button>
              <button onClick={() => setSettleResult('loss')}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${settleResult === 'loss' ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                <XCircle className="w-4 h-4" /> 虧損
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">選擇小隊</label>
              <div className="grid grid-cols-3 gap-2">
                {teams.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTeamId(t.id)}
                    className="px-2 py-2.5 rounded-lg text-left transition-all"
                    style={teamId === t.id
                      ? { backgroundColor: `${t.color}22`, border: `2px solid ${t.color}` }
                      : { backgroundColor: '#1f2937', border: '2px solid transparent' }}>
                    <div className="text-xs font-semibold" style={{ color: teamId === t.id ? t.color : '#d1d5db' }}>{t.name}</div>
                    <div className="text-xs text-gray-500">${t.budget.toLocaleString()}</div>
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
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />處理中...</>
                : phase === 'open'
                  ? <>{direction === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}確認{direction === 'long' ? '做多' : '做空'}</>
                  : <>{settleResult === 'profit' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}確認結算（{settleResult === 'profit' ? '獲利' : '虧損'}）</>}
            </button>
          </form>
        </div>

        {selectedTeam && <TeamStatusCard team={selectedTeam} />}
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="font-semibold text-white mb-3">各小隊倉位摘要</h3>
          <div className="space-y-2">
            {teams.filter((t) => t.fundValue > 0).map((t) => (
              <div key={t.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm font-medium text-white">{t.name}</span>
                </div>
                <span className="text-sm font-semibold text-purple-400">${t.fundValue.toLocaleString()}</span>
              </div>
            ))}
            {teams.every((t) => t.fundValue === 0) && (
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
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
        <span className="text-white font-semibold text-sm">{team.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
          <div className="text-white font-bold text-sm">${team.budget.toLocaleString()}</div>
          <div className="text-gray-500 mt-0.5">現金餘額</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
          <div className={`font-bold text-sm ${team.debt > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            ${team.debt.toLocaleString()}
          </div>
          <div className="text-gray-500 mt-0.5">負債</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
          <div className="text-purple-400 font-bold text-sm">${team.fundValue.toLocaleString()}</div>
          <div className="text-gray-500 mt-0.5">基金現值</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
          <div className="text-green-400 font-bold text-sm">${team.realEstateValue.toLocaleString()}</div>
          <div className="text-gray-500 mt-0.5">房產總值</div>
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
        <a href="/log" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">查看全部 <ArrowRight className="w-3 h-3" /></a>
      </div>
      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">尚無交易記錄</div>
        )}
        {transactions.map((tx) => {
          const isPositive = ['income', 'loan', 'long_profit', 'short_profit', 'sale', 'rent'].includes(tx.type)
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
