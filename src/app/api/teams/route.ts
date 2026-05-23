import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { ownedZones: true, transactions: true } },
    },
    orderBy: { code: 'asc' },
  })

  return Response.json(teams)
}
