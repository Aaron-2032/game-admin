import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  const teamId = searchParams.get('teamId')
  const masterType = searchParams.get('masterType')

  const where: Record<string, unknown> = {}
  if (since) where.createdAt = { gt: new Date(since) }
  if (teamId) where.teamId = teamId
  if (masterType) where.masterType = masterType
  if (session.role === 'master' && session.masterType) {
    where.masterType = session.masterType
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      team: { select: { name: true, color: true, code: true } },
      zone: { select: { name: true, code: true } },
      master: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return Response.json(transactions)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.role !== 'master' && session.role !== 'admin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { teamId, zoneId, type, amount, note } = body

  if (!teamId || !type || !amount) {
    return Response.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const masterType = session.masterType || 'admin'

  const tx = await prisma.$transaction(async (db) => {
    const transaction = await db.transaction.create({
      data: {
        teamId,
        zoneId: zoneId || null,
        masterId: session.id,
        masterType,
        type,
        amount: Number(amount),
        note: note || null,
      },
      include: {
        team: { select: { name: true, color: true, code: true } },
        zone: { select: { name: true, code: true } },
        master: { select: { displayName: true } },
      },
    })

    if (zoneId && type === 'purchase') {
      await db.zone.update({
        where: { id: zoneId },
        data: { ownedByTeamId: teamId },
      })
    }

    if (zoneId && type === 'sale') {
      await db.zone.update({
        where: { id: zoneId },
        data: { ownedByTeamId: null },
      })
    }

    await db.team.update({
      where: { id: teamId },
      data: { budget: { decrement: Number(amount) } },
    })

    return transaction
  })

  return Response.json(tx, { status: 201 })
}
