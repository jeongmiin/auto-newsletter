/**
 * 가짜 진행률 — 끝나는 시점을 모르는 API 호출(번역·검사) 동안 "멈춘 게 아니다"를 보여 준다.
 *
 * 실제 진행 상황은 알 수 없으므로 시간으로 흉내 낸다(Figma 1974-11761):
 *   0~3초  → 0→40%   (빠르게 올라 반응이 있음을 보여 준다)
 *   3~10초 → 40→80%  (보통 걸리는 시간 동안 천천히)
 *   그 뒤   → 80% 멈춤 (응답이 올 때까지 — 100%에 닿았는데 안 끝나는 것보다 낫다)
 *   응답    → 100%    (잠깐 보여 주고 결과 화면으로)
 *
 * 실패하면 100%를 보여 주지 않고 바로 내린다 — 실패에 '완료' 신호를 주면 안 된다.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const FAST_UNTIL_MS = 3_000
const FAST_TO = 40
const SLOW_UNTIL_MS = 10_000
const SLOW_TO = 80
/** 100%를 보여 주는 시간 — 눈에 들어올 만큼만 */
const DONE_HOLD_MS = 500
const TICK_MS = 100

/** 흐른 시간(ms) → 보여 줄 퍼센트(정수). 순수 함수라 테스트한다 */
export function fakeProgressAt(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  if (elapsedMs <= FAST_UNTIL_MS) return Math.round((FAST_TO * elapsedMs) / FAST_UNTIL_MS)
  if (elapsedMs <= SLOW_UNTIL_MS) {
    return Math.round(FAST_TO + ((SLOW_TO - FAST_TO) * (elapsedMs - FAST_UNTIL_MS)) / (SLOW_UNTIL_MS - FAST_UNTIL_MS))
  }
  return SLOW_TO
}

/**
 * @param active     호출이 진행 중인지 (스토어의 translating/checking)
 * @param succeeded  active 가 꺼질 때 성공이었는지 — true 면 100%를 잠깐 보여 주고, false 면 바로 내린다
 */
export function useFakeProgress(active: () => boolean, succeeded: () => boolean) {
  const percent = ref(0)
  /** 응답이 와서 100%를 보여 주는 중 — 이 동안은 로딩 화면을 유지한다 */
  const finishing = ref(false)
  let startedAt = 0
  let ticker: ReturnType<typeof setInterval> | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null

  const stopTicker = (): void => {
    if (ticker) clearInterval(ticker)
    ticker = null
  }
  const start = (): void => {
    if (holdTimer) clearTimeout(holdTimer)
    holdTimer = null
    finishing.value = false
    startedAt = Date.now()
    percent.value = 0
    stopTicker()
    ticker = setInterval(() => {
      percent.value = fakeProgressAt(Date.now() - startedAt)
    }, TICK_MS)
  }
  const end = (ok: boolean): void => {
    stopTicker()
    if (!ok) {
      percent.value = 0
      return
    }
    percent.value = 100
    finishing.value = true
    holdTimer = setTimeout(() => {
      finishing.value = false
      percent.value = 0
      holdTimer = null
    }, DONE_HOLD_MS)
  }

  watch(active, (now, before) => {
    if (now && !before) start()
    else if (!now && before) end(succeeded())
  })

  onBeforeUnmount(() => {
    stopTicker()
    if (holdTimer) clearTimeout(holdTimer)
  })

  /** 로딩 화면을 보여 줄지 — 진행 중이거나 100%를 보여 주는 중 */
  const visible = computed(() => active() || finishing.value)

  return { percent, visible }
}
