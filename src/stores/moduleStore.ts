import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type {
  ModuleInstance,
  ModuleMetadata,
  TableRow,
  ContentTitle,
  ContentText,
  AdditionalContent,
  TableCell,
} from '@/types'
import { useEditorStore } from './editorStore'
import { formatTextWithBreaks } from '@/utils/textUtils'
import { generateUniqueId, applyStylesToHtml } from '@/utils/htmlUtils'
import {
  replaceModuleBasicHeaderContent,
  replaceModuleDescTextContent,
  replaceModuleImgContent,
  replaceModuleOneButtonContent,
  replaceModuleTwoButtonContent,
  replaceSectionTitleContent,
  replaceModule04Content,
  replaceModule02Content,
  replaceModule053Content,
  replaceModule051Content,
  replaceModule052Content,
  replaceModule06Content,
  replaceModule07Content,
  replaceModule07ReverseContent,
  replaceModule011Content,
  replaceModule012Content,
  replaceModuleFooterContent,
  replaceModule10Content,
  replaceModule101Content,
  replaceModuleSubTitleContent,
  replaceModuleTableContent,
  replaceDefaultTemplate,
} from '@/utils/moduleContentReplacer'

export const useModuleStore = defineStore('module', () => {
  // ============= State =============
  const modules = ref<ModuleInstance[]>([])
  const selectedModuleId = ref<string | null>(null)
  const availableModules = ref<ModuleMetadata[]>([])
  const isDirty = ref(false) // 변경사항 추적

  // ============= Computed =============
  const selectedModule = computed(
    () => modules.value.find((m) => m.id === selectedModuleId.value) || null,
  )

  const selectedModuleMetadata = computed(() => {
    if (!selectedModule.value) return null
    return availableModules.value.find((m) => m.id === selectedModule.value!.moduleId) || null
  })

  // ============= Module Metadata =============
  /**
   * 경로 정규화 헬퍼 함수
   */
  const normalizePath = (path: string): string => {
    // 중복 슬래시 제거
    return path.replace(/\/+/g, '/')
  }

  /**
   * 사용 가능한 모듈 메타데이터 로드
   */
  const loadAvailableModules = async (): Promise<ModuleMetadata[]> => {
    try {
      // 개발/프로덕션 환경에 따른 경로 처리
      const basePath = import.meta.env.BASE_URL || '/'
      const configPath = normalizePath(`${basePath}modules/modules-config.json`)

      const response = await fetch(configPath)
      if (!response.ok) {
        throw new Error(`Failed to load modules: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data || !Array.isArray(data.modules)) {
        throw new Error('Invalid modules configuration format')
      }

      const validatedModules = data.modules.filter((module: ModuleMetadata) => {
        return (
          module &&
          typeof module.id === 'string' &&
          typeof module.name === 'string' &&
          Array.isArray(module.editableProps)
        )
      })

      if (validatedModules.length !== data.modules.length) {
        console.warn('Some modules were excluded due to invalid format')
      }

      availableModules.value = validatedModules
      return validatedModules
    } catch (error) {
      console.error('[loadAvailableModules] Failed to load module metadata:', error)
      if (typeof window !== 'undefined') {
        console.warn('Cannot load module configuration. Using empty modules.')
      }
      availableModules.value = []
      return []
    }
  }

  // ============= Module Management =============
  /**
   * 모듈 추가
   */
  const addModule = (moduleMetadata: ModuleMetadata): void => {
    const newModule: ModuleInstance = {
      id: generateUniqueId('module'),
      moduleId: moduleMetadata.id,
      order: modules.value.length,
      properties: getDefaultProperties(moduleMetadata),
      styles: moduleMetadata.defaultStyles || {},
    }

    modules.value.push(newModule)
    selectedModuleId.value = newModule.id
    isDirty.value = true
  }

  /**
   * 모듈 선택
   */
  const selectModule = (moduleId: string): void => {
    selectedModuleId.value = moduleId
  }

  /**
   * 모듈 속성 업데이트
   */
  const updateModuleProperty = (propertyKey: string, value: unknown): void => {
    if (!selectedModule.value) return
    selectedModule.value.properties[propertyKey] = value
    // 🐛 해결책: 속성 변경 후 modules ref 트리거
    triggerRef(modules)
    isDirty.value = true
  }

  /**
   * 모듈 스타일 업데이트
   */
  const updateModuleStyle = (styleKey: string, value: unknown): void => {
    if (!selectedModule.value) return
    ;(selectedModule.value.styles as Record<string, unknown>)[styleKey] = value
  }

  /**
   * 모듈 제거
   */
  const removeModule = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index === -1) return

    modules.value.splice(index, 1)
    if (selectedModuleId.value === moduleId) {
      selectedModuleId.value = null
    }
    reorderModules()
    isDirty.value = true
  }

  /**
   * 모듈 순서 재정렬
   */
  const reorderModules = (): void => {
    modules.value.forEach((module, idx) => {
      module.order = idx
    })
  }

  /**
   * 모듈 위로 이동
   */
  const moveModuleUp = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index <= 0) return
    ;[modules.value[index], modules.value[index - 1]] = [
      modules.value[index - 1],
      modules.value[index],
    ]
    reorderModules()
    isDirty.value = true
  }

  /**
   * 모듈 아래로 이동
   */
  const moveModuleDown = (moduleId: string): void => {
    const index = modules.value.findIndex((m) => m.id === moduleId)
    if (index < 0 || index >= modules.value.length - 1) return
    ;[modules.value[index], modules.value[index + 1]] = [
      modules.value[index + 1],
      modules.value[index],
    ]
    reorderModules()
    isDirty.value = true
  }

  /**
   * 모듈 복제
   */
  const duplicateModule = (moduleId: string): void => {
    const originalModule = modules.value.find((m) => m.id === moduleId)
    if (!originalModule) return

    const duplicatedModule: ModuleInstance = {
      ...originalModule,
      id: generateUniqueId('module'),
      order: originalModule.order + 1,
      properties: JSON.parse(JSON.stringify(originalModule.properties)),
      styles: JSON.parse(JSON.stringify(originalModule.styles)),
    }

    const insertIndex = modules.value.findIndex((m) => m.id === moduleId) + 1
    modules.value.splice(insertIndex, 0, duplicatedModule)
    reorderModules()

    selectedModuleId.value = duplicatedModule.id
    isDirty.value = true
  }

  /**
   * 전체 삭제
   */
  const clearAll = (): void => {
    modules.value = []
    selectedModuleId.value = null
    isDirty.value = false
  }

  /**
   * 저장됨으로 표시 (내보내기 후 호출)
   */
  const markAsSaved = (): void => {
    isDirty.value = false
  }

  // ============= Table Row Management =============
  const addTableRow = (moduleId: string, header: string = '', data: string = ''): void => {
    const moduleIndex = modules.value.findIndex((m) => m.id === moduleId)
    if (moduleIndex === -1) {
      console.error(`[addTableRow] Module not found: ${moduleId}`)
      return
    }

    const module = modules.value[moduleIndex]

    const newRow: TableRow = {
      id: generateUniqueId('row'),
      header,
      data,
    }

    // tableRows 초기화 및 추가
    const currentRows = (module.properties.tableRows as TableRow[]) || []

    // 🐛 해결책: modules.value를 직접 변경하고 triggerRef로 강제 업데이트
    module.properties.tableRows = [...currentRows, newRow]

    // modules ref를 강제로 트리거하여 Vue에게 변경을 알림
    triggerRef(modules)
  }

  const updateTableRow = (
    moduleId: string,
    rowId: string,
    field: 'header' | 'data',
    value: string,
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const row = (module.properties.tableRows as TableRow[]).find((r: TableRow) => r.id === rowId)
    if (row) {
      row[field] = value
    }
  }

  const removeTableRow = (moduleId: string, rowId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.tableRows) return

    const index = (module.properties.tableRows as TableRow[]).findIndex(
      (r: TableRow) => r.id === rowId,
    )
    if (index !== -1) {
      ;(module.properties.tableRows as TableRow[]).splice(index, 1)
    }
  }

  // ============= Custom Table Cell Management =============
  /**
   * 테이블 셀 초기화 (기본 2x2 테이블)
   */
  const initializeTableCells = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const defaultCells: TableCell[][] = [
      [
        { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1, width: '30%', align: 'center' },
        { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1, align: 'left' },
      ],
      [
        { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1, width: '30%', align: 'center' },
        { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1, align: 'left' },
      ],
    ]

    module.properties.tableCells = defaultCells
    triggerRef(modules)
  }

  /**
   * 테이블 행 추가 (커스텀 테이블)
   */
  const addTableCellRow = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []

    // 첫 행이 없으면 초기화
    if (cells.length === 0) {
      initializeTableCells(moduleId)
      return
    }

    // 기존 열 수에 맞춰 새 행 추가
    const colCount = cells[0].length
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({
      id: generateUniqueId('cell'),
      type: 'td' as const,
      content: '',
      colspan: 1,
      rowspan: 1,
      align: 'left' as const,
    }))

    cells.push(newRow)
    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 열 추가 (커스텀 테이블)
   */
  const addTableCellColumn = (moduleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []

    if (cells.length === 0) {
      initializeTableCells(moduleId)
      return
    }

    // 각 행에 새 열 추가
    cells.forEach((row, rowIndex) => {
      row.push({
        id: generateUniqueId('cell'),
        type: rowIndex === 0 ? 'th' : 'td',
        content: '',
        colspan: 1,
        rowspan: 1,
        align: 'left',
      })
    })

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 행 삭제 (커스텀 테이블)
   */
  const removeTableCellRow = (moduleId: string, rowIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length || cells.length <= 1) return

    cells.splice(rowIndex, 1)
    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 열 삭제 (커스텀 테이블)
   */
  const removeTableCellColumn = (moduleId: string, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (cells.length === 0 || colIndex < 0 || colIndex >= cells[0].length || cells[0].length <= 1) return

    cells.forEach((row) => {
      row.splice(colIndex, 1)
    })

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 셀 업데이트 (colspan/rowspan 변경 시 hidden 셀 처리 포함)
   */
  const updateTableCell = (
    moduleId: string,
    rowIndex: number,
    colIndex: number,
    updates: Partial<TableCell>
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    const prevColspan = cell.colspan || 1
    const prevRowspan = cell.rowspan || 1

    // colspan 또는 rowspan이 변경되는 경우 hidden 셀 처리
    if (updates.colspan !== undefined || updates.rowspan !== undefined) {
      const newColspan = updates.colspan ?? prevColspan
      const newRowspan = updates.rowspan ?? prevRowspan

      // 기존 병합 해제 (이전에 hidden이었던 셀들 복원)
      for (let r = rowIndex; r < rowIndex + prevRowspan && r < cells.length; r++) {
        for (let c = colIndex; c < colIndex + prevColspan && c < cells[r].length; c++) {
          if (r !== rowIndex || c !== colIndex) {
            cells[r][c].hidden = false
          }
        }
      }

      // 새로운 병합 적용
      for (let r = rowIndex; r < rowIndex + newRowspan && r < cells.length; r++) {
        for (let c = colIndex; c < colIndex + newColspan && c < cells[r].length; c++) {
          if (r !== rowIndex || c !== colIndex) {
            cells[r][c].hidden = true
          }
        }
      }
    }

    Object.assign(cell, updates)

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 병합 (colspan/rowspan 설정)
   */
  const mergeCells = (
    moduleId: string,
    startRow: number,
    startCol: number,
    rowSpan: number,
    colSpan: number
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (startRow < 0 || startRow >= cells.length) return
    if (startCol < 0 || startCol >= cells[startRow].length) return

    // 시작 셀에 colspan/rowspan 설정
    cells[startRow][startCol].colspan = colSpan
    cells[startRow][startCol].rowspan = rowSpan

    // 병합되는 나머지 셀들을 hidden으로 표시
    for (let r = startRow; r < startRow + rowSpan && r < cells.length; r++) {
      for (let c = startCol; c < startCol + colSpan && c < cells[r].length; c++) {
        if (r !== startRow || c !== startCol) {
          cells[r][c].hidden = true
        }
      }
    }

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 병합 해제
   */
  const unmergeCell = (moduleId: string, rowIndex: number, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    const prevColspan = cell.colspan
    const prevRowspan = cell.rowspan

    // 병합 해제
    cell.colspan = 1
    cell.rowspan = 1

    // 병합되었던 셀들의 hidden 해제
    for (let r = rowIndex; r < rowIndex + prevRowspan && r < cells.length; r++) {
      for (let c = colIndex; c < colIndex + prevColspan && c < cells[r].length; c++) {
        cells[r][c].hidden = false
      }
    }

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 셀 타입 토글 (th <-> td)
   */
  const toggleCellType = (moduleId: string, rowIndex: number, colIndex: number): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    const cells = (module.properties.tableCells as TableCell[][]) || []
    if (rowIndex < 0 || rowIndex >= cells.length) return
    if (colIndex < 0 || colIndex >= cells[rowIndex].length) return

    const cell = cells[rowIndex][colIndex]
    cell.type = cell.type === 'th' ? 'td' : 'th'

    module.properties.tableCells = [...cells]
    triggerRef(modules)
  }

  /**
   * 테이블 프리셋 적용
   */
  const applyTablePreset = (
    moduleId: string,
    presetId: string,
    rows: number,
    cols: number,
    structure: ('th' | 'td')[][],
    defaultLabels?: Record<string, string[]>
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    // 프리셋별 기본 라벨
    const labels: Record<string, string[][]> = {
      '2col-simple': [
        ['항목', '내용'],
        ['항목', '내용'],
        ['항목', '내용'],
      ],
      '3col-simple': [
        ['항목', '내용', '내용'],
        ['항목', '내용', '내용'],
        ['항목', '내용', '내용'],
      ],
      'schedule': [
        ['시간', '내용', '비고'],
        ['10:00', '', ''],
        ['11:00', '', ''],
        ['12:00', '', ''],
      ],
      'price': [
        ['구분', '가격', '비고'],
        ['항목1', '', ''],
        ['항목2', '', ''],
        ['항목3', '', ''],
      ],
    }

    const presetLabels = labels[presetId] || []

    // 새 테이블 셀 생성
    const newCells: TableCell[][] = []
    for (let r = 0; r < rows; r++) {
      const row: TableCell[] = []
      for (let c = 0; c < cols; c++) {
        const cellType = structure[r]?.[c] || 'td'
        const content = presetLabels[r]?.[c] || ''
        row.push({
          id: generateUniqueId('cell'),
          type: cellType,
          content,
          colspan: 1,
          rowspan: 1,
          width: cellType === 'th' && c === 0 ? '25%' : undefined,
          align: cellType === 'th' ? 'center' : 'left',
        })
      }
      newCells.push(row)
    }

    module.properties.tableCells = newCells
    module.properties.tablePresetId = presetId
    triggerRef(modules)
  }

  // ============= Content Title Management =============
  const addContentTitle = (moduleId: string, text: string = ''): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTitles) {
      module.properties.contentTitles = []
    }

    const newTitle: ContentTitle = {
      id: generateUniqueId('title'),
      text,
    }

    ;(module.properties.contentTitles as ContentTitle[]).push(newTitle)
  }

  const updateContentTitle = (moduleId: string, titleId: string, text: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const title = (module.properties.contentTitles as ContentTitle[]).find(
      (t: ContentTitle) => t.id === titleId,
    )
    if (title) {
      title.text = text
    }
  }

  const removeContentTitle = (moduleId: string, titleId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTitles) return

    const index = (module.properties.contentTitles as ContentTitle[]).findIndex(
      (t: ContentTitle) => t.id === titleId,
    )
    if (index !== -1) {
      ;(module.properties.contentTitles as ContentTitle[]).splice(index, 1)
    }
  }

  // ============= Content Text Management =============
  const addContentText = (moduleId: string, content: string = ''): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties.contentTexts) {
      module.properties.contentTexts = []
    }

    const newText: ContentText = {
      id: generateUniqueId('text'),
      content,
    }

    ;(module.properties.contentTexts as ContentText[]).push(newText)
  }

  const updateContentText = (moduleId: string, textId: string, content: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const text = (module.properties.contentTexts as ContentText[]).find(
      (t: ContentText) => t.id === textId,
    )
    if (text) {
      text.content = content
    }
  }

  const removeContentText = (moduleId: string, textId: string): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties.contentTexts) return

    const index = (module.properties.contentTexts as ContentText[]).findIndex(
      (t: ContentText) => t.id === textId,
    )
    if (index !== -1) {
      ;(module.properties.contentTexts as ContentText[]).splice(index, 1)
    }
  }

  // ============= Additional Content Management =============
  /**
   * 서브 모듈 HTML 로드
   */
  const loadContentTemplate = async (type: 'title' | 'text'): Promise<string> => {
    try {
      const basePath = import.meta.env.BASE_URL || '/'
      const filename = type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html'
      const templatePath = normalizePath(`${basePath}modules/${filename}`)

      const response = await fetch(templatePath)
      if (!response.ok) {
        console.error('[loadContentTemplate] ❌ Failed:', templatePath, response.status)
        throw new Error(`Failed to load sub-module: ${response.status}`)
      }
      const html = await response.text()
      return html
    } catch (error) {
      console.error(`[loadContentTemplate] ❌ Error loading sub-module (${type}):`, error)
      return ''
    }
  }

  const addAdditionalContent = async (
    moduleId: string,
    type: 'title' | 'text',
    propertyKey: string = 'additionalContents',
  ): Promise<void> => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module) return

    if (!module.properties[propertyKey]) {
      module.properties[propertyKey] = []
    }

    const template = await loadContentTemplate(type)
    if (!template) return

    const existingContents = module.properties[propertyKey] as AdditionalContent[]
    const maxOrder =
      existingContents.length > 0 ? Math.max(...existingContents.map((c) => c.order)) : 0

    const newContent: AdditionalContent = {
      id: generateUniqueId('content'),
      type: type,
      htmlTemplate: type === 'title' ? 'ModuleContent_title.html' : 'ModuleContent_text.html',
      data: type === 'title' ? { title_text: '새 타이틀' } : { text_content: '새 텍스트 내용' },
      order: maxOrder + 1,
    }

    ;(module.properties[propertyKey] as AdditionalContent[]).push(newContent)
  }

  const updateAdditionalContent = (
    moduleId: string,
    contentId: string,
    data: Record<string, string>,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const content = (module.properties[propertyKey] as AdditionalContent[]).find(
      (c: AdditionalContent) => c.id === contentId,
    )
    if (content) {
      content.data = { ...content.data, ...data }
    }
  }

  const removeAdditionalContent = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const index = (module.properties[propertyKey] as AdditionalContent[]).findIndex(
      (c: AdditionalContent) => c.id === contentId,
    )
    if (index !== -1) {
      ;(module.properties[propertyKey] as AdditionalContent[]).splice(index, 1)
      const contents = module.properties[propertyKey] as AdditionalContent[]
      contents
        .sort((a, b) => a.order - b.order)
        .forEach((content, idx) => {
          content.order = idx + 1
        })
    }
  }

  const moveAdditionalContentUp = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index > 0) {
      ;[contents[index], contents[index - 1]] = [contents[index - 1], contents[index]]
      contents
        .sort((a, b) => a.order - b.order)
        .forEach((content, idx) => {
          content.order = idx + 1
        })
    }
  }

  const moveAdditionalContentDown = (
    moduleId: string,
    contentId: string,
    propertyKey: string = 'additionalContents',
  ): void => {
    const module = modules.value.find((m) => m.id === moduleId)
    if (!module || !module.properties[propertyKey]) return

    const contents = module.properties[propertyKey] as AdditionalContent[]
    const index = contents.findIndex((c: AdditionalContent) => c.id === contentId)
    if (index < contents.length - 1) {
      ;[contents[index], contents[index + 1]] = [contents[index + 1], contents[index]]
      contents
        .sort((a, b) => a.order - b.order)
        .forEach((content, idx) => {
          content.order = idx + 1
        })
    }
  }

  /**
   * HTML 템플릿에 데이터 적용
   */
  const applyDataToTemplate = (htmlTemplate: string, data: Record<string, string>): string => {
    let result = htmlTemplate
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\s*${key}\s*}}`, 'g')
      result = result.replace(placeholder, formatTextWithBreaks(value))
    })
    return result
  }

  /**
   * 추가 콘텐츠 HTML 삽입
   */
  const insertAdditionalContents = async (
    baseHtml: string,
    contents: AdditionalContent[],
    insertMarker: string,
  ): Promise<string> => {
    if (!contents || contents.length === 0) {
      return baseHtml.replace(insertMarker, '')
    }

    const sortedContents = contents.sort((a, b) => a.order - b.order)
    const insertHtmlPromises = sortedContents.map(async (content) => {
      const template = await loadContentTemplate(content.type)
      return applyDataToTemplate(template, content.data)
    })

    const insertHtmlArray = await Promise.all(insertHtmlPromises)
    const insertHtml = insertHtmlArray.join('\n')
    return baseHtml.replace(insertMarker, insertHtml)
  }

  // ============= HTML Generation =============
  /**
   * 모듈별 콘텐츠 교체
   */
  const replaceModuleContent = async (html: string, module: ModuleInstance): Promise<string> => {
    const { moduleId, properties } = module

    switch (moduleId) {
      case 'ModuleBasicHeader':
        return replaceModuleBasicHeaderContent(html, properties)

      case 'ModuleDescText':
        return replaceModuleDescTextContent(html, properties)

      case 'ModuleImg':
        return replaceModuleImgContent(html, properties)

      case 'ModuleOneButton':
        return replaceModuleOneButtonContent(html, properties)

      case 'ModuleTwoButton':
        return replaceModuleTwoButtonContent(html, properties)

      case 'SectionTitle':
        return replaceSectionTitleContent(html, properties)

      case 'Module04':
        return replaceModule04Content(html, properties, insertAdditionalContents)

      case 'Module02':
        return replaceModule02Content(html, properties, insertAdditionalContents)

      case 'Module05':
        return replaceModule052Content(html, properties)

      case 'Module01-1':
        return replaceModule011Content(html, properties)

      case 'Module01-2':
        return replaceModule012Content(html, properties)

      case 'Module05-1':
        return replaceModule051Content(html, properties)

      case 'Module05-3':
        return replaceModule053Content(html, properties)

      case 'Module06':
        return replaceModule06Content(html, properties)

      case 'Module07':
        return replaceModule07Content(html, properties)

      case 'Module07_reverse':
        return replaceModule07ReverseContent(html, properties)

      case 'ModuleFooter':
        return replaceModuleFooterContent(html, properties)

      case 'Module10':
        return replaceModule10Content(html, properties)

      case 'Module10-1':
        return replaceModule101Content(html, properties)

      case 'ModuleSubTitle':
        return replaceModuleSubTitleContent(html, properties)

      case 'ModuleTable':
        return replaceModuleTableContent(html, properties)

      default:
        return replaceDefaultTemplate(html, properties)
    }
  }

  /**
   * 전체 HTML 생성
   * @param wrapWithDocument - true면 완전한 HTML 문서로 감싸고, false면 콘텐츠만 반환
   */
  const generateHtml = async (wrapWithDocument: boolean = false): Promise<string> => {
    const editorStore = useEditorStore()
    const wrapSettings = editorStore.wrapSettings

    let fullHtml = ''
    const basePath = import.meta.env.BASE_URL || '/'

    for (const module of modules.value.sort((a, b) => a.order - b.order)) {
      try {
        const modulePath = normalizePath(`${basePath}modules/${module.moduleId}.html`)

        const response = await fetch(modulePath)
        if (!response.ok) {
          console.error('[generateHtml] ❌ Failed:', modulePath, response.status)
          throw new Error(`Failed to load module HTML: ${response.status}`)
        }
        let html = await response.text()

        html = await replaceModuleContent(html, module)

        if (module.styles && Object.keys(module.styles).length > 0) {
          html = applyStylesToHtml(html, module.styles as Record<string, unknown>)
        }

        fullHtml += html + '\n'
      } catch (error) {
        console.error(
          `[generateHtml] Failed to generate HTML for module ${module.moduleId}:`,
          error,
        )
      }
    }

    // wrap 스타일 생성
    const wrapStyle = `width:100%; max-width:680px; margin:0 auto; background-color:${wrapSettings.backgroundColor}; border:${wrapSettings.borderWidth} ${wrapSettings.borderStyle} ${wrapSettings.borderColor};`

    // wrapWithDocument가 false면 .wrap으로 감싼 콘텐츠만 반환
    if (!wrapWithDocument) {
      return `<div class="wrap" style="${wrapStyle}">
        ${fullHtml}
</div>`
    }

    // wrapWithDocument가 true면 완전한 HTML 문서로 감싸서 반환
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Newsletter</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; ">
    <div class="wrap" style="${wrapStyle}">
        ${fullHtml}
    </div>
</body>
</html>`
  }

  // ============= Helper Functions =============
  const getDefaultProperties = (moduleMetadata: ModuleMetadata): Record<string, unknown> => {
    const props: Record<string, unknown> = {}
    moduleMetadata.editableProps.forEach((prop) => {
      // 🐛 버그 수정 3: default 값이 있으면 우선 사용
      if (prop.default !== undefined) {
        props[prop.key] = prop.default
        return
      }

      switch (prop.type) {
        case 'boolean':
        case 'checkbox':
          props[prop.key] = false
          break
        case 'color':
          props[prop.key] = '#000000'
          break
        case 'number':
          props[prop.key] = 0
          break
        case 'table-rows':
          props[prop.key] = prop.defaultRows || []
          break
        case 'table-editor':
          // 커스텀 테이블의 기본 2x2 셀 생성
          props[prop.key] = [
            [
              { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1, width: '30%', align: 'center' },
              { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1, align: 'left' },
            ],
            [
              { id: generateUniqueId('cell'), type: 'th', content: '항목', colspan: 1, rowspan: 1, width: '30%', align: 'center' },
              { id: generateUniqueId('cell'), type: 'td', content: '내용', colspan: 1, rowspan: 1, align: 'left' },
            ],
          ]
          break
        case 'content-titles':
        case 'content-texts':
        case 'additional-contents':
          props[prop.key] = []
          break
        default:
          props[prop.key] = prop.placeholder || ''
      }
    })
    return props
  }

  return {
    modules,
    selectedModuleId,
    selectedModule,
    selectedModuleMetadata,
    availableModules,
    isDirty,
    loadAvailableModules,
    addModule,
    selectModule,
    updateModuleProperty,
    updateModuleStyle,
    removeModule,
    moveModuleUp,
    moveModuleDown,
    duplicateModule,
    clearAll,
    markAsSaved,
    generateHtml,
    addTableRow,
    updateTableRow,
    removeTableRow,
    // 커스텀 테이블 셀 관리
    initializeTableCells,
    addTableCellRow,
    addTableCellColumn,
    removeTableCellRow,
    removeTableCellColumn,
    updateTableCell,
    mergeCells,
    unmergeCell,
    toggleCellType,
    applyTablePreset,
    addContentTitle,
    updateContentTitle,
    removeContentTitle,
    addContentText,
    updateContentText,
    removeContentText,
    loadContentTemplate,
    addAdditionalContent,
    updateAdditionalContent,
    removeAdditionalContent,
    moveAdditionalContentUp,
    moveAdditionalContentDown,
    applyDataToTemplate,
    insertAdditionalContents,
  }
})
