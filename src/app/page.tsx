'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登入失敗')
        return
      }
      if (data.role === 'admin') router.push('/admin')
      else if (data.role === 'master') router.push(`/master/${data.masterType}`)
      else router.push('/map')
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🗺️</div>
          <h1 className="text-2xl font-bold text-white">大地遊戲管理系統</h1>
          <p className="text-gray-400 text-sm mt-1">請輸入帳號密碼登入</p>
        </div>

        <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="輸入帳號"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="輸入密碼"
              required
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="mt-6 bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-xs font-medium text-gray-400 mb-2">DEMO 帳號</p>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between"><span>總控</span><span className="font-mono">admin / admin888</span></div>
            <div className="flex justify-between"><span>房地產關主</span><span className="font-mono">master_re / demo123</span></div>
            <div className="flex justify-between"><span>銀行關主</span><span className="font-mono">master_bank / demo123</span></div>
            <div className="flex justify-between"><span>市場關主</span><span className="font-mono">master_market / demo123</span></div>
            <div className="flex justify-between"><span>第一小隊隊輔</span><span className="font-mono">team1 / demo123</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
