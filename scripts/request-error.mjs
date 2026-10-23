/**
 * 번역·맞춤법 검사 프록시가 같이 쓰는 작은 공통부 — 오류 타입과 허용 출처 파서.
 * Node 프록시(translate-proxy.mjs)와 Cloudflare Worker(translate-worker.mjs) 둘 다에서 돌아가야 하므로
 * node: 모듈은 들이지 않는다.
 */

/** 클라이언트 잘못(형식·언어·빈 요청)은 400, 바깥 API 쪽 문제는 502로 구분한다 */
export class TranslateRequestError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'TranslateRequestError'
    this.status = status
  }
}

/** 쉼표로 구분된 출처 목록을 Set으로 */
export const parseAllowedOrigins = (value, fallback = 'http://localhost:5173') =>
  new Set(
    (value || fallback)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
