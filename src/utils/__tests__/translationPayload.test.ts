/**
 * 번역기에 **실제로 보내는 글자 수**가 조용히 불어나는 것을 막는 회귀 테스트.
 *
 * 왜 필요한가 — 2026-09-16에 실제로 겪은 일:
 * 리치 텍스트의 서식을 지키려고 값을 HTML째 보내도록 바꿨는데, Azure Translator는
 * **태그와 style 속성도 글자로 센다**. 화면에는 2,544자로 적히는 뉴스레터가 실제로는
 * 17,134자(7배)로 나갔고, 무료 한도(월 200만 자)가 7배 빨리 닳고 속도 제한(429)에 걸렸다.
 * 기능은 멀쩡히 동작했기 때문에 눈으로도, 다른 테스트로도 잡히지 않았다.
 *
 * 그래서 **실제 템플릿을 읽어 전송량 비율을 재고 상한을 넘으면 실패**시킨다.
 * 이 테스트가 깨지면 기능이 고장 난 게 아니라 **번역 비용이 뛴 것**이다.
 * 자세한 배경과 대응은 .claude/skills/figma-builder/references/api-cost-and-pitfalls.md 참고.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ModuleInstance, ModuleMetadata } from '@/types'
import { collectTranslationUnits } from '@/utils/newsletterTranslation'

/**
 * 보이는 글자 대비 허용 배수.
 *
 * 지금은 2.2~2.4배다(속성을 뗀 뼈대만 보내므로 태그 이름 값만 남는다).
 * 3을 넘겼다면 태그나 속성을 통째로 보내고 있다는 뜻이니, 올리기 전에
 * "무료 한도로 몇 번 번역할 수 있는지"를 먼저 계산할 것. 숫자만 올려서 통과시키지 말 것.
 */
const MAX_PAYLOAD_RATIO = 3

const ROOT = join(process.cwd(), 'public')

function loadMetadata(): ModuleMetadata[] {
  const raw = readFileSync(join(ROOT, 'modules', 'modules-config.json'), 'utf8')
  return (JSON.parse(raw) as { modules: ModuleMetadata[] }).modules
}

function templateFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return templateFiles(full)
    return entry.name.endsWith('.json') && entry.name !== 'index.json' ? [full] : []
  })
}

/** 템플릿 파일의 모듈에는 인스턴스 id가 없다 — 수집기가 쓰므로 붙여 준다 */
function loadModules(file: string): ModuleInstance[] {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { modules?: Array<Record<string, unknown>> }
  return (raw.modules ?? []).map((module, index) => ({
    id: `m-${index}`,
    order: index,
    styles: {},
    ...module,
  })) as ModuleInstance[]
}

/** 한 뉴스레터를 한 번 번역할 때의 (보이는 글자, 실제 보내는 글자) */
function measure(file: string, metadata: ModuleMetadata[]): { visible: number; sent: number } {
  const units = collectTranslationUnits(loadModules(file), metadata)
  return {
    visible: units.reduce((sum, unit) => sum + unit.source.length, 0),
    sent: units.reduce((sum, unit) => sum + (unit.sourceHtml ?? unit.source).length, 0),
  }
}

describe('번역 전송량', () => {
  const metadata = loadMetadata()
  const files = templateFiles(join(ROOT, 'templates'))

  it('읽을 템플릿이 실제로 있다', () => {
    // 경로가 바뀌어 0개를 재고 "통과"하는 일이 없도록
    expect(files.length).toBeGreaterThan(5)
    expect(metadata.length).toBeGreaterThan(5)
  })

  it('보이는 글자 대비 전송량이 상한을 넘지 않는다', () => {
    const totals = files
      .map((file) => measure(file, metadata))
      .reduce((a, b) => ({ visible: a.visible + b.visible, sent: a.sent + b.sent }), {
        visible: 0,
        sent: 0,
      })
    expect(totals.visible).toBeGreaterThan(1000)
    const ratio = totals.sent / totals.visible
    expect(
      ratio,
      `번역기에 보내는 양이 보이는 글자의 ${ratio.toFixed(1)}배입니다(상한 ${MAX_PAYLOAD_RATIO}배).\n` +
        `  보이는 글자 ${totals.visible.toLocaleString()}자 → 실제 전송 ${totals.sent.toLocaleString()}자\n` +
        `  Azure 무료 한도는 월 200만 자이고 태그·속성도 글자로 셉니다.\n` +
        `  태그를 통째로 보내고 있지 않은지 확인하세요(newsletterTranslation.toSkeleton).`,
    ).toBeLessThanOrEqual(MAX_PAYLOAD_RATIO)
  })

  it('한 편이라도 유난히 무거운 템플릿이 없다', () => {
    const worst = files
      .map((file) => ({ file, ...measure(file, metadata) }))
      .filter((row) => row.visible > 300)
      .sort((a, b) => b.sent / b.visible - a.sent / a.visible)[0]
    if (!worst) return
    expect(
      worst.sent / worst.visible,
      `${worst.file}: ${worst.visible.toLocaleString()}자 → ${worst.sent.toLocaleString()}자`,
    ).toBeLessThanOrEqual(MAX_PAYLOAD_RATIO)
  })
})
