import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

  // Update zone currentPrices to new month's configured price
  for (const [col, config] of Object.entries(configMap)) {
    const newPrice = (config as Record<string, unknown>)[`price${newMonth}`] as number
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

  return Response.json({ ok: true, month: newMonth, rentCount })
}
