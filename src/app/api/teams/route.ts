import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [teams, zones, txGroups] = await Promise.all([
    prisma.team.findMany({
      include: { _count: { select: { ownedZones: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.zone.findMany({ select: { ownedByTeamId: true, currentPrice: true } }),
    prisma.transaction.groupBy({
      by: ['teamId', 'type'],
      _sum: { amount: true },
      where: { type: { in: ['loan', 'repayment', 'long', 'short', 'long_profit', 'short_profit'] } },
    }),
  ])

  const enriched = teams.map((team) => {
    const realEstateValue = zones
      .filter((z) => z.ownedByTeamId === team.id)
      .reduce((s, z) => s + z.currentPrice, 0)

    const sumBy = (type: string) =>
      txGroups.find((g) => g.teamId === team.id && g.type === type)?._sum.amount ?? 0

    const debt = Math.max(0, sumBy('loan') - sumBy('repayment'))
    const fundValue = Math.max(0, sumBy('long') + sumBy('short') - sumBy('long_profit') - sumBy('short_profit'))

    return { ...team, realEstateValue, debt, fundValue }
  })

  return Response.json(enriched)
}
