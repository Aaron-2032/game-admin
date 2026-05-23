'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Map, Settings, Target, Users, Home, Landmark, ShoppingCart, Banknote, TrendingUp, Loader2 } from 'lucide-react'

type UserCard = {
  id: string
  username: string
  displayName: string
  role: string
  masterType: string | null
  teamId: string | null
  team: { name: string; color: string; code: string } | null
}

function MasterIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'w-8 h-8'
  if (type === 'realestate') return <Home className={cls} />
  if (type === 'bank') return <Landmark className={cls} />
  if (type === 'market') return <ShoppingCart className={cls} />
  if (type === 'loan') return <Banknote className={cls} />
  if (type === 'indexfund') return <TrendingUp className={cls} />
  return <Target className={cls} />
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
      .catch(() => { setError('無法載入身分列表，請確認資料庫已初始化'); setLoading(false) })
  }, [])

  async function handleSelect(username: string) {
    setSelecting(username)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '登入失敗'); setSelecting(null); return }
      if (data.role === 'admin') router.push('/admin')
      else if (data.role === 'master') router.push(`/master/${data.masterType}`)
      else router.push('/map')
    } catch {
      setError('網路錯誤，請稍後再試')
      setSelecting(null)
    }
  }

  const admins = users.filter((u) => u.role === 'admin')
  const masters = users.filter((u) => u.role === 'master')
  const assistants = users.filter((u) => u.role === 'assistant')

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <Map className="w-16 h-16 text-blue-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white">大地遊戲管理系統</h1>
          <p className="text-gray-400 mt-2">請選擇您的身分</p>
        </div>

        {error && (
          <div className="mb-6 text-red-400 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-center text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>載入中...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">尚未初始化資料</p>
            <button
              onClick={async () => {
                setLoading(true)
                await fetch('/api/seed', { method: 'POST' })
                const r = await fetch('/api/users')
                setUsers(await r.json())
                setLoading(false)
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
            >
              初始化 DEMO 資料
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {admins.length > 0 && (
              <Section title="總控管理員" icon={<Settings className="w-4 h-4 text-gray-400" />}>
                {admins.map((u) => (
                  <IdentityCard
                    key={u.id}
                    icon={<Settings className="w-8 h-8" strokeWidth={1.5} />}
                    label={u.displayName}
                    sub="可查看所有金流"
                    color="#6B7280"
                    loading={selecting === u.username}
                    onClick={() => handleSelect(u.username)}
                  />
                ))}
              </Section>
            )}

            {masters.length > 0 && (
              <Section title="關主" icon={<Target className="w-4 h-4 text-gray-400" />}>
                {masters.map((u) => (
                  <IdentityCard
                    key={u.id}
                    icon={<MasterIcon type={u.masterType || ''} />}
                    label={u.displayName}
                    sub={`${u.masterType} 關主`}
                    color="#3B82F6"
                    loading={selecting === u.username}
                    onClick={() => handleSelect(u.username)}
                  />
                ))}
              </Section>
            )}

            {assistants.length > 0 && (
              <Section title="隊輔" icon={<Users className="w-4 h-4 text-gray-400" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {assistants.map((u) => (
                    <IdentityCard
                      key={u.id}
                      icon={
                        <div
                          className="w-8 h-8 rounded-full border-2 border-current"
                          style={{ backgroundColor: `${u.team?.color || '#6B7280'}33`, borderColor: u.team?.color || '#6B7280' }}
                        />
                      }
                      label={u.team?.name || u.displayName}
                      sub="隊輔（唯讀地圖）"
                      color={u.team?.color || '#6B7280'}
                      loading={selecting === u.username}
                      onClick={() => handleSelect(u.username)}
                      compact
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  )
}

function IdentityCard({
  icon, label, sub, color, loading, onClick, compact = false,
}: {
  icon: React.ReactNode; label: string; sub: string; color: string
  loading: boolean; onClick: () => void; compact?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!!loading}
      className={`w-full text-left rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${compact ? 'p-3' : 'p-4'}`}
      style={{
        borderColor: loading ? color : 'transparent',
        backgroundColor: `${color}18`,
        boxShadow: loading ? `0 0 0 2px ${color}` : undefined,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = color }}
      onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent' }}
    >
      <div className={`flex items-center gap-3 ${compact ? '' : 'mb-1'}`}>
        <span className={`flex-shrink-0 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} style={{ color: loading ? '#9CA3AF' : color }}>
          {loading ? <Loader2 className="w-full h-full animate-spin" /> : icon}
        </span>
        <div>
          <div className="font-semibold text-white text-sm">{label}</div>
          {!compact && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 text-xs font-medium" style={{ color }}>
          {loading ? '進入中...' : '點擊進入 →'}
        </div>
      )}
    </button>
  )
}
