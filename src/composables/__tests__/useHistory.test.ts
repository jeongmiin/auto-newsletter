import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, effectScope } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { useHistory, getHistoryInstance, disposeHistoryInstance } from '../useHistory'
import type { ModuleInstance } from '@/types'

const makeModule = (id: string): ModuleInstance => ({
  id,
  moduleId: 'TestModule',
  order: 0,
  properties: { title: id },
  styles: {},
})

// 디바운스(300ms) watcher가 실제로 저장하도록 변경 후 타이머/마이크로태스크를 흘려보냄
const flushSave = async () => {
  await nextTick()
  vi.advanceTimersByTime(300)
  await nextTick()
}

// undo/redo 적용 후 isApplyingHistory(400ms) 해제 및 부수 저장 무효화까지 진행
const flushApply = async () => {
  await nextTick()
  vi.advanceTimersByTime(400)
  await nextTick()
}

describe('useHistory - 실행 취소/다시 실행', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('한 번의 Ctrl+Z로 곧바로 직전 상태가 복원된다 (한 칸 밀림 없음)', async () => {
    const store = useModuleStore()
    const history = useHistory()

    store.modules.push(makeModule('A'))
    await flushSave()
    store.modules.push(makeModule('B'))
    await flushSave()

    expect(store.modules.map((m) => m.id)).toEqual(['A', 'B'])

    // 단 한 번의 undo로 [A]까지 복원되어야 함
    expect(history.undo()).toBe(true)
    await flushApply()

    expect(store.modules.map((m) => m.id)).toEqual(['A'])
  })

  it('redo로 취소한 작업을 다시 적용한다', async () => {
    const store = useModuleStore()
    const history = useHistory()

    store.modules.push(makeModule('A'))
    await flushSave()
    store.modules.push(makeModule('B'))
    await flushSave()

    history.undo()
    await flushApply()
    expect(store.modules.map((m) => m.id)).toEqual(['A'])

    expect(history.redo()).toBe(true)
    await flushApply()
    expect(store.modules.map((m) => m.id)).toEqual(['A', 'B'])
  })

  it('초기 상태(스택에 현재 상태만 존재)에서는 undo가 동작하지 않는다', async () => {
    const store = useModuleStore()
    const history = useHistory()

    store.modules.push(makeModule('A'))
    await flushSave()

    expect(history.canUndo.value).toBe(false)
    expect(history.undo()).toBe(false)
  })

  it('undo 후 편집해도 히스토리 스냅샷이 오염되지 않는다', async () => {
    const store = useModuleStore()
    const history = useHistory()

    store.modules.push(makeModule('A'))
    await flushSave()
    store.modules.push(makeModule('B'))
    await flushSave()

    history.undo() // -> [A]
    await flushApply()

    // 복원된 모듈을 편집
    store.modules[0].properties.title = '변경됨'
    await flushSave()

    // redo로 되돌아온 B 상태의 A는 원본('A')을 유지해야 함
    history.undo() // -> 편집 직전([A])
    await flushApply()
    expect(store.modules[0].properties.title).toBe('A')
  })

  it('번역과 함께 바뀌는 언어별 폰트 설정도 실행 취소한다', async () => {
    const editorStore = useEditorStore()
    const history = useHistory()
    history.saveState()

    editorStore.updateWrapSettings({ fontLanguage: 'ja' })
    await flushSave()
    expect(editorStore.wrapSettings.fontLanguage).toBe('ja')

    expect(history.undo()).toBe(true)
    await flushApply()
    expect(editorStore.wrapSettings.fontLanguage).toBe('default')
  })
})

/**
 * 싱글톤(getHistoryInstance)은 **화면 이동으로 죽지 않아야 한다.**
 * 헤더(AppHeader)는 템플릿 선택 화면에도 있어 싱글톤이 거기서 만들어진다 —
 * 그 컴포넌트가 언마운트될 때 watcher까지 사라지면 에디터에서 실행취소가 통째로 먹지 않는다.
 */
describe('getHistoryInstance - 화면 이동 후에도 살아 있는 감시', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    disposeHistoryInstance()
  })

  afterEach(() => {
    disposeHistoryInstance()
    vi.useRealTimers()
  })

  it('싱글톤을 만든 컴포넌트가 사라져도 변경을 계속 기록한다', async () => {
    const store = useModuleStore()

    // 템플릿 선택 화면의 헤더에서 처음 생성되는 상황
    const viewScope = effectScope()
    const history = viewScope.run(() => getHistoryInstance())!
    // 그 화면을 떠난다(언마운트)
    viewScope.stop()

    // 에디터에서의 편집
    store.modules.push(makeModule('A'))
    await flushSave()
    store.modules.push(makeModule('B'))
    await flushSave()

    expect(history.canUndo.value).toBe(true)
    expect(history.undo()).toBe(true)
    await flushApply()
    expect(store.modules.map((m) => m.id)).toEqual(['A'])
  })

  it('같은 인스턴스를 돌려준다', () => {
    expect(getHistoryInstance()).toBe(getHistoryInstance())
  })
})
