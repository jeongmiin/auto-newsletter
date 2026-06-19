<template>
  <div v-if="group" class="space-y-4">
    <!-- 그룹 정보 -->
    <div class="p-4 bg-purple-50 flex items-center gap-3 border-b border-gray-200">
      <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
        <i class="pi pi-objects-column text-lg"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-gray-800">그룹 스타일</div>
        <div class="text-sm text-gray-600">{{ memberCount }}개 모듈 묶음 · 배경/테두리/여백</div>
      </div>
      <Button
        label="그룹 해제"
        icon="pi pi-link"
        severity="danger"
        outlined
        size="small"
        @click="ungroup"
      />
    </div>

    <div class="p-4 space-y-4">
      <!-- 배경색 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-600">배경색</label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox :modelValue="hasBackground" :binary="true" @update:modelValue="toggleBackground" />
            <span class="text-sm text-gray-600">배경색 사용</span>
          </label>
        </div>
        <template v-if="hasBackground">
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              :modelValue="isUsingPoint('backgroundColor')"
              :binary="true"
              @update:modelValue="togglePoint('backgroundColor', $event)"
            />
            <span class="text-sm text-gray-600">포인트 색상으로 사용</span>
            <span class="w-3 h-3 rounded-sm border border-gray-300" :style="{ backgroundColor: pointColorValue }"></span>
          </label>
          <div class="flex items-center gap-2">
            <ColorAlphaPicker
              :modelValue="isUsingPoint('backgroundColor') ? pointColorValue : bgValue"
              :disabled="isUsingPoint('backgroundColor')"
              @update:modelValue="setStyle('backgroundColor', $event)"
            />
            <HexColorInput
              :modelValue="isUsingPoint('backgroundColor') ? pointColorValue : bgValue"
              :disabled="isUsingPoint('backgroundColor')"
              @update:modelValue="setStyle('backgroundColor', $event ?? '')"
              placeholder="#ffffff"
              class="flex-1 font-mono text-xs"
              spellcheck="false"
            />
          </div>
        </template>
        <p v-else class="text-xs text-gray-400">배경 없음(투명) — 켜면 묶음 전체에 배경색이 적용됩니다</p>
      </div>

      <!-- 테두리 -->
      <div class="space-y-2 pt-3 border-t border-gray-100">
        <label class="text-sm font-medium text-gray-600">테두리</label>
        <div class="flex flex-wrap items-center gap-2">
          <InputText
            :modelValue="group.styles.borderWidth ?? ''"
            @update:modelValue="setStyle('borderWidth', $event ?? '')"
            placeholder="0px"
            class="w-16 font-mono text-xs"
            v-tooltip.bottom="'두께 (예: 1px)'"
          />
          <Select
            :modelValue="group.styles.borderStyle ?? 'solid'"
            @update:modelValue="setStyle('borderStyle', $event ?? 'solid')"
            :options="borderStyleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-28 text-sm"
            v-tooltip.bottom="'스타일'"
          />
          <div class="flex items-center gap-1 flex-1 min-w-[120px]">
            <ColorAlphaPicker
              :modelValue="isUsingPoint('borderColor') ? pointColorValue : (group.styles.borderColor || '#dddddd')"
              :disabled="isUsingPoint('borderColor')"
              @update:modelValue="setStyle('borderColor', $event)"
            />
            <HexColorInput
              :modelValue="isUsingPoint('borderColor') ? pointColorValue : (group.styles.borderColor || '#dddddd')"
              :disabled="isUsingPoint('borderColor')"
              @update:modelValue="setStyle('borderColor', $event ?? '')"
              placeholder="#dddddd"
              class="flex-1 font-mono text-xs"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- 테두리 색상 포인트 사용 -->
        <label class="flex items-center gap-1.5 cursor-pointer select-none">
          <Checkbox
            :modelValue="isUsingPoint('borderColor')"
            :binary="true"
            @update:modelValue="togglePoint('borderColor', $event)"
          />
          <span class="text-sm text-gray-600">테두리 색상에 포인트 색상 사용</span>
          <span class="w-3 h-3 rounded-sm border border-gray-300" :style="{ backgroundColor: pointColorValue }"></span>
        </label>

        <!-- 테두리 적용 위치 (다중 선택) -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox :modelValue="allSidesSelected" :binary="true" @update:modelValue="toggleAllSides" />
            <span class="text-sm text-gray-700 font-medium">전체</span>
          </label>
          <span class="w-px h-4 bg-gray-200"></span>
          <label
            v-for="opt in sideOptions"
            :key="opt.key"
            class="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <Checkbox
              :modelValue="isSideOn(opt.key)"
              :binary="true"
              @update:modelValue="toggleSide(opt.key)"
            />
            <span class="text-sm text-gray-700">{{ opt.label }}</span>
          </label>
        </div>
        <p class="text-xs text-gray-400">테두리를 적용할 변을 고르세요. '전체'는 위·아래·좌·우 모두 적용합니다.</p>
      </div>

      <!-- 안쪽 여백 (padding) -->
      <div class="space-y-1 pt-3 border-t border-gray-100">
        <label class="text-sm font-medium text-gray-600">안쪽 여백 (padding)</label>
        <InputText
          :modelValue="group.styles.padding ?? ''"
          @update:modelValue="setStyle('padding', $event ?? '')"
          placeholder="예: 16px 또는 16px 20px"
          class="w-full font-mono text-xs"
        />
        <p class="text-xs text-gray-400">그룹 테두리와 내부 모듈 사이 간격입니다</p>
      </div>

      <!-- 바깥 여백 (margin) -->
      <div class="space-y-1 pt-3 border-t border-gray-100">
        <label class="text-sm font-medium text-gray-600">바깥 여백 (margin)</label>
        <InputText
          :modelValue="group.styles.margin ?? ''"
          @update:modelValue="setStyle('margin', $event ?? '')"
          placeholder="예: 12px 0"
          class="w-full font-mono text-xs"
        />
        <p class="text-xs text-gray-400">그룹과 위/아래 다른 모듈 사이 간격입니다</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import type { ModuleGroupStyles, BorderSide } from '@/types'
