import { prisma } from './prisma'
import { hashPassword } from './auth'

const TEAMS = [
  { name: '第一小隊', color: '#9CA3AF', code: 'T1' },
  { name: '第二小隊', color: '#EAB308', code: 'T2' },
  { name: '第三小隊', color: '#3B82F6', code: 'T3' },
  { name: '第四小隊', color: '#22C55E', code: 'T4' },
  { name: '第五小隊', color: '#F97316', code: 'T5' },
  { name: '第六小隊', color: '#EF4444', code: 'T6' },
  { name: '第七小隊', color: '#8B5CF6', code: 'T7' },
  { name: '第八小隊', color: '#B45309', code: 'T8' },
  { name: '第九小隊', color: '#EC4899', code: 'T9' },
]

const ZONE_NAMES = [
  '台北市中正區', '台北市大同區', '台北市中山區', '台北市松山區', '台北市大安區', '台北市萬華區',
  '新北市板橋區', '新北市三重區', '新北市中和區', '新北市永和區', '新北市新莊區', '新北市新店區',
  '桃園市桃園區', '桃園市中壢區', '桃園市平鎮區', '桃園市八德區', '桃園市楊梅區', '桃園市蘆竹區',
  '台中市中區', '台中市東區', '台中市西區', '台中市南區', '台中市北區', '台中市西屯區',
  '台南市中西區', '台南市東區', '台南市南區', '台南市北區', '台南市安平區', '台南市安南區',
  '高雄市苓雅區', '高雄市前金區', '高雄市新興區', '高雄市前鎮區', '高雄市三民區', '高雄市鳳山區',
]

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F']
const COLUMN_PRICES = [300, 400, 500, 600, 800, 1000]

export async function runSeed() {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.user.deleteMany(),
    prisma.team.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.columnConfig.deleteMany(),
  ])

  const pwHash = await hashPassword('demo123')
  const adminHash = await hashPassword('admin888')

  const teams = await prisma.$transaction(
    TEAMS.map((t) => prisma.team.create({ data: { ...t, budget: 10000 } }))
  )

  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      const idx = y * 6 + x
      const price = COLUMN_PRICES[x]
      await prisma.zone.create({
        data: {
          name: ZONE_NAMES[idx],
          code: `${COLUMNS[x]}${y + 1}`,
          gridX: x,
          gridY: y,
          type: 'realestate',
          basePrice: price,
          currentPrice: price,
        },
      })
    }
  }

  const MONTHLY_PRICES: [number, number, number, number][] = [
    [300, 330, 270, 300],   // A
    [400, 360, 440, 400],   // B
    [500, 600, 500, 450],   // C
    [600, 540, 600, 660],   // D
    [800, 880, 800, 720],   // E
    [1000, 900, 1000, 1100], // F
  ]
  await prisma.columnConfig.createMany({
    data: COLUMNS.map((col, i) => ({
      column: col,
      price1: MONTHLY_PRICES[i][0],
      price2: MONTHLY_PRICES[i][1],
      price3: MONTHLY_PRICES[i][2],
      price4: MONTHLY_PRICES[i][3],
      rentRate: 10,
    })),
  })

  await prisma.setting.create({ data: { key: 'month', value: '1' } })

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
