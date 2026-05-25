import { runSeed } from '@/lib/seed'

export async function POST() {
  try {
    const result = await runSeed()
    return Response.json(result)
  } catch (err) {
    console.error(err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
