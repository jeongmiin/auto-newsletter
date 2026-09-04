/**
 * 재편집용 HTML 하나를 템플릿 카탈로그(public/templates/templates-config.json)에 등록한다.
 *
 *   node scripts/add-template.mjs <htmlFile> --id kpet-template --name 케이펫 \
 *        --division pet --team pet-ind [--thumbnail kpet_temp.png] [--description "..."] \
 *        [--summary "표 설명(뉴스레터 요약)"]
 *
 * --summary는 파일의 뉴스레터 요약(wrapSettings.summary)을 덮어쓴다. 요약 없이 내보낸
 * 파일로 기존 템플릿을 교체할 때 요약이 사라지는 것을 막는 용도다.
 *
 * 같은 id가 이미 있으면 교체한다. 등록 후 목록은 화면과 같은 순서
 * (본부 → 팀 → 이름 가나다ABC)로 다시 정렬한다.
 *
 * 본부/팀 목록은 설정 파일의 departments를 그대로 쓴다 — 화면·검사 테스트와 같은 한 곳이다.
 * ⚠ --division/--team에는 표시명이 아니라 **id**를 넣는다. 표시명은 조직개편으로 바뀌지만
 *   id는 불변이라, 저장된 값이 나중에도 같은 조직을 가리킨다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CONFIG = path.join(ROOT, 'public', 'templates', 'templates-config.json')
const MODULES_CONFIG = path.join(ROOT, 'public', 'modules', 'modules-config.json')
const THUMB_DIR = path.join(ROOT, 'src', 'assets', 'img', 'thumbnail')

const START = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
const END = '<!-- AUTO_NEWSLETTER_METADATA_END -->'

const die = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// ── 인자 파싱 ───────────────────────────────────────────────
const [, , htmlArg, ...rest] = process.argv
const opts = {}
for (let i = 0; i < rest.length; i += 2) {
  if (!rest[i].startsWith('--')) die(`알 수 없는 인자: ${rest[i]}`)
  opts[rest[i].slice(2)] = rest[i + 1]
}
if (!htmlArg || !opts.id || !opts.name || !opts.division || !opts.team) {
  console.error(
    [
      '사용법:',
      '  node scripts/add-template.mjs <htmlFile> --id <id> --name <이름> \\',
      '       --division <본부id> --team <팀id> [--thumbnail <파일명>] [--description <설명>] \\',
      '       [--summary <뉴스레터 요약>]',
      '',
      '예:',
      '  node scripts/add-template.mjs temp/kpet_temp_newletter.html \\',
      '       --id kpet-template --name 케이펫 --division pet --team pet-ind \\',
      '       --thumbnail kpet_temp.png',
    ].join('\n'),
  )
  process.exit(2)
}

// ── 설정 읽기 ───────────────────────────────────────────────
if (!fs.existsSync(CONFIG)) die(`설정 파일이 없습니다: ${CONFIG}`)
const config = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'))
if (!Array.isArray(config.templates)) config.templates = []
if (!Array.isArray(config.departments)) die('설정 파일에 departments가 없습니다')

// 본부/팀 id가 트리에 있는지 — 오타로 목록에서 사라지는 것을 막는다.
// 표시명을 넣는 실수가 잦을 자리라, 이름으로 들어오면 해당 id를 짚어 알려준다.
const listOrg = (nodes) => nodes.map((n) => `${n.id}(${n.name})`).join(', ')

const dept = config.departments.find((d) => d.id === opts.division)
if (!dept) {
  const byName = config.departments.find((d) => d.name === opts.division)
  die(
    byName
      ? `--division에는 표시명이 아니라 id를 넣습니다. "${opts.division}" → ${byName.id}`
      : `본부 id "${opts.division}"가 트리에 없습니다.\n  쓸 수 있는 본부: ${listOrg(config.departments)}`,
  )
}
const team = dept.teams.find((t) => t.id === opts.team)
if (!team) {
  const byName = dept.teams.find((t) => t.name === opts.team)
  die(
    byName
      ? `--team에는 표시명이 아니라 id를 넣습니다. "${opts.team}" → ${byName.id}`
      : `"${dept.name}"에 팀 id "${opts.team}"이 없습니다.\n  쓸 수 있는 팀: ${listOrg(dept.teams)}`,
  )
}
if (dept.active === false || team.active === false) {
  die(`폐지된 조직에는 템플릿을 등록할 수 없습니다: ${dept.name} / ${team.name}`)
}

// 썸네일 파일 존재 확인 (없으면 화면에서 실시간 렌더로 폴백되지만, 대개 오타다)
if (opts.thumbnail && !fs.existsSync(path.join(THUMB_DIR, opts.thumbnail))) {
  die(`썸네일 파일이 없습니다: src/assets/img/thumbnail/${opts.thumbnail}`)
}

// ── HTML에서 메타데이터 추출 ──────────────────────────────────
const SRC = path.isAbsolute(htmlArg) ? htmlArg : path.join(ROOT, htmlArg)
if (!fs.existsSync(SRC)) die(`HTML 파일이 없습니다: ${SRC}`)
const html = fs.readFileSync(SRC, 'utf-8')

const startIdx = html.indexOf(START)
const endIdx = html.indexOf(END)
if (startIdx === -1 || endIdx === -1) {
  die(`재편집용 메타데이터가 없습니다: ${SRC}\n  (에디터의 "저장용 내려받기"로 받은 파일이어야 합니다)`)
}
const jsonMatch = /<!--\s*([\s\S]*?)\s*-->/.exec(
  html.substring(startIdx + START.length, endIdx).trim(),
)
if (!jsonMatch) die('메타데이터 주석을 읽지 못했습니다')

let data
try {
  data = JSON.parse(jsonMatch[1].trim())
} catch (e) {
  die(`메타데이터 JSON 파싱 실패: ${e.message}`)
}
if (!Array.isArray(data.modules) || data.modules.length === 0) die('modules가 비어 있습니다')

// 모듈 id가 실제 정의에 있는지
const knownModules = new Set(
  JSON.parse(fs.readFileSync(MODULES_CONFIG, 'utf-8')).modules.map((m) => m.id),
)
const unknown = [...new Set(data.modules.map((m) => m.moduleId))].filter((id) => !knownModules.has(id))
if (unknown.length) die(`모듈 정의에 없는 moduleId: ${unknown.join(', ')}`)

// ── 템플릿 항목 만들기 ────────────────────────────────────────
/**
 * order는 배열 순서로 대체되므로 뺀다.
 * ⚠ groupId·rowIndex·columnIndex는 반드시 남긴다 — 빠지면 다시 열 때 모든 멤버가
 *   0번 컬럼으로 몰려 2단 구성이 무너진다.
 */
