<script setup lang="ts">
/**
 * 번역 결과 도크 — 캔버스 왼쪽에 붙은 '모듈 순서'의 왼쪽 버전.
 *
 * 좌측 AI 도구 패널에서 '번역하고 미리보기'를 누르면 여기에 문장별 결과가 뜬다.
 * 캔버스 바로 옆이라 원문 자리와 번역문을 번갈아 보며 고치기 좋고, 카드를 누르면
 * 모듈 순서에서 행을 누르듯 그 모듈이 선택되며 캔버스가 그리로 스크롤된다.
 *
 * 보이는 조건은 AppLayout이 정한다 — AI 도구 메뉴이고 결과가 있을 때만. 오른쪽 가장자리 탭으로
 * 접을 수 있고, 접힌 상태는 AI 도구 메뉴에 다시 들어올 때 풀린다(translationStore.dockCollapsed).
 */
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useModuleStore } from '@/stores/moduleStore'
import { useTranslationStore } from '@/stores/translationStore'

const translation = useTranslationStore()
const moduleStore = useModuleStore()
const toast = useToast()

/** 원문 펼침 상태 — 긴 본문은 두 줄로 접어 두고 누르면 전부 보여준다 */
const expanded = ref(new Set<string>())
const toggleSource = (id: string): void => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

/** 카드 → 그 모듈로. 선택되면 CanvasArea가 해당 모듈로 스크롤한다(모듈 순서 행 클릭과 같은 경로) */
const goToModule = (moduleId: string): void => {
  moduleStore.selectModule(moduleId)
}

const apply = async (): Promise<void> => {
  const count = await translation.apply()
  if (!count) return
  toast.add({
    severity: 'success',
    summary: '번역을 적용했어요',
    detail: `${count}개 문장을 적용했습니다. Ctrl+Z로 되돌릴 수 있어요.`,
    life: 4000,
  })
}
</script>

<template>
  <aside class="tr-dock" :class="{ 'is-collapsed': translation.dockCollapsed }" aria-label="번역 결과">
    <!-- 오른쪽 가장자리 탭 — 접히면 캔버스 왼쪽 끝에 붙어 있다 (모듈 순서 탭을 좌우 반전) -->
    <button
      type="button"
      class="tr-tab"
      :aria-label="translation.dockCollapsed ? '번역 결과 열기' : '번역 결과 닫기'"
      @click="translation.toggleDock()"
    >
      <span
        class="material-symbols-outlined tr-tab-icon"
        :class="{ 'is-open': !translation.dockCollapsed }"
      >
        arrow_back_ios
      </span>
      <span v-if="translation.dockCollapsed" class="tr-tab-count">{{ translation.targetLanguageCode }}</span>
    </button>

    <div class="tr-panel">
      <div class="tr-inner">
        <header class="tr-head">
          <span class="tr-title">
            번역 결과
            <span class="tr-count-badge">{{ translation.preview.length }}</span>
          </span>
          <span class="tr-sub">한국어 → {{ translation.targetLanguageLabel }}</span>
        </header>

        <div class="tr-list">
          <article
            v-for="group in translation.previewGroups"
            :key="group.id"
            class="tr-card"
            :class="{ 'is-active': moduleStore.selectedModuleId === group.id }"
          >
            <!-- 카드 머리를 누르면 그 모듈로 이동 -->
            <button
              type="button"
              class="tr-card-head"
              :title="`캔버스에서 ${group.moduleName} 보기`"
              @click="goToModule(group.id)"
            >
              <span class="tr-module-chip">
                <span class="material-symbols-outlined">widgets</span>
                {{ group.moduleName }}
              </span>
              <span class="tr-card-count">{{ group.items.length }}개</span>
              <span class="material-symbols-outlined tr-card-go" aria-hidden="true">ads_click</span>
            </button>

            <div v-for="change in group.items" :key="change.id" class="tr-item">
              <span class="tr-item-label">{{ change.propertyLabel }}</span>
              <button
                type="button"
                class="tr-source"
                :class="{ 'is-expanded': expanded.has(change.id) }"
                :title="expanded.has(change.id) ? '원문 접기' : '원문 전체 보기'"
                @click="toggleSource(change.id)"
              >
                {{ change.source }}
              </button>
              <textarea
                v-model="change.translated"
                class="tr-result"
                rows="2"
                :aria-label="`${group.moduleName} ${change.propertyLabel} 번역문`"
              ></textarea>
            </div>
          </article>
        </div>

        <footer class="tr-foot">
          <p class="hint-text tr-foot-hint">번역문을 고친 뒤 적용하면 그대로 캔버스에 들어가요.</p>
          <div class="tr-actions">
            <button type="button" class="tr-btn" @click="translation.clear()">
              <span class="material-symbols-outlined">close</span>
              취소
            </button>
            <button type="button" class="tr-btn tr-btn--primary" @click="apply">
              <span class="material-symbols-outlined">check</span>
              캔버스에 적용
            </button>
          </div>
        </footer>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* ===== 도크(패널 + 여닫이 탭) — ModuleOutlinePanel의 .order-dock을 좌우 반전 ===== */
