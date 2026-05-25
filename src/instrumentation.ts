export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { prisma } = await import('./lib/prisma')

    const teamCount = await prisma.team.count().catch(() => -1)
    if (teamCount === -1) return // DB not ready yet

    if (teamCount === 0) {
      // Fresh DB — full seed
      console.log('[startup] Empty database, running initial seed...')
      const { runSeed } = await import('./lib/seed')
      await runSeed()
      console.log('[startup] Seed complete')
      return
    }

    // Existing game — only patch missing data from schema migrations
    const settingCount = await prisma.setting.count().catch(() => 0)
    if (settingCount === 0) {
      await prisma.setting.createMany({
        data: [{ key: 'month', value: '1' }, { key: 'rentRate', value: '10' }],
      }).catch(() => {})
    }

    // Fix zones where currentPrice was left at default 0
    await prisma.$executeRaw`UPDATE "Zone" SET "currentPrice" = "basePrice" WHERE "currentPrice" = 0`.catch(() => {})
  } catch (e) {
    console.error('[startup] Init error:', e)
  }
}
