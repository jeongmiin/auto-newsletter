/**
 * 저장(내려받기) → 파일 열기 왕복 회귀 테스트.
 *
 * 실제로 났던 버그 두 가지를 막는다:
 *  1) 저장할 때 rowIndex/columnIndex를 빠뜨려 2단 그룹이 열 때 한 컬럼으로 몰림
 *  2) 복원할 때 addModule이 "선택 모듈의 그룹"을 물려줘, 그룹 뒤에 오는 모듈들이 그 그룹으로 빨려 들어감
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import {
  serializeModule,
  extractProjectMetadata,
  restoreProject,
  METADATA_START,
  METADATA_END,
  type ProjectMetadata,
  type ProjectModuleData,
} from '@/utils/projectFile'
import type { ModuleInstance, ModuleMetadata } from '@/types'

global.fetch = vi.fn()

/** 테스트용 원소 모듈 메타데이터 (실제 modules-config.json을 읽지 않는다) */
const meta = (id: string): ModuleMetadata => ({
  id,
  name: id,
  description: '',
  category: 'common',
  icon: 'T',
  htmlFile: `${id}.html`,
  editableProps: [{ key: 'label', label: '라벨', type: 'text', default: '' }],
})

const AVAILABLE = ['ModuleImg', 'ModuleDescText', 'ModuleOneButton', 'SectionTitle'].map(meta)

const seedAvailableModules = () => {
  const store = useModuleStore()
  store.availableModules = AVAILABLE
  return store
}

/** 저장 파일과 동일한 형태의 메타데이터를 만든다 */
const serializeProject = (): ProjectMetadata => {
  const store = useModuleStore()
  return {
    modules: store.modules.map(serializeModule),
    groups: JSON.parse(JSON.stringify(store.groups)),
  }
}

const findByLabel = (label: string): ModuleInstance | undefined =>
  useModuleStore().modules.find((m) => m.properties.label === label)

describe('projectFile — 메타데이터 추출', () => {
  it('저장 주석에서 메타데이터를 읽는다', () => {
    const data = { modules: [{ moduleId: 'ModuleImg', order: 0, properties: {}, styles: {} }] }
    const html = `<body>본문</body>\n${METADATA_START}\n<!-- ${JSON.stringify(data)} -->\n${METADATA_END}`
    expect(extractProjectMetadata(html)?.modules).toHaveLength(1)
  })

  it('메타데이터 주석이 없으면 null', () => {
    expect(extractProjectMetadata('<body>발송용 HTML</body>')).toBeNull()
  })

  it('JSON이 깨져 있으면 null', () => {
    const html = `${METADATA_START}\n<!-- {깨진 JSON -->\n${METADATA_END}`
    expect(extractProjectMetadata(html)).toBeNull()
  })

  it('아주 예전 형식(모듈 배열만)도 읽는다', () => {
    const html = `${METADATA_START}\n<!-- [{"moduleId":"ModuleImg","order":0,"properties":{},"styles":{}}] -->\n${METADATA_END}`
    expect(extractProjectMetadata(html)?.modules).toHaveLength(1)
  })
})

describe('projectFile — 저장 시 그룹 배치 보존', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('그룹 안 배치(행·컬럼)를 저장 데이터에 담는다', () => {
    const store = seedAvailableModules()
    store.addModule(meta('ModuleImg'))
    const m = store.modules[0]
    m.groupId = 'group-1'
    m.rowIndex = 1
    m.columnIndex = 1

    expect(serializeModule(m)).toMatchObject({
      moduleId: 'ModuleImg',
      groupId: 'group-1',
      rowIndex: 1,
      columnIndex: 1,
    })
  })

  it('그룹에 속하지 않은 모듈은 그룹 관련 필드를 넣지 않는다', () => {
    const store = seedAvailableModules()
    store.addModule(meta('ModuleImg'))
    const out = serializeModule(store.modules[0])
    expect(out).not.toHaveProperty('groupId')
    expect(out).not.toHaveProperty('columnIndex')
    expect(out).not.toHaveProperty('fullWidth')
  })
})

