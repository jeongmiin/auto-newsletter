/**
 * 팀별 폴더 현황 보고서 — **우리 PC에서만** 돌리는 스크립트(배포본에 들어가지 않는다).
 *
 * 빌더에는 로그인이 없어 "우리 팀에게만 보이는 화면"을 앱 안에 만들 수 없다. 대신 S3를 훑어
 * 어느 팀이 어떤 전시회 폴더에 회차 폴더를 몇 개 만들었는지 CSV 로 뽑는다(엑셀에서 바로 열린다).
 *
 * 실행:
 *   npm run report:folders                 (버킷의 모든 연도)
 *   npm run report:folders -- --year 2026  (한 연도만)
 *   npm run report:folders -- --out d:/tmp (저장 위치 바꾸기, 기본 reports/)
 *
 * 읽는 곳: 폴더 선택 화면과 같은 공개 ListObjectsV2 — 키·권한이 필요 없다(src/utils/s3Browse.ts).
 * 경로 규칙: e-dm/{연도}/newsletterbuilder/{팀}/{전시회}/{회차}/{파일}  (src/utils/s3Upload.ts)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BUCKET_URL = (process.env.VITE_S3_BUCKET_URL || 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com').replace(/\/+$/, '')
const BUILDER_ROOT = 'newsletterbuilder'
const PAGE_SIZE = 1000
const MAX_PAGES = 50

const args = process.argv.slice(2)
const argOf = (name) => {
  const at = args.indexOf(name)
  return at === -1 ? null : args[at + 1]
}
const onlyYear = argOf('--year')
const outDir = argOf('--out') || 'reports'

// ── 팀·전시회 이름 (index.json) ─────────────────────────────────────────────
const index = JSON.parse(readFileSync(new URL('../public/templates/index.json', import.meta.url), 'utf8'))
const teamName = new Map()
for (const division of index.departments ?? []) {
  for (const team of division.teams ?? []) teamName.set(team.id, `${division.name} ${team.name}`)
}
const exhibitionName = new Map((index.templates ?? []).map((t) => [t.id, t.name]))

// ── S3 목록 ────────────────────────────────────────────────────────────────
const textOf = (xml, tag) => {
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml)
  return m ? m[1] : ''
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

/** prefix 아래 모든 키 — [{key, lastModified, size}] */
async function listAll(prefix) {
  const out = []
  let token = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ 'list-type': '2', prefix, 'max-keys': String(PAGE_SIZE) })
    if (token) params.set('continuation-token', token)
    const res = await fetch(`${BUCKET_URL}/?${params}`)
    if (!res.ok) throw new Error(`S3 목록을 읽지 못했어요: ${res.status} (${prefix})`)
    const xml = await res.text()
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const body = m[1]
      out.push({ key: decode(textOf(body, 'Key')), lastModified: textOf(body, 'LastModified'), size: Number(textOf(body, 'Size') || 0) })
    }
    if (textOf(xml, 'IsTruncated') !== 'true') break
    token = decode(textOf(xml, 'NextContinuationToken'))
    if (!token) break
  }
  return out
}

