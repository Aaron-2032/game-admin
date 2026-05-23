import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      masterType: true,
      teamId: true,
      team: { select: { name: true, color: true, code: true } },
    },
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  })
  return Response.json(users)
}