describe('projectFile — 저장 → 열기 왕복', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  /**
   * 재현 상황: [2단 버튼 그룹] 다음에 그룹에 속하지 않은 모듈들이 오는 구성.
   * (v2 변환 결과가 딱 이 모양이다 — 복수 버튼 그룹 뒤에 섹션 타이틀·배너 이미지)
   */
  const buildTwoColumnGroupThenLooseModules = () => {
    const store = seedAvailableModules()
    store.addModule(meta('ModuleOneButton'))
    store.addModule(meta('ModuleOneButton'))
    store.modules[0].properties.label = '왼쪽 버튼'
    store.modules[1].properties.label = '오른쪽 버튼'
    store.modules[0].rowIndex = 0
    store.modules[0].columnIndex = 0
    store.modules[1].rowIndex = 0
    store.modules[1].columnIndex = 1
    const groupId = store.createGroup([store.modules[0].id, store.modules[1].id])

    // 그룹 뒤에 붙는 '그룹 밖' 모듈들
    store.selectedModuleId = null
    store.addModule(meta('SectionTitle'))
    store.modules[2].properties.label = '섹션 타이틀'
    store.selectedModuleId = null
    store.addModule(meta('ModuleImg'))
    store.modules[3].properties.label = '배너'

    return { store, groupId }
  }

  it('2단 그룹의 좌·우 컬럼이 다시 열어도 유지된다', () => {
    buildTwoColumnGroupThenLooseModules()
    const saved = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    restoreProject(saved, false)

    expect(findByLabel('왼쪽 버튼')?.columnIndex).toBe(0)
    expect(findByLabel('오른쪽 버튼')?.columnIndex).toBe(1)
    expect(useModuleStore().groups[0].rows).toEqual([2])
  })

  it('그룹 뒤에 오는 모듈이 그 그룹으로 빨려 들어가지 않는다', () => {
    buildTwoColumnGroupThenLooseModules()
    const saved = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    restoreProject(saved, false)

    expect(findByLabel('섹션 타이틀')?.groupId).toBeUndefined()
    expect(findByLabel('배너')?.groupId).toBeUndefined()
  })

  it('모듈 순서와 개수가 그대로 복원된다', () => {
    buildTwoColumnGroupThenLooseModules()
    const saved = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    const result = restoreProject(saved, false)

    expect(result.restoredCount).toBe(4)
    expect(useModuleStore().modules.map((m) => m.properties.label)).toEqual([
      '왼쪽 버튼',
      '오른쪽 버튼',
      '섹션 타이틀',
      '배너',
    ])
  })

  it('그룹 정의(스타일·컬럼 너비)가 복원된다', () => {
    const { store, groupId } = buildTwoColumnGroupThenLooseModules()
    const group = store.groups.find((g) => g.id === groupId)!
    group.name = '복수 버튼'
    group.colWidths = [[40, 60]]
    group.styles = { ...group.styles, paddingLeft: '15px' }
    const saved = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    restoreProject(saved, false)

    const restored = useModuleStore().groups[0]
    expect(restored.name).toBe('복수 버튼')
    expect(restored.colWidths).toEqual([[40, 60]])
    expect(restored.styles.paddingLeft).toBe('15px')
  })

  it('사용자가 직접 묶어둔 그룹 안의 예전 모듈도 그 그룹 안에서 나뉜다', () => {
    // 새 편집 방식 변환은 실제 원소 모듈 메타데이터가 필요하다
    const store = useModuleStore()
    store.availableModules = ['ModuleImg', 'ModuleDescText', 'ModuleDivider', 'ModuleOneButton'].map(
      meta,
    )
    const saved: ProjectMetadata = {
      modules: [
        {
          moduleId: 'SectionTitle',
          order: 0,
          properties: {
            showMainTitle: true,
            mainTitle: 'Discover MEGAZOO Before You Arrive',
            mainTitleFontSize: '22px',
            mainTitleColor: '#fe5f0d',
            showSubTitle: false,
            showSectionImage: false,
            topBorderWidth: '2px',
            topBorderColor: '#333333',
            sectionBgColor: 'transparent',
          },
          styles: {},
          groupId: 'group-user-made',
          rowIndex: 0,
          columnIndex: 0,
        },
        {
          moduleId: 'ModuleDescText',
          order: 1,
          properties: { label: '본문' },
          styles: {},
          groupId: 'group-user-made',
          rowIndex: 0,
          columnIndex: 0,
        },
      ],
      groups: [{ id: 'group-user-made', styles: {} }],
    }

    const result = restoreProject(saved, true)

    expect(result.convertedCount).toBe(1)
    // 섹션 타이틀 → 구분선 + 텍스트로 나뉘고, 원래 그룹에 그대로 남는다
    expect(useModuleStore().modules.map((m) => m.moduleId)).toEqual([
      'ModuleDivider',
      'ModuleDescText',
      'ModuleDescText',
    ])
    expect(useModuleStore().modules.every((m) => m.groupId === 'group-user-made')).toBe(true)
    // 새 그룹을 만들지 않는다 (그룹이 쪼개지면 앞뒤 순서가 흐트러진다)
    expect(useModuleStore().groups.map((g) => g.id)).toEqual(['group-user-made'])
  })

  /** 그룹 멤버 하나를 만든다 */
  const member = (
    moduleId: string,
    order: number,
    properties: Record<string, unknown> = {},
  ): ProjectModuleData => ({
    moduleId,
    order,
    properties,
    styles: {},
    groupId: 'group-user-made',
    rowIndex: 0,
    columnIndex: 0,
  })

  it('그룹 안에 못 넣는 모듈이라도 그룹 맨 끝이면 자기 그룹으로 떼어낸다', () => {
    // 하단 푸터는 그룹 배경색이 필요해 형제와 같은 그룹에 넣을 수 없다.
    // 실제 파일에서 푸터는 언제나 맨 끝이라 떼어내도 순서가 흐트러지지 않는다.
    const store = useModuleStore()
    store.availableModules = [
      'ModuleDescText',
      'ModuleDivider',
      'ModuleContactInfo',
      'ModuleSnsIcons',
    ].map(meta)
    const saved: ProjectMetadata = {
      modules: [
        member('ModuleDescText', 0, { label: '안내' }),
        member('ModuleFooter', 1, { footerBgColor: '#e9e9e9', companyInfo: '<p>회사</p>' }),
      ],
      groups: [{ id: 'group-user-made', styles: {} }],
    }

    const result = restoreProject(saved, true)

    expect(result.convertedCount).toBe(1)
    const s = useModuleStore()
    expect(s.modules.some((m) => m.moduleId === 'ModuleFooter')).toBe(false)
    // 푸터는 배경색을 가진 자기 그룹으로 분리된다
    const footerGroup = s.groups.find((g) => g.styles.backgroundColor === '#e9e9e9')
    expect(footerGroup).toBeDefined()
    // 원래 형제는 원래 그룹에 그대로 남고, 순서도 그대로다
    expect(s.modules[0].groupId).toBe('group-user-made')
    expect(s.modules.slice(1).every((m) => m.groupId === footerGroup!.id)).toBe(true)
  })

  it('그룹 가운데에 있으면서 그룹 안에 못 넣는 모듈은 예전 방식으로 두고 알린다', () => {
    const store = useModuleStore()
    store.availableModules = ['ModuleDescText', 'ModuleOneButton', 'ModuleTwoButton'].map(meta)
    const saved: ProjectMetadata = {
      modules: [
        member('ModuleDescText', 0, { label: '위' }),
        // 2단이라 그룹 칸 안에 넣을 수 없고, 가운데라 떼어내면 순서가 뒤집힌다
        member('ModuleTwoButton', 1, { button1Text: 'A', button2Text: 'B' }),
        member('ModuleDescText', 2, { label: '아래' }),
      ],
      groups: [{ id: 'group-user-made', styles: {} }],
    }

    const result = restoreProject(saved, true)

    expect(result.convertedCount).toBe(0)
    expect(useModuleStore().modules[1].moduleId).toBe('ModuleTwoButton')
    expect(result.warnings.some((w) => w.includes('그룹 가운데'))).toBe(true)
  })

  it('변환된 그룹 다음에 오는 예전 모듈이 제자리에 들어간다', () => {
    // createGroup이 새 그룹을 '선택' 상태로 두는데, 그대로 두면 addModule의
    // "선택 그룹 바로 아래 삽입" 규칙에 걸려 다음 모듈이 그룹 앞으로 끼어들고
    // 속성이 엉뚱한 모듈에 적용된다(단일 버튼 텍스트가 기본값으로 돌아감).
    const store = useModuleStore()
    store.availableModules = ['ModuleImg', 'ModuleDescText', 'ModuleOneButton'].map(meta)
    const saved: ProjectMetadata = {
      modules: [
        // 2단 그룹을 만드는 변환 (이미지 | 텍스트)
        {
          moduleId: 'Module05-3',
          order: 0,
          properties: {
            showTopSectionTitle: false,
            showTopSectionText: false,
            topLeftImageUrl: 'https://example.com/a.png',
            showRightTitle: false,
            topRightText1: '<p>본문</p>',
            showSmallBtn1: false,
          },
          styles: {},
        },
        // 그룹으로 만들지 않는 변환 (설명 텍스트 1개)
        {
          moduleId: 'Module12',
          order: 1,
          properties: { showTitle: false, contentText: '<p>박스 텍스트</p>' },
          styles: {},
        },
        // 변환 대상이 아닌 원소 모듈 — 반드시 맨 뒤에, 자기 속성을 그대로 갖고 들어와야 한다
        {
          moduleId: 'ModuleOneButton',
          order: 2,
          properties: { buttonText: '부스타입 자세히 보기 →', buttonUrl: 'https://example.com' },
          styles: {},
        },
      ],
    }

    restoreProject(saved, true)

    const mods = useModuleStore().modules
    const last = mods[mods.length - 1]
    expect(last.moduleId).toBe('ModuleOneButton')
    expect(last.properties.buttonText).toBe('부스타입 자세히 보기 →')
    expect(last.properties.buttonUrl).toBe('https://example.com')
    // 기본값 그대로인 유령 버튼이 생기지 않아야 한다
    expect(mods.filter((m) => m.moduleId === 'ModuleOneButton')).toHaveLength(1)
    // 버튼은 그룹 밖 단독이어야 한다
    expect(last.groupId).toBeUndefined()
  })

  it('두 번 왕복해도 배치가 흐트러지지 않는다', () => {
    buildTwoColumnGroupThenLooseModules()
    const first = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    restoreProject(first, false)
    const second = serializeProject()

    setActivePinia(createPinia())
    seedAvailableModules()
    restoreProject(second, false)

    expect(findByLabel('오른쪽 버튼')?.columnIndex).toBe(1)
    expect(findByLabel('섹션 타이틀')?.groupId).toBeUndefined()
    expect(second).toEqual(first)
  })
})

