import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [monthSetting, rentRateSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'month' } }),
    prisma.setting.findUnique({ where: { key: 'rentRate' } }),
  ])

  return Response.json({
    month: parseInt(monthSetting?.value || '1'),
    rentRate: parseInt(rentRateSetting?.value || '10'),
  })
}