import { ALL_BORDER_SIDES, groupBorderSides } from '@/utils/groupStyle'
import { isValidHexColor } from '@/utils/colorHelper'
import ColorAlphaPicker from '@/components/ColorAlphaPicker.vue'
import HexColorInput from '@/components/HexColorInput.vue'

const moduleStore = useModuleStore()
const editorStore = useEditorStore()

const group = computed(() => moduleStore.selectedGroup)

// ===== 포인트 색상 사용 =====
const pointColorValue = computed(() => {
  const v = editorStore.wrapSettings.pointColor
  return isValidHexColor(v) ? v : '#2563eb'
})
type PointColorKey = 'backgroundColor' | 'borderColor'
const isUsingPoint = (key: PointColorKey): boolean =>
  !!group.value?.styles[`${key}UsePoint` as keyof ModuleGroupStyles]
const togglePoint = (key: PointColorKey, on: boolean): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, `${key}UsePoint` as keyof ModuleGroupStyles, on)
}

const memberCount = computed(() =>
  group.value ? moduleStore.modules.filter((m) => m.groupId === group.value!.id).length : 0,
)

const borderStyleOptions = [
  { label: '실선', value: 'solid' },
  { label: '점선', value: 'dashed' },
  { label: '점점선', value: 'dotted' },
  { label: '이중선', value: 'double' },
  { label: '없음', value: 'none' },
]

const hasBackground = computed(
  () => !!(group.value?.styles.backgroundColor && group.value.styles.backgroundColor.trim()),
)
const bgValue = computed(() => group.value?.styles.backgroundColor || '#ffffff')

const setStyle = (key: keyof ModuleGroupStyles, value: string): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, key, value)
}

// ===== 테두리 적용 변 (다중 선택) =====
const sideOptions: { key: BorderSide; label: string }[] = [
  { key: 'top', label: '위' },
  { key: 'bottom', label: '아래' },
  { key: 'left', label: '좌' },
  { key: 'right', label: '우' },
]

const currentSides = computed<BorderSide[]>(() =>
  group.value ? groupBorderSides(group.value.styles) : [],
)
const allSidesSelected = computed(() => currentSides.value.length === 4)
const isSideOn = (side: BorderSide): boolean => currentSides.value.includes(side)

const setSides = (sides: BorderSide[]): void => {
  if (!group.value) return
  moduleStore.updateGroupStyle(group.value.id, 'borderSides', sides)
}

const toggleSide = (side: BorderSide): void => {
  const set = new Set(currentSides.value)
  if (set.has(side)) set.delete(side)
  else set.add(side)
  setSides(ALL_BORDER_SIDES.filter((s) => set.has(s)))
}

const toggleAllSides = (): void => {
  setSides(allSidesSelected.value ? [] : [...ALL_BORDER_SIDES])
}

const toggleBackground = (on: boolean): void => {
  if (!group.value) return
  setStyle('backgroundColor', on ? '#ffffff' : '')
}

const ungroup = (): void => {
  if (group.value) moduleStore.ungroup(group.value.id)
}
</script>