describe('projectFile — 소속 팀(teamId)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    seedAvailableModules()
  })

  it('저장 파일의 teamId를 읽는다', () => {
    const data = { modules: [], teamId: 'arch-plan' }
    const html = `${METADATA_START}\n<!-- ${JSON.stringify(data)} -->\n${METADATA_END}`
    expect(extractProjectMetadata(html)?.teamId).toBe('arch-plan')
  })

  it('teamId가 없는 예전 파일도 그대로 열린다', () => {
    const html = `${METADATA_START}\n<!-- {"modules":[]} -->\n${METADATA_END}`
    const data = extractProjectMetadata(html)
    expect(data).not.toBeNull()
    expect(data!.teamId).toBeUndefined()
  })

  /**
   * ⚠ 이 규칙을 바꾸려면 근거를 먼저 확인할 것.
   * 에디터는 팀·템플릿을 고른 뒤에만 들어올 수 있고(router 가드), 파일 열기는 그 안에서 하는
   * 동작이다. 그래서 "지금 들어온 팀"이 작업의 소속이고, 파일 속 teamId는 기록으로만 남는다.
   * 파일 쪽을 반영하게 바꾸면 남의 팀 파일을 열어 이어 작업할 때 소속이 조용히 바뀐다.
   */
  it('파일을 열어도 현재 작업 팀을 덮어쓰지 않는다', () => {
    const editorStore = useEditorStore()
    editorStore.setCurrentTemplate({
      templateId: 'nextcon-template',
      templateName: '넥스트콘',
      teamId: 'arch-plan',
    })

    restoreProject({ modules: [], teamId: 'pet-industry' }, false)

    expect(editorStore.currentTeamId, '파일의 팀으로 바뀌면 안 된다').toBe('arch-plan')
  })
})
