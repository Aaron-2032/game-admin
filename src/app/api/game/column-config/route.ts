import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const configs = await prisma.columnConfig.findMany({ orderBy: { column: 'asc' } })
  return Response.json(configs)
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configs: { column: string; price1: number; price2: number; price3: number; price4: number; rentRate: number }[] = await req.json()

  for (const c of configs) {
    await prisma.columnConfig.upsert({
      where: { column: c.column },
      update: { price1: c.price1, price2: c.price2, price3: c.price3, price4: c.price4, rentRate: c.rentRate },
      create: { column: c.column, price1: c.price1, price2: c.price2, price3: c.price3, price4: c.price4, rentRate: c.rentRate },
    })
  }

  // Sync zone currentPrices to the current month's configured price
  const monthSetting = await prisma.setting.findUnique({ where: { key: 'month' } })
  const month = parseInt(monthSetting?.value || '1') as 1 | 2 | 3 | 4
  for (const c of configs) {
    const price = c[`price${month}` as keyof typeof c] as number
    await prisma.zone.updateMany({
      where: { code: { startsWith: c.column } },
      data: { currentPrice: price },
    })
  }

  return Response.json({ ok: true })
}