.tr-dock {
  position: relative;
  flex-shrink: 0;
  height: 100%;
}
.tr-panel {
  width: 320px;
  height: 100%;
  background: var(--white);
  overflow: hidden;
  transition: width 0.18s ease;
}
.tr-dock.is-collapsed .tr-panel {
  width: 0;
  border-right-width: 0;
}
/* 폭이 0으로 줄어드는 동안 내부가 리플로우되지 않도록 고정폭 */
.tr-inner {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 오른쪽 가장자리 탭 — 접히면 패널 폭이 0이라 캔버스 왼쪽 끝에 붙는다 */
.tr-tab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 6px;
  padding: 10px 5px;
  height: 58px;
  border: 0;
  border-radius: 0 15px 15px 0;
  background: var(--white);
  color: var(--gray-700);
  cursor: pointer;
  z-index: 5;
}
.tr-dock .tr-tab {
  right: -34px;
  width: 34px;
}
.tr-dock.is-collapsed .tr-tab {
  right: -54px;
  width: 54px;
}
.tr-tab:hover {
  box-shadow: 4px 0 6px rgba(0, 0, 0, 0.06);
}
.tr-tab-icon {
  width: 12px;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.18s ease;
  color: var(--gray-700);
}
/* 열려 있으면 '<'(닫기 방향), 접히면 '>'(열기 방향) */
.tr-tab-icon.is-open {
  transform: rotate(0deg);
}
.tr-tab-icon:not(.is-open) {
  transform: rotate(180deg);
}
/* 접힌 탭에 대상 언어(en·jp·ch) — 어떤 언어 결과가 대기 중인지 잊지 않게 */
.tr-tab-count {
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--blue-50);
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
  color: var(--blue-400);
  text-align: center;
}

/* ===== 헤더 ===== */
.tr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  padding: 24px 20px 14px;
}
.tr-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 500;
  color: var(--gray-800);
  letter-spacing: -0.2px;
}
.tr-count-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  background: var(--blue-50);
  font-size: 12px;
  font-weight: 500;
  color: var(--blue-400);
}
.tr-sub {
  font-size: 13px;
  color: var(--gray-500);
}

/* ===== 모듈별 카드 목록 — 패널 안에서 스크롤 ===== */
.tr-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 20px 12px;
  overflow-y: auto;
}
.tr-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--gray-100);
  transition: border-color 0.12s ease, background-color 0.12s ease;
}
/* 캔버스에서 선택된 모듈의 카드 — 캔버스 선택 테두리와 같은 파랑 */
.tr-card.is-active {
  border-color: var(--blue-400);
  background: var(--blue-50);
}
.tr-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}
/* 모듈 이름 칩 — 표 편집의 셀 칩(.tbl-cellchip)과 같은 모양 */
.tr-module-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  padding: 0 10px 0 8px;
  border-radius: 6px;
  background: var(--blue-50);
  font-size: 13px;
  font-weight: 500;
  color: var(--blue-400);
  letter-spacing: -0.13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.tr-card.is-active .tr-module-chip,
.tr-card-head:hover .tr-module-chip {
  background: var(--blue-400);
  color: var(--white);
}
.tr-module-chip .material-symbols-outlined {
  font-size: 18px;
  flex-shrink: 0;
}
.tr-card-count {
  flex: 1;
  font-size: 12px;
  color: var(--gray-500);
}
/* '이동' 힌트 아이콘 — 머리에 마우스를 올렸을 때만 */
.tr-card-go {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--gray-400);
  opacity: 0;
  transition: opacity 0.12s ease;
}
.tr-card-head:hover .tr-card-go {
  opacity: 1;
}

/* ===== 문장 하나 — 라벨 / 원문 / 번역문. 카드 안에서는 흰 채움으로 뒤집어 구분한다 ===== */
.tr-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tr-item + .tr-item {
  padding-top: 12px;
  border-top: 1px solid var(--gray-200);
}
.tr-item-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-500);
  letter-spacing: -0.12px;
}
/* 원문 — 인용처럼 왼쪽 선을 둬서 아래 번역문(입력창)과 한눈에 구분되게 */
.tr-source {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin: 0;
  padding: 0 0 0 10px;
  border: 0;
  border-left: 2px solid var(--gray-300);
  background: none;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--gray-600);
  text-align: left;
  word-break: keep-all;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.tr-source.is-expanded {
  -webkit-line-clamp: unset;
  line-clamp: unset;
}
.tr-source:hover {
  color: var(--gray-750);
}
.tr-result {
  width: 100%;
  min-height: 60px;
  padding: 10px 12px;
  resize: vertical;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--white);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--gray-800);
  box-sizing: border-box;
  transition: border-color 0.12s ease;
}
.tr-result:focus {
  outline: none;
  border-color: var(--blue-400);
}

/* ===== 아래 고정 — 안내 + 취소/적용 ===== */
.tr-foot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--gray-100);
  background: var(--white);
}
.tr-foot-hint {
  margin-top: 0;
}
.tr-actions {
  display: flex;
  gap: 8px;
}
/* AI 도구 패널의 .ht-btn과 같은 모양 */
.tr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  white-space: nowrap;
  cursor: pointer;
}
.tr-btn:hover {
  border-color: var(--gray-300);
  background: var(--gray-50);
}
.tr-btn .material-symbols-outlined {
  font-size: 18px;
}
.tr-btn--primary {
  border-color: var(--blue-400);
  background: var(--blue-400);
  color: var(--white);
}
.tr-btn--primary:hover {
  border-color: var(--blue-500);
  background: var(--blue-500);
}
</style>
