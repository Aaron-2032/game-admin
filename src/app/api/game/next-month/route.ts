import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F']

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const monthSetting = await prisma.setting.findUnique({ where: { key: 'month' } })
  const currentMonth = parseInt(monthSetting?.value || '1')
  if (currentMonth >= 4) {
    return Response.json({ error: '已是第 4 月，遊戲結束' }, { status: 400 })
  }

  const newMonth = currentMonth + 1

  const columnConfigs = await prisma.columnConfig.findMany()
  const configMap = Object.fromEntries(columnConfigs.map((c) => [c.column, c]))

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!adminUser) return Response.json({ error: '找不到管理員' }, { status: 500 })

  // Representative zone for each column (A1, B1, ... F1) used by fund positions
  const repZones = await prisma.zone.findMany({
    where: { code: { in: COLUMNS.map((col) => `${col}1`) } },
    select: { id: true, code: true },
  })
  const repZoneIdToCol = Object.fromEntries(repZones.map((z) => [z.id, z.code.charAt(0)]))
  const repZoneIds = repZones.map((z) => z.id)

  // Auto-settle open fund positions before updating prices
  let fundSettleCount = 0
  if (repZoneIds.length > 0) {
    const [longTxs, longProfitTxs, shortTxs, shortProfitTxs] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['teamId', 'zoneId'],
        where: { type: 'long', zoneId: { in: repZoneIds } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['teamId', 'zoneId'],
        where: { type: 'long_profit', zoneId: { in: repZoneIds } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['teamId', 'zoneId'],
        where: { type: 'short', zoneId: { in: repZoneIds } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['teamId', 'zoneId'],
        where: { type: 'short_profit', zoneId: { in: repZoneIds } },
        _sum: { amount: true },
      }),
    ])

    const sumFor = (
      arr: { teamId: string; zoneId: string | null; _sum: { amount: number | null } }[],
      teamId: string, zoneId: string
    ) => arr.find((r) => r.teamId === teamId && r.zoneId === zoneId)?._sum.amount ?? 0

    const candidates = new Set([...longTxs, ...shortTxs].map((r) => `${r.teamId}|${r.zoneId}`))

    for (const key of candidates) {
      const [teamId, zoneId] = key.split('|')
      if (!zoneId) continue
      const col = repZoneIdToCol[zoneId]
      if (!col) continue
      const config = configMap[col]
      if (!config) continue

      const oldPrice = (config as unknown as Record<string, number>)[`price${currentMonth}`]
      const newPrice = (config as unknown as Record<string, number>)[`price${newMonth}`]
      if (!oldPrice || !newPrice) continue
      const priceChangeRatio = (newPrice - oldPrice) / oldPrice

      const openLong = sumFor(longTxs, teamId, zoneId) - sumFor(longProfitTxs, teamId, zoneId)
      const openShort = sumFor(shortTxs, teamId, zoneId) - sumFor(shortProfitTxs, teamId, zoneId)

      if (openLong > 0 && priceChangeRatio > 0) {
        const payout = Math.round(openLong * (1 + priceChangeRatio))
        await prisma.transaction.create({
          data: {
            teamId, zoneId, masterId: adminUser.id, masterType: 'indexfund',
            type: 'long_profit', amount: payout,
            note: `第${newMonth}月${col}欄漲${Math.round(priceChangeRatio * 100)}%，做多獲利`,
          },
        })
        await prisma.team.update({ where: { id: teamId }, data: { budget: { increment: payout } } })
        fundSettleCount++
      }

      if (openShort > 0 && priceChangeRatio < 0) {
        const payout = Math.round(openShort * (1 + Math.abs(priceChangeRatio)))
        await prisma.transaction.create({
          data: {
            teamId, zoneId, masterId: adminUser.id, masterType: 'indexfund',
            type: 'short_profit', amount: payout,
            note: `第${newMonth}月${col}欄跌${Math.round(Math.abs(priceChangeRatio) * 100)}%，做空獲利`,
          },
        })
        await prisma.team.update({ where: { id: teamId }, data: { budget: { increment: payout } } })
        fundSettleCount++
      }
    }
  }

  // Update zone currentPrices to new month's configured price
  for (const [col, config] of Object.entries(configMap)) {
    const newPrice = (config as unknown as Record<string, number>)[`price${newMonth}`]
    await prisma.zone.updateMany({
      where: { code: { startsWith: col } },
      data: { currentPrice: newPrice },
    })
  }

  // Auto-generate rent for all owned real estate zones
  const ownedZones = await prisma.zone.findMany({
    where: { type: 'realestate', ownedByTeamId: { not: null } },
  })

  let rentCount = 0
  for (const zone of ownedZones) {
    const col = zone.code.charAt(0)
    const config = configMap[col]
    if (!config) continue
    const rentAmount = Math.floor(zone.currentPrice * config.rentRate / 100)
    if (rentAmount <= 0) continue
    await prisma.transaction.create({
      data: {
        teamId: zone.ownedByTeamId!,
        zoneId: zone.id,
        masterId: adminUser.id,
        masterType: 'realestate',
        type: 'rent',
        amount: rentAmount,
        note: `第${newMonth}月租金`,
      },
    })
    await prisma.team.update({
      where: { id: zone.ownedByTeamId! },
      data: { budget: { increment: rentAmount } },
    })
    rentCount++
  }

  await prisma.setting.upsert({
    where: { key: 'month' },
    update: { value: newMonth.toString() },
    create: { key: 'month', value: newMonth.toString() },
  })

  return Response.json({ ok: true, month: newMonth, rentCount, fundSettleCount })
}
