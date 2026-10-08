/**
 * 템플릿 미리보기의 '저장용 다운로드'가 만드는 문서는 에디터의 '파일 열기'로 **그대로 열려야** 한다.
 *
 * 스토어에 넣지 않고 템플릿만 직렬화하므로, 메타데이터가 지금 작업물(스토어)이 아니라
 * 넘겨준 템플릿 상태로 채워지는지, 그리고 그 파일을 다시 읽으면 같은 구성이 복원되는지 본다.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNewsletterDocument } from '../useNewsletterDocument'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { extractProjectMetadata } from '@/utils/projectFile'
import type { ModuleInstance, WrapSettings } from '@/types'

const templateModules: ModuleInstance[] = [
  { id: 'tpl-0', moduleId: 'ModuleDescText', order: 0, properties: { descriptionText: '<p>안녕</p>' }, styles: {}, groupId: 'g1', rowIndex: 0, columnIndex: 0 },
  { id: 'tpl-1', moduleId: 'ModuleOneButton', order: 1, properties: { buttonText: '신청 →' }, styles: {}, groupId: 'g1', rowIndex: 1, columnIndex: 0 },
]
const templateWrap: WrapSettings = {
  backgroundColor: '#f9f9f9',
  borderEnabled: false,
  borderWidth: '0px',
  borderColor: '#dddddd',
  borderStyle: 'solid',
  pointColor: '#fe5f0d',
  pointColors: ['#fe5f0d'],
  fontLanguage: 'default',
  summary: '메가주 뉴스레터입니다.',
  volume: '',
}

describe('템플릿 저장용 다운로드 문서', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('메타데이터는 스토어가 아니라 넘겨준 템플릿 상태로 채워진다', () => {
    // 스토어에는 전혀 다른 작업물이 있어도 섞이면 안 된다
    const moduleStore = useModuleStore()
    const editorStore = useEditorStore()
    moduleStore.modules.push({ id: 'live', moduleId: 'ModuleImg', order: 0, properties: {}, styles: {} })
    editorStore.setCurrentTemplate({ templateId: 'kpet', templateName: '케이펫', teamId: 'pet-ind' })
    editorStore.updateWrapSettings({ volume: 'vol03', summary: '지금 작업물' })

    const { wrapDocument } = useNewsletterDocument()
    const html = wrapDocument('<table></table>', true, {
      modules: templateModules,
      groups: [{ id: 'g1', name: '그룹 01', styles: {}, rows: [1, 1] }],
      wrapSettings: templateWrap,
      teamId: 'pet-ind',
    })

    const data = extractProjectMetadata(html)
    expect(data).not.toBeNull()
    expect(data!.modules.map((m) => m.moduleId)).toEqual(['ModuleDescText', 'ModuleOneButton'])
    expect(data!.modules[0]).toMatchObject({ groupId: 'g1', rowIndex: 0, columnIndex: 0 })
    expect(data!.groups?.map((g) => g.id)).toEqual(['g1'])
    expect(data!.wrapSettings?.summary).toBe('메가주 뉴스레터입니다.')
    expect(data!.wrapSettings?.pointColors).toEqual(['#fe5f0d'])
    // 회차는 템플릿의 것이 아니다 — 내 폴더에서 열 때 저장 위치를 끌고 가지 않도록 비어 있어야 한다
    expect(data!.wrapSettings?.volume).toBe('')
    expect(data!.teamId).toBe('pet-ind')
  })

  it('상태를 넘기지 않으면 전처럼 지금 작업물을 담는다', () => {
    const moduleStore = useModuleStore()
    const editorStore = useEditorStore()
    moduleStore.modules.push({ id: 'live', moduleId: 'ModuleImg', order: 0, properties: {}, styles: {} })
    editorStore.setCurrentTemplate({ templateId: 'kpet', templateName: '케이펫', teamId: 'pet-ind' })

    const { wrapDocument } = useNewsletterDocument()
    const data = extractProjectMetadata(wrapDocument('<table></table>', true))
    expect(data!.modules.map((m) => m.moduleId)).toEqual(['ModuleImg'])
    expect(data!.teamId).toBe('pet-ind')
  })
})
