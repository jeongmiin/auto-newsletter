/**
 * 조립형(v2) 그룹 모듈을 캔버스에 넣을 때 주는 기본 좌·우 **안쪽** 여백(그룹 스타일 padding).
 *
 * 조립 함수(moduleStore.composedBuilderMap)는 멤버만 만들고 그룹 여백은 주지 않는다 — 넣는 쪽이
 * `moduleStore.setGroupSidePadding(groupId, 값)` 으로 붙인다. 배경색을 줬을 때 이 여백까지 색이
 * 채워지도록 바깥 여백(margin)이 아니라 안쪽 여백이다.
 *
 * 모듈 패널·카테고리 패널·AI 도구(모듈 조합 추천)가 **같은 표**를 써야 어디서 넣든 모양이 같다.
 * 여기 없는 키(헤더 둘·푸터·섹션 타이틀·모듈 01번)는 여백을 주지 않는다 — 가장자리까지 닿는 디자인이다.
 */
export const COMPOSED_GROUP_SIDE_PADDING: Readonly<Record<string, string>> = {
  ModuleImageHeader: '20px',
  Module02: '20px',
  ModuleMultiImage: '15px',
  ModuleTwoButton: '15px',
  'Module01-1': '15px',
  Module04: '15px',
  Module05: '15px',
  'Module05-3': '15px',
  Module06: '15px',
  Module07: '15px',
  Module07_reverse: '15px',
  Module10: '15px',
  'Module10-1': '15px',
}
