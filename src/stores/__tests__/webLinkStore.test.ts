/**
 * 웹 링크 리마인드 규칙.
 *
 * '링크를 만든 뒤 내용이 바뀌었다'는 판단은 깃발이 아니라 **내용을 통째로 견줘서** 한다.
 * 이 성질(되돌리면 안내도 사라진다) 때문에 조건이 미묘해서, 화면을 고치다 조용히 뒤집히기 쉽다.
 * 리마인드가 안 뜨면 받는 사람이 옛 내용을 보게 되므로 규칙을 여기에 고정한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// 업로드·폴더 조회·문서 만들기는 네트워크와 캔버스에 기대므로 흉내만 낸다 —
// 여기서 보려는 건 '언제 리마인드가 뜨고 사라지는가'다.
vi.mock('@/utils/s3Upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/s3Upload')>()
  return {
    ...actual,
    isUploadEnabled: () => true,
    buildUploadDirectory: () => 'e-dm/2026/test/vol01/',
    uploadHtml: vi.fn(async () => ({ url: 'https://example.com/test_send.html' })),
  }
})
vi.mock('@/utils/s3Browse', () => ({
  listFolders: vi.fn(async () => []),
  objectUrl: (key: string) => `https://example.com/${key}`,
  toPrefix: (dir: string) => dir,
}))
vi.mock('@/composables/useNewsletterDocument', () => ({
  useNewsletterDocument: () => ({ buildDocument: vi.fn(async () => '<html></html>') }),
}))

import { useWebLinkStore, webLinkToast } from '../webLinkStore'
import { useModuleStore } from '../moduleStore'
import type { ModuleMetadata } from '@/types'

const meta: ModuleMetadata = {
  id: 'TestModule',
  name: '테스트 모듈',
  description: '설명',
  category: 'text',
  icon: 'T',
  htmlFile: 'TestModule.html',
  editableProps: [{ key: 'title', label: '제목', type: 'text', default: 't' }],
}

/** 링크를 하나 만들어 둔 상태 — 여기서부터가 '기준' */
const withLink = async () => {
  const modules = useModuleStore()
  const webLink = useWebLinkStore()
  modules.addModule(meta)
  const result = await webLink.createLink()
  expect(result.status).toBe('created')
  return { modules, webLink }
}

describe('웹 링크 리마인드', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('링크가 없으면 내용을 고쳐도 뜨지 않는다', () => {
    const modules = useModuleStore()
    const webLink = useWebLinkStore()
    modules.addModule(meta)
    webLink.refreshContentChanged()

    expect(webLink.contentChanged).toBe(false)
    expect(webLink.showReminder).toBe(false)
  })

  it('링크를 만든 직후에는 뜨지 않는다 — 방금 올린 것이 곧 기준이다', async () => {
    const { webLink } = await withLink()
    webLink.refreshContentChanged()

    expect(webLink.showReminder).toBe(false)
  })

  it('링크를 만든 뒤 내용을 고치면 뜬다', async () => {
    const { modules, webLink } = await withLink()
    modules.addModule(meta)
    webLink.refreshContentChanged()

    expect(webLink.contentChanged).toBe(true)
    expect(webLink.showReminder).toBe(true)
  })

  it('반영하면 사라진다', async () => {
    const { modules, webLink } = await withLink()
    modules.addModule(meta)
    webLink.refreshContentChanged()
    expect(webLink.showReminder).toBe(true)

    const result = await webLink.createLink()
    expect(result.status).toBe('updated') // 두 번째부터는 '최신 내용 반영'
    expect(webLink.showReminder).toBe(false)
  })

  it('고쳤다가 되돌리면 사라진다 — 깃발이 아니라 내용을 견주기 때문', async () => {
    const { modules, webLink } = await withLink()
    const added = modules.modules[modules.modules.length - 1]

    modules.addModule(meta)
    webLink.refreshContentChanged()
    expect(webLink.showReminder).toBe(true)

    modules.removeModule(modules.modules[modules.modules.length - 1].id)
    webLink.refreshContentChanged()
    expect(modules.modules.at(-1)?.id).toBe(added.id)
    expect(webLink.showReminder).toBe(false)
  })

  it('닫으면 접히고, 반영 없이 또 고치면 다시 뜬다', async () => {
    const { modules, webLink } = await withLink()
    modules.addModule(meta)
    webLink.refreshContentChanged()
    expect(webLink.showReminder).toBe(true)

    webLink.dismissReminder()
    expect(webLink.showReminder).toBe(false)

    // 되돌렸다 다시 고치면 — contentChanged가 false를 거치며 접힘이 풀린다
    modules.removeModule(modules.modules[modules.modules.length - 1].id)
    webLink.refreshContentChanged()
    modules.addModule(meta)
    webLink.refreshContentChanged()

    expect(webLink.showReminder).toBe(true)
  })

  it('AI 도구의 웹 링크 화면을 펼쳐 두면 뜨지 않는다 — 거기에 같은 안내가 있다', async () => {
    const { modules, webLink } = await withLink()
    modules.addModule(meta)
    webLink.refreshContentChanged()
    expect(webLink.showReminder).toBe(true)

    webLink.toolOpen = true
    expect(webLink.showReminder).toBe(false)

    webLink.toolOpen = false
    expect(webLink.showReminder).toBe(true)
  })

  it('모듈이 하나도 없으면 링크를 만들지 않는다', async () => {
    const webLink = useWebLinkStore()
    const result = await webLink.createLink()

    expect(result.status).toBe('no-modules')
    expect(webLink.errorText).not.toBe('')
    expect(webLink.existing).toBeNull()
  })

  it('말풍선 문구 — 처음 만들 때와 반영할 때가 다르다', () => {
    expect(webLinkToast({ status: 'created' })?.summary).toBe('웹 링크가 만들어졌어요')
    expect(webLinkToast({ status: 'updated' })?.summary).toBe('최신 내용을 반영했어요')
    // 화면 안에 errorText로 적히는 것들은 말풍선까지 띄우지 않는다
    expect(webLinkToast({ status: 'no-modules' })).toBeNull()
    expect(webLinkToast({ status: 'failed', message: 'x' })).toBeNull()
  })
})
