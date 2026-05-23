'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

const ZONE_TYPE_ICONS: Record<string, string> = {
  realestate: '🏠',
  resource: '⛏️',
  special: '⭐',
}

export default function MapPage() {
  const router = useRouter()
  const [zones, setZones] = useState<Zone[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Zone | null>(null)
  const [user, setUser] = useState<{ displayName: string; teamId?: string | null } | null>(null)

  const fetchData = useCallback(async () => {
    const [meRes, zoneRes, teamRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/zones'),
      fetch('/api/teams'),
    ])
    if (meRes.status === 401) { router.push('/'); return }
    const [me, zonesData, teamsData] = await Promise.all([meRes.json(), zoneRes.json(), teamRes.json()])
    setUser(me)
    setZones(zonesData)
    setTeams(teamsData)
  }, [router])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const gridSize = 6
  const grid: (Zone | null)[][] = Array.from({ length: gridSize }, (_, y) =>
    Array.from({ length: gridSize }, (_, x) =>
      zones.find((z) => z.gridX === x && z.gridY === y) || null
    )
  )

  const myTeam = user?.teamId ? teams.find((t) => t.id === user.teamId) : null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {myTeam && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: myTeam.color }} />}
          <div>
            <h1 className="text-white font-bold text-lg">區域分布圖</h1>
            <p className="text-gray-400 text-xs">
              {myTeam ? `${myTeam.name} 隊輔` : user?.displayName} · 每5秒自動更新
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">登出</button>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                {grid.map((row, y) =>
                  row.map((zone, x) => {
                    if (!zone) return <div key={`${x}-${y}`} className="aspect-square" />
                    const isOwned = !!zone.ownedByTeam
                    const isMyTeam = zone.ownedByTeamId === user?.teamId
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelected(zone)}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 transition-all hover:scale-105 ${
                          selected?.id === zone.id ? 'ring-2 ring-white' : ''
                        } ${isMyTeam ? 'border-white' : 'border-gray-700'}`}
                        style={{
                          backgroundColor: isOwned
                            ? `${zone.ownedByTeam!.color}33`
                            : 'rgb(31 41 55)',
                          borderColor: isOwned ? zone.ownedByTeam!.color : undefined,
                        }}
                        title={zone.name}
                      >
                        <span className="text-xs leading-none">{ZONE_TYPE_ICONS[zone.type] || '📍'}</span>
                        <span className="text-[10px] text-gray-300 mt-0.5 font-mono">{zone.code}</span>
                        {isOwned && (
                          <span
                            className="text-[8px] font-bold mt-0.5"
                            style={{ color: zone.ownedByTeam!.color }}
                          >
                            {zone.ownedByTeam!.code}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="text-gray-300">{team.name}</span>
                    <span className="text-gray-500">({team._count.ownedZones}區)</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                  <span className="text-gray-500">空地</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {selected && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <h3 className="font-semibold text-white mb-3">區域詳情</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">代碼</span>
                    <span className="text-white font-mono font-bold">{selected.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">名稱</span>
                    <span className="text-white">{selected.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">類型</span>
                    <span className="text-white">{ZONE_TYPE_ICONS[selected.type]} {selected.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">底價</span>
                    <span className="text-white">${selected.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">持有</span>
                    {selected.ownedByTeam ? (
                      <span className="font-semibold" style={{ color: selected.ownedByTeam.color }}>
                        {selected.ownedByTeam.name}
                      </span>
                    ) : (
                      <span className="text-gray-500">無人持有</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h3 className="font-semibold text-white mb-3">各隊狀態</h3>
              <div className="space-y-3">
                {teams.map((team) => {
                  const isMyTeam = team.id === user?.teamId
                  return (
                    <div
                      key={team.id}
                      className={`rounded-lg p-3 ${isMyTeam ? 'bg-gray-700 ring-1' : 'bg-gray-800'}`}
                      style={isMyTeam ? { borderColor: team.color } : {}}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                        <span className="text-white text-sm font-medium">{team.name}</span>
                        {isMyTeam && <span className="text-xs text-gray-400">(我隊)</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                        <span>預算: <span className="text-white">${team.budget.toLocaleString()}</span></span>
                        <span>區域: <span className="text-white">{team._count.ownedZones}</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
