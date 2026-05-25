import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prices, rentRate } = await req.json()

  const monthSetting = await prisma.setting.findUnique({ where: { key: 'month' } })
  const currentMonth = parseInt(monthSetting?.value || '1')
  if (currentMonth >= 4) {
    return Response.json({ error: '已是第 4 月，遊戲結束' }, { status: 400 })
  }

  const rate = Number(rentRate) ?? 10
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!adminUser) return Response.json({ error: '找不到管理員帳號' }, { status: 500 })

  // Update zone prices where provided
  for (const [zoneId, newPrice] of Object.entries(prices || {})) {
    await prisma.zone.update({
      where: { id: zoneId },
      data: { currentPrice: Number(newPrice) },
    })
  }

  // Get all owned real estate zones (after price update)
  const ownedZones = await prisma.zone.findMany({
    where: { type: 'realestate', ownedByTeamId: { not: null } },
  })

  let rentCount = 0
  for (const zone of ownedZones) {
    const rentAmount = Math.floor(zone.currentPrice * rate / 100)
    if (rentAmount <= 0) continue
    await prisma.transaction.create({
      data: {
        teamId: zone.ownedByTeamId!,
        zoneId: zone.id,
        masterId: adminUser.id,
        masterType: 'realestate',
        type: 'rent',
        amount: rentAmount,
        note: `第${currentMonth + 1}月租金`,
      },
    })
    await prisma.team.update({
      where: { id: zone.ownedByTeamId! },
      data: { budget: { increment: rentAmount } },
    })
    rentCount++
  }

  // Advance month
  await prisma.setting.upsert({
    where: { key: 'month' },
    update: { value: (currentMonth + 1).toString() },
    create: { key: 'month', value: (currentMonth + 1).toString() },
  })
  await prisma.setting.upsert({
    where: { key: 'rentRate' },
    update: { value: rate.toString() },
    create: { key: 'rentRate', value: rate.toString() },
  })

  return Response.json({ ok: true, month: currentMonth + 1, rentCount })
}