/** e-dm/ 바로 아래 연도 폴더들 */
async function listYears() {
  const params = new URLSearchParams({ 'list-type': '2', prefix: 'e-dm/', delimiter: '/' })
  const res = await fetch(`${BUCKET_URL}/?${params}`)
  if (!res.ok) throw new Error(`S3 목록을 읽지 못했어요: ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<Prefix>e-dm\/(\d{4})\/<\/Prefix>/g)].map((m) => m[1]).sort()
}

// ── 집계 ──────────────────────────────────────────────────────────────────
const years = onlyYear ? [onlyYear] : await listYears()
/** 회차 폴더 단위 행: key = year/team/exhibition/vol */
const volumes = new Map()
let scanned = 0
for (const year of years) {
  const prefix = `e-dm/${year}/${BUILDER_ROOT}/`
  const objects = await listAll(prefix)
  scanned += objects.length
  for (const obj of objects) {
    const rest = obj.key.slice(prefix.length)
    const [team, exhibition, vol, ...fileParts] = rest.split('/')
    if (!team || !exhibition || !vol) continue
    const file = fileParts.join('/')
    const id = `${year}/${team}/${exhibition}/${vol}`
    let row = volumes.get(id)
    if (!row) {
      row = { year, team, exhibition, vol, files: 0, images: 0, edit: 0, send: 0, bytes: 0, last: '' }
      volumes.set(id, row)
    }
    if (!file) continue // 폴더 자리를 잡는 0바이트 키
    row.files += 1
    row.bytes += obj.size
    if (/_edit\.html?$/i.test(file)) row.edit += 1
    else if (/_send\.html?$/i.test(file)) row.send += 1
    else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) row.images += 1
    if (obj.lastModified > row.last) row.last = obj.lastModified
  }
}

const rows = [...volumes.values()].sort((a, b) =>
  a.year.localeCompare(b.year) || a.team.localeCompare(b.team) || a.exhibition.localeCompare(b.exhibition) || a.vol.localeCompare(b.vol),
)

/** 팀별 요약 */
const byTeam = new Map()
for (const r of rows) {
  const key = `${r.year}/${r.team}`
  let t = byTeam.get(key)
  if (!t) {
    t = { year: r.year, team: r.team, exhibitions: new Set(), volumes: 0, files: 0, edit: 0, send: 0, last: '' }
    byTeam.set(key, t)
  }
  t.exhibitions.add(r.exhibition)
  t.volumes += 1
  t.files += r.files
  t.edit += r.edit
  t.send += r.send
  if (r.last > t.last) t.last = r.last
}

// ── CSV ───────────────────────────────────────────────────────────────────
const kst = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '')
const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csv = (header, lines) => '\ufeff' + [header, ...lines].map((cols) => cols.map(csvCell).join(',')).join('\r\n') + '\r\n'

const stamp = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
mkdirSync(outDir, { recursive: true })

const summaryPath = join(outDir, `folder-report-${stamp}-summary.csv`)
writeFileSync(
  summaryPath,
  csv(
    ['연도', '팀 id', '팀', '전시회 폴더 수', '회차 폴더 수', '파일 수', '임시저장(edit)', '발송(send)', '마지막 수정(KST)'],
    [...byTeam.values()].map((t) => [t.year, t.team, teamName.get(t.team) ?? '(목록에 없음)', t.exhibitions.size, t.volumes, t.files, t.edit, t.send, kst(t.last)]),
  ),
)

const detailPath = join(outDir, `folder-report-${stamp}-detail.csv`)
writeFileSync(
  detailPath,
  csv(
    ['연도', '팀 id', '팀', '전시회 폴더', '전시회', '회차 폴더', '파일 수', '이미지', '임시저장(edit)', '발송(send)', '용량(MB)', '마지막 수정(KST)'],
    rows.map((r) => [
      r.year, r.team, teamName.get(r.team) ?? '(목록에 없음)', r.exhibition, exhibitionName.get(r.exhibition) ?? (r.exhibition === 'blank' ? '(빈 템플릿)' : ''),
      r.vol, r.files, r.images, r.edit, r.send, (r.bytes / 1024 / 1024).toFixed(1), kst(r.last),
    ]),
  ),
)

// ── 화면 요약 ─────────────────────────────────────────────────────────────
console.log(`버킷: ${BUCKET_URL}`)
console.log(`연도: ${years.join(', ')} · 키 ${scanned.toLocaleString()}개 · 회차 폴더 ${rows.length}개\n`)
console.table(
  [...byTeam.values()].map((t) => ({
    연도: t.year,
    팀: teamName.get(t.team) ?? t.team,
    전시회: t.exhibitions.size,
    회차: t.volumes,
    파일: t.files,
    임시저장: t.edit,
    발송: t.send,
    '마지막 수정': kst(t.last),
  })),
)
console.log(`\n요약: ${summaryPath}\n상세: ${detailPath}`)
