import { prisma } from './prisma'
import { hashPassword } from './auth'

const TEAMS = [
  { name: '第一小隊', color: '#EF4444', code: 'T1' },
  { name: '第二小隊', color: '#3B82F6', code: 'T2' },
  { name: '第三小隊', color: '#22C55E', code: 'T3' },
  { name: '第四小隊', color: '#F59E0B', code: 'T4' },
  { name: '第五小隊', color: '#8B5CF6', code: 'T5' },
  { name: '第六小隊', color: '#EC4899', code: 'T6' },
]

const ZONE_NAMES = [
  '台北市中正區', '台北市大同區', '台北市中山區', '台北市松山區', '台北市大安區', '台北市萬華區',
  '新北市板橋區', '新北市三重區', '新北市中和區', '新北市永和區', '新北市新莊區', '新北市新店區',
  '桃園市桃園區', '桃園市中壢區', '桃園市平鎮區', '桃園市八德區', '桃園市楊梅區', '桃園市蘆竹區',
  '台中市中區', '台中市東區', '台中市西區', '台中市南區', '台中市北區', '台中市西屯區',
  '台南市中西區', '台南市東區', '台南市南區', '台南市北區', '台南市安平區', '台南市安南區',
  '高雄市苓雅區', '高雄市前金區', '高雄市新興區', '高雄市前鎮區', '高雄市三民區', '高雄市鳳山區',
]

const ZONE_TYPES = ['realestate', 'realestate', 'realestate', 'resource', 'special']
const PRICES = [300, 400, 500, 600, 800, 1000, 1200, 1500]

export async function runSeed() {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.user.deleteMany(),
    prisma.team.deleteMany(),
    prisma.setting.deleteMany(),
  ])

  const pwHash = await hashPassword('demo123')
  const adminHash = await hashPassword('admin888')

  const teams = await prisma.$transaction(
    TEAMS.map((t) => prisma.team.create({ data: { ...t, budget: 10000 } }))
  )

  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      const idx = y * 6 + x
      await prisma.zone.create({
        data: {
          name: ZONE_NAMES[idx],
          code: `${String.fromCharCode(65 + x)}${y + 1}`,
          gridX: x,
          gridY: y,
          type: ZONE_TYPES[idx % ZONE_TYPES.length],
          basePrice: PRICES[idx % PRICES.length],
          currentPrice: PRICES[idx % PRICES.length],
        },
      })
    }
  }

  await prisma.setting.createMany({
    data: [
      { key: 'month', value: '1' },
      { key: 'rentRate', value: '10' },
    ],
  })

  await prisma.user.create({
    data: { username: 'admin', displayName: '總控管理員', passwordHash: adminHash, role: 'admin' },
  })
  await prisma.user.create({
    data: { username: 'master_re', displayName: '房地產關主', passwordHash: pwHash, role: 'master', masterType: 'realestate' },
  })
  await prisma.user.create({
    data: { username: 'master_bank', displayName: '銀行關主', passwordHash: pwHash, role: 'master', masterType: 'bank' },
  })
  await prisma.user.create({
    data: { username: 'master_loan', displayName: '高利貸關主', passwordHash: pwHash, role: 'master', masterType: 'loan' },
  })
  await prisma.user.create({
    data: { username: 'master_fund', displayName: '房價指數基金關主', passwordHash: pwHash, role: 'master', masterType: 'indexfund' },
  })

  for (let i = 0; i < teams.length; i++) {
    await prisma.user.create({
      data: {
        username: `team${i + 1}`,
        displayName: `${TEAMS[i].name}隊輔`,
        passwordHash: pwHash,
        role: 'assistant',
        teamId: teams[i].id,
      },
    })
  }

  return {
    ok: true,
    message: '資料初始化完成',
    accounts: [
      { role: '總控', username: 'admin', password: 'admin888' },
      { role: '房地產關主', username: 'master_re', password: 'demo123' },
      { role: '銀行關主', username: 'master_bank', password: 'demo123' },
      { role: '高利貸關主', username: 'master_loan', password: 'demo123' },
      { role: '房價指數基金關主', username: 'master_fund', password: 'demo123' },
      ...TEAMS.map((t, i) => ({ role: `${t.name}隊輔`, username: `team${i + 1}`, password: 'demo123' })),
    ],
  }
}
