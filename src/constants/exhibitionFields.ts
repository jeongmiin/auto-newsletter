/**
 * 전시 분야와 뉴스레터 목적 — AI 도구 '모듈 조합 추천'의 입력 선택지.
 *
 * 분야는 회사가 전시회를 나누는 12가지 그대로다. 담당자가 고르는 수고를 덜려고 **팀에서 미리 채운다**
 * (`FIELDS_BY_TEAM`): 팀이 맡은 전시회(`public/templates/index.json`)를 보고 정한 것이라, 팀이
 * 새 분야 전시회를 맡으면 여기에 더한다. 분야는 추천 문구의 어휘를 맞추는 힌트일 뿐이라
 * 틀려도 구성은 나온다 — 화면에서 바꿀 수 있다.
 *
 * ⚠ 서버(scripts/recommend-core.mjs)의 FIELDS·PURPOSES 와 같은 글자여야 한다. 서버는 값을 검사하지
 * 않고 모델에 그대로 넘기므로 어긋나도 동작은 하지만, 통계(umami)에서 같은 값으로 묶이게 맞춰 둔다.
 */
export const EXHIBITION_FIELDS = [
  '건설 · 건축 · 인테리어',
  '에너지 · 환경',
  '관광 · 레저 · 취미',
  '농수산 · 식음료',
  '기계 · 설비 · 제조',
  '반려동물',
  '육아 · 교육',
  '치안 · 방산',
  '의료 · 건강',
  '법률',
  '미용 · 화장품',
  '해외',
] as const
export type ExhibitionField = (typeof EXHIBITION_FIELDS)[number]

/** 팀 id(index.json departments) → 그 팀이 주로 맡는 분야. 첫 번째가 기본값이다 */
export const FIELDS_BY_TEAM: Record<string, ExhibitionField[]> = {
  // 건축기획팀: 넥스트콘 · 호반 동반성장 건설 엑스포
  'arch-plan': ['건설 · 건축 · 인테리어'],
  // 건축전략팀: 공간디자인페어 · 리빙앤라이프스타일 · 코리아빌드
  'arch-str': ['건설 · 건축 · 인테리어'],
  // 신성장기획팀: 대드론
  'growth-plan': ['치안 · 방산'],
  // 신성장전략팀: 법률 산업 박람회 · 뷰티썸 · KHF
  'growth-str': ['법률', '미용 · 화장품', '의료 · 건강'],
  // MICE사업팀: 스마트건설·안전·AI 엑스포 · SLW
  mice: ['건설 · 건축 · 인테리어', '에너지 · 환경'],
  // 융합산업1팀: 건축 소방 안전 · 국제치안산업대전 · 데이터센터코리아 · 아파트 건물관리 · 전기차 충전인프라 · ISSA
  conv1: ['치안 · 방산', '에너지 · 환경', '건설 · 건축 · 인테리어'],
  // 라이프콘텐츠팀: 핸드아티코리아
  life: ['관광 · 레저 · 취미'],
  // 펫산업팀: 메가주 · 케이펫
  'pet-ind': ['반려동물'],
  // 레저산업팀: 고카프 · 케이팜
  'leisure-ind': ['관광 · 레저 · 취미', '농수산 · 식음료'],
  // 전시컨벤션팀: 뉴에너지 페어 오송
  'osco-conv': ['에너지 · 환경'],
}

/** 팀의 기본 분야. 모르는 팀(빈 템플릿에서 아직 안 골랐을 때 등)은 null — 화면에서 고르게 한다 */
export const defaultFieldForTeam = (teamId: string | null | undefined): ExhibitionField | null =>
  (teamId && FIELDS_BY_TEAM[teamId]?.[0]) || null

/**
 * 분야 선택지를 **팀 분야 먼저** 보여 주는 순서 — 담당자가 바꿀 때 자기 분야가 맨 앞에 있게.
 * 팀을 모르면 원래 순서 그대로다.
 */
export const fieldsOrderedForTeam = (teamId: string | null | undefined): ExhibitionField[] => {
  const mine = (teamId && FIELDS_BY_TEAM[teamId]) || []
  return [...mine, ...EXHIBITION_FIELDS.filter((field) => !mine.includes(field))]
}

/** 뉴스레터 목적 — 모듈 구성은 분야보다 이것에 따라 갈린다 */
export const NEWSLETTER_PURPOSES = ['사전등록 안내', '개막 D-day', '참가기업 모집', '부대행사 안내', '결과 보고'] as const
export type NewsletterPurpose = (typeof NEWSLETTER_PURPOSES)[number]
