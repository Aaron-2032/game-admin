const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F']
const COLUMN_PRICES = [300, 400, 500, 600, 800, 1000]

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { prisma } = await import('./lib/prisma')

    const teamCount = await prisma.team.count().catch(() => -1)
    if (teamCount === -1) return

    if (teamCount === 0) {
      console.log('[startup] Empty database, running initial seed...')
      const { runSeed } = await import('./lib/seed')
      await runSeed()
      console.log('[startup] Seed complete')
      return
    }

    // Patch missing Settings
    const settingCount = await prisma.setting.count().catch(() => 0)
    if (settingCount === 0) {
      await prisma.setting.create({ data: { key: 'month', value: '1' } }).catch(() => {})
    }

    // Patch missing ColumnConfig (schema migration)
    const colCount = await prisma.columnConfig.count().catch(() => 0)
    if (colCount === 0) {
      await prisma.columnConfig.createMany({
        data: COLUMNS.map((col, i) => ({
          column: col,
          price1: COLUMN_PRICES[i], price2: COLUMN_PRICES[i],
          price3: COLUMN_PRICES[i], price4: COLUMN_PRICES[i],
          rentRate: 10,
        })),
      }).catch(() => {})
    }

    // Fix zones with currentPrice = 0
    await prisma.$executeRaw`UPDATE "Zone" SET "currentPrice" = "basePrice" WHERE "currentPrice" = 0`.catch(() => {})
  } catch (e) {
    console.error('[startup] Init error:', e)
  }
}
