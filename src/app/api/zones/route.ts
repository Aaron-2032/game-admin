import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const zones = await prisma.zone.findMany({
    include: {
      ownedByTeam: { select: { name: true, color: true, code: true } },
    },
    orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }],
  })

  return Response.json(zones)
}
