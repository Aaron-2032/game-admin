import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return Response.json({ error: '請輸入帳號密碼' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username }, include: { team: true } })
  if (!user) {
    return Response.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const hash = await hashPassword(password)
  if (hash !== user.passwordHash) {
    return Response.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const token = await signToken({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    masterType: user.masterType,
    teamId: user.teamId,
  })

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return Response.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    masterType: user.masterType,
    teamId: user.teamId,
  })
}