const toTemplateModule = (m) => ({
  moduleId: m.moduleId,
  properties: m.properties,
  styles: m.styles || {},
  ...(m.groupId ? { groupId: m.groupId } : {}),
  ...(m.rowIndex != null ? { rowIndex: m.rowIndex } : {}),
  ...(m.columnIndex != null ? { columnIndex: m.columnIndex } : {}),
  ...(m.fullWidth ? { fullWidth: true } : {}),
})

const ws = data.wrapSettings || {}
const entry = {
  id: opts.id,
  name: opts.name,
  description: opts.description || `${opts.name} 뉴스레터 구성`,
  divisionId: dept.id,
  teamId: team.id,
  ...(opts.thumbnail ? { thumbnail: opts.thumbnail } : {}),
  wrapSettings: {
    backgroundColor: ws.backgroundColor ?? '#ffffff',
    borderEnabled: ws.borderEnabled ?? false,
    borderWidth: ws.borderWidth ?? '0px',
    borderColor: ws.borderColor ?? '#dddddd',
    borderStyle: ws.borderStyle ?? 'solid',
    pointColor: ws.pointColor ?? '#2563eb',
    ...(Array.isArray(ws.pointColors) && ws.pointColors.length ? { pointColors: ws.pointColors } : {}),
    fontLanguage: ws.fontLanguage ?? 'default',
    ...((opts.summary ?? ws.summary) ? { summary: opts.summary ?? ws.summary } : {}),
  },
  modules: [...data.modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(toTemplateModule),
  // ⚠ groups를 빼면 그룹 구성이 통째로 사라진다
  ...(Array.isArray(data.groups) && data.groups.length ? { groups: data.groups } : {}),
}

// 그룹 참조 검사 — 정의 없는 groupId가 있으면 로드 시 조용히 풀린다
const definedGroups = new Set((entry.groups ?? []).map((g) => g.id))
const dangling = [
  ...new Set(entry.modules.map((m) => m.groupId).filter(Boolean)),
].filter((g) => !definedGroups.has(g))
if (dangling.length) die(`정의 없는 그룹을 참조합니다: ${dangling.join(', ')}`)

// ── 교체 또는 추가 ──────────────────────────────────────────
const at = config.templates.findIndex((t) => t.id === opts.id)
const replaced = at >= 0
if (replaced) config.templates[at] = entry
else config.templates.push(entry)

// 화면과 같은 순서로 재정렬 (본부 → 팀 → 이름 가나다ABC)
const rank = (t) => {
  const d = config.departments.findIndex((x) => x.id === t.divisionId)
  if (d === -1) return [config.departments.length, 0]
  const i = config.departments[d].teams.findIndex((x) => x.id === t.teamId)
  return [d, i === -1 ? config.departments[d].teams.length : i]
}
config.templates.sort((a, b) => {
  const [ad, at2] = rank(a)
  const [bd, bt] = rank(b)
  return ad - bd || at2 - bt || a.name.localeCompare(b.name, 'ko')
})

fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n', 'utf-8')

// ── 요약 ───────────────────────────────────────────────────
const counts = entry.modules.reduce((acc, m) => ((acc[m.moduleId] = (acc[m.moduleId] || 0) + 1), acc), {})
console.log(`${replaced ? '교체' : '추가'}: ${entry.name} (${entry.id})`)
console.log(`  ${dept.name} / ${team.name} (${entry.divisionId} / ${entry.teamId})${entry.thumbnail ? ` · 썸네일 ${entry.thumbnail}` : ' · 썸네일 없음(실시간 렌더로 표시)'}`)
console.log(`  모듈 ${entry.modules.length}개 / 그룹 ${(entry.groups ?? []).length}개`)
console.log(`  구성: ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', ')}`)
console.log(`  카탈로그 총 ${config.templates.length}개 → ${path.relative(ROOT, CONFIG)}`)
