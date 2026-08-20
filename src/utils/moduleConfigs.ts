/**
 * 모듈별 설정 정의
 * 각 모듈의 기본값, Quill 필드, 프로세서를 선언적으로 정의
 */

import type { ModuleConfig } from './moduleContentProcessor'
import * as processors from './processors'
import { defaultSnsIcons } from '../constants/snsIcons'
import { defaultContactItems } from '../constants/contactItems'

/**
 * ModuleNewsHeader 설정
 */
export const moduleNewsHeaderConfig: ModuleConfig = {
  defaults: {
    // 로고 노출 여부 (미설정 시 표시 = 기존 인스턴스 폴백)
    showLogo: true,
    logoImageUrl: 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/logo-gray.png',
    logoAlt: '로고',
    logoMaxWidth: '100%',
    logoBorderWidth: '5px',
    logoBorderColor: '#000000',
    headerTitle: 'NEWSLETTER VOL.1',
    titleColor: '#333333',
    webViewText: '웹으로 보기',
    webViewUrl: '#',
    webViewColor: '#333333',
    tableSummary: '뉴스레터 입니다.',
    headerTitlePaddingTop: '0px',
    headerTitlePaddingRight: '10px',
    headerTitlePaddingBottom: '10px',
    headerTitlePaddingLeft: '10px',
  },
  processors: [processors.removeNewsHeaderLogoProcessor],
}

/**
 * ModuleBasicHeader 설정
 */
export const moduleBasicHeaderConfig: ModuleConfig = {
  quillFields: ['headerText'],
  defaults: {
    logoImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/logo-gray.png',
    logoAlt: '로고',
    logoMaxWidth: '100%',
    tableSummary: '뉴스레터 입니다.',
    topBorderWidth: '3px',
    topBorderColor: '#000000',
    logoBorderWidth: '1px',
    logoBorderColor: '#dddddd',
    logoPaddingTop: '30px',
    logoPaddingRight: '0',
    logoPaddingBottom: '20px',
    logoPaddingLeft: '0',
    headerTextColor: '#111111',
    headerTitlePaddingTop: '15px',
    headerTitlePaddingRight: '0',
    headerTitlePaddingBottom: '15px',
    headerTitlePaddingLeft: '0',
  },
}

/**
 * ModuleImageHeader 설정 (이미지형 헤더)
 */
export const moduleImageHeaderConfig: ModuleConfig = {
  quillFields: ['titleText', 'bodyText'],
  defaults: {
    tableSummary: '전시 뉴스레터 입니다.',
    imageUrl: 'https://esang-newsletter.s3.ap-northeast-2.amazonaws.com/e-dm/newsletter/images/img-visual.png',
    imageAlt: '전시소개글',
    imageLinkUrl: '#',
    imagePaddingTop: '20px',
    imagePaddingRight: '20px',
    imagePaddingBottom: '20px',
    imagePaddingLeft: '20px',
    volText: 'NEWSLETTER VOL.1',
    dateText: '2023. 8. 3 (목) - 8. 6 (일) COEX',
    homeLinkText: '🏠 홈페이지 바로가기',
    homeLinkUrl: '#',
    volFontSize: '15px',
    volColor: '#333333',
    volLineHeight: '1.7',
    dateFontSize: '20px',
    dateColor: '#333333',
    dateLineHeight: '1.7',
    homeFontSize: '14px',
    homeColor: '#333333',
    homeLineHeight: '1.7',
    dividerWidth: '1px',
    dividerStyle: 'dotted',
    dividerColor: '#999999',
    dividerPaddingTop: '0px',
    dividerPaddingRight: '25px',
    dividerPaddingBottom: '0px',
    dividerPaddingLeft: '25px',
    titleFontSize: '20px',
    titleColor: '#111111',
    bodyFontSize: '14px',
    bodyColor: '#333333',
    showTitle: true,
    showBody: true,
    buttonText: '사전등록 →',
    buttonUrl: '#',
    buttonBgColor: '#111111',
    buttonTextColor: '#ffffff',
    buttonPaddingTop: '20px',
    buttonPaddingRight: '20px',
    buttonPaddingBottom: '20px',
    buttonPaddingLeft: '20px',
    buttonBorderStyle: 'none',
    buttonBorderWidth: '1px',
    buttonBorderColor: '#000000',
    buttonBorderRadius: '5px',
  },
  processors: [
    processors.moduleImageHeaderTopProcessor,
    processors.imageLinkProcessor,
    processors.removeButtonProcessor,
  ],
}

/**
 * ModuleDescText 설정
 */
export const moduleDescTextConfig: ModuleConfig = {
  quillFields: ['descriptionText'],
  defaults: {
    bgColor: 'transparent',
    textColor: '#333333',
    // 텍스트 정렬 (기존 인스턴스 폴백 = left → 겉모습 변화 없음. 문단별 인라인 정렬이 더 우선)
    textAlign: 'left',
    // 안쪽 여백(배경 박스) 폴백 — 기존 하드코딩 값과 동일
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    // 바깥 여백(td, 투명) — 기존 인스턴스 폴백 = 0 (겉모습 변화 없음)
    marginTop: '0px',
    marginRight: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    // 배경 박스 모서리 둥글기 (기존 인스턴스 폴백 = 0)
    borderRadius: '0px',
    // 테두리 (기본 off = 기존 인스턴스 폴백 = 테두리 없음)
    showBorder: false,
    borderPosition: 'bottom',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#999999',
  },
  processors: [processors.descTextBorderProcessor, processors.boxBorderRadiusProcessor],
}

/**
 * ModuleInlineText 설정 — 텍스트를 옆으로(인라인) 최대 4개까지. 라벨·시간 배지 용도.
 */
export const moduleInlineTextConfig: ModuleConfig = {
  quillFields: ['text1', 'text2', 'text3', 'text4'],
  defaults: {
    align: 'left',
    text1: '라벨',
    text1FontSize: '14px',
    text1TextColor: '#ffffff',
    text1BgColor: '#fe5f0d',
    text1PaddingTop: '4px',
    text1PaddingRight: '14px',
    text1PaddingBottom: '3px',
    text1PaddingLeft: '14px',
    showText2: false,
    text2FontSize: '14px',
    text2TextColor: '#111111',
    text2BgColor: 'transparent',
    text2PaddingTop: '4px',
    text2PaddingRight: '14px',
    text2PaddingBottom: '3px',
    text2PaddingLeft: '14px',
    showText3: false,
    text3FontSize: '14px',
    text3TextColor: '#111111',
    text3BgColor: 'transparent',
    text3PaddingTop: '4px',
    text3PaddingRight: '14px',
    text3PaddingBottom: '3px',
    text3PaddingLeft: '14px',
    showText4: false,
    text4FontSize: '14px',
    text4TextColor: '#111111',
    text4BgColor: 'transparent',
    text4PaddingTop: '4px',
    text4PaddingRight: '14px',
    text4PaddingBottom: '3px',
    text4PaddingLeft: '14px',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    showBorderRadius: true,
    borderRadius: '30px',
  },
  processors: [processors.removeInlineTextsProcessor, processors.boxBorderRadiusProcessor],
}

/**
 * ModuleImg 설정
 */
export const moduleImgConfig: ModuleConfig = {
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    imageAlt: '이미지',
    // 정렬·최대 너비 (기존 인스턴스 폴백 = 가운데 · 100% → 겉모습 변화 없음)
    imageAlign: 'center',
    imageMaxWidth: '100%',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    // 이미지 테두리 (기본 none = 기존 인스턴스 폴백 = 테두리 없음)
    imageBorderStyle: 'none',
    imageBorderWidth: '1px',
    imageBorderColor: '#000000',
  },
  processors: [processors.imageLinkProcessor, processors.boxBorderRadiusProcessor],
}

/**
 * ModuleOneButton 설정
 */
export const moduleOneButtonConfig: ModuleConfig = {
  defaults: {
    buttonText: '큰 버튼 →',
    buttonUrl: '#',
    buttonBgColor: '#111111',
    buttonTextColor: '#ffffff',
    // 버튼 <a> 안쪽 여백 4방향 (기존 인스턴스 폴백 = 상하 15px / 좌우 0 — 기존 겉모습과 동일)
    buttonPaddingTop: '15px',
    buttonPaddingBottom: '15px',
    buttonPaddingRight: '0px',
    buttonPaddingLeft: '0px',
  },
  processors: [processors.boxBorderRadiusProcessor],
}

/**
 * ModuleTwoButton 설정
 */
export const moduleTwoButtonConfig: ModuleConfig = {
  defaults: {
    button1Text: '버튼 1 →',
    button1Url: '#',
    button1BgColor: '#111111',
    button1TextColor: '#ffffff',
    button2Text: '버튼 2 →',
    button2Url: '#',
    button2BgColor: '#111111',
    button2TextColor: '#ffffff',
    // 각 버튼 <a> 안쪽 여백 4방향 (기존 인스턴스 폴백 = 상하 15px / 좌우 0 — 기존 겉모습과 동일)
    button1PaddingTop: '15px',
    button1PaddingBottom: '15px',
    button1PaddingRight: '0px',
    button1PaddingLeft: '0px',
    button2PaddingTop: '15px',
    button2PaddingBottom: '15px',
    button2PaddingRight: '0px',
    button2PaddingLeft: '0px',
    paddingTop: '10px',
    paddingRight: '15px',
    paddingBottom: '15px',
    paddingLeft: '15px',
  },
  processors: [processors.boxBorderRadiusProcessor],
}

/**
 * ModuleSmallButton 설정 (작은 버튼 — 옆으로 최대 4개, 처음엔 1개만)
 * 스타일은 모듈 04번의 작은 버튼을 참고(알약형 30px, 13px, 회색 배경).
 */
export const moduleSmallButtonConfig: ModuleConfig = {
  defaults: {
    align: 'left',
    btnWidth: 'auto',
    btnBorderRadius: '30px',
    btnFontSize: '13px',
    // 버튼 <a> 안쪽 여백 (기존 인스턴스 폴백 = 템플릿에 하드코딩돼 있던 5px 20px)
    btnPaddingTop: '5px',
    btnPaddingRight: '20px',
    btnPaddingBottom: '5px',
    btnPaddingLeft: '20px',
    paddingTop: '10px',
    paddingRight: '0px',
    paddingBottom: '10px',
    paddingLeft: '0px',
    // 버튼 2~4는 기본 비노출 → 처음엔 1개만 보인다
    showBtn2: false,
    showBtn3: false,
    showBtn4: false,
    btn1Text: '버튼 1 →',
    btn1Url: '#',
    btn1BgColor: '#e5e5e5',
    btn1TextColor: '#333333',
    btn2Text: '버튼 2 →',
    btn2Url: '#',
    btn2BgColor: '#e5e5e5',
    btn2TextColor: '#333333',
    btn3Text: '버튼 3 →',
    btn3Url: '#',
    btn3BgColor: '#e5e5e5',
    btn3TextColor: '#333333',
    btn4Text: '버튼 4 →',
    btn4Url: '#',
    btn4BgColor: '#e5e5e5',
    btn4TextColor: '#333333',
  },
  processors: [processors.removeSmallButtonsProcessor, processors.boxBorderRadiusProcessor],
}

/**
 * SectionTitle 설정
 */
export const sectionTitleConfig: ModuleConfig = {
  quillFields: ['mainTitle', 'subTitle'],
  defaults: {
    mainTitle: '섹션 타이틀',
    subTitle: '서브 타이틀 영역입니다',
    // 메인 타이틀 기본 굵기 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    // 서브 타이틀은 기본 normal, 굵게는 에디터 툴바(B)로 부분 적용
    mainTitleFontWeight: '700',
    sectionBgColor: 'transparent',
    topBorderWidth: '2px',
    topBorderColor: '#333333',
    sectionImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    sectionImageLinkUrl: '#',
    sectionImageAlt: '섹션 이미지',
    sectionImageMaxWidth: '100%',
    sectionImageAlign: 'center',
    sectionImagePaddingTop: '15px',
    sectionImagePaddingRight: '20px',
    sectionImagePaddingBottom: '0',
    sectionImagePaddingLeft: '20px',
  },
  processors: [
    processors.removeMainTitleProcessor,
    processors.removeEmptySubTitleProcessor,
    processors.removeSectionImageProcessor,
  ],
}

/**
 * Module04 설정
 */
export const module04Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
  defaults: {
    rightTitleLineHeight: '1.7',
    leftTitleLineHeight: '1.7',
    leftImageBorderRadius: '0px',
    leftImageLinkUrl: '#',
    rightImageBorderRadius: '0px',
    rightImageLinkUrl: '#',
    // 좌/우 이미지 테두리 (기본 none = 기존 인스턴스 폴백 = 테두리 없음)
    leftImageBorderStyle: 'none',
    leftImageBorderWidth: '1px',
    leftImageBorderColor: '#000000',
    rightImageBorderStyle: 'none',
    rightImageBorderWidth: '1px',
    rightImageBorderColor: '#000000',
    // 큰 버튼 여백 (기존 인스턴스 폴백 — 신규 인스턴스는 editableProps default 사용)
    leftBigBtnMarginTop: '0px',
    leftBigBtnMarginRight: '0px',
    leftBigBtnMarginBottom: '10px',
    leftBigBtnMarginLeft: '0px',
    rightBigBtnMarginTop: '0px',
    rightBigBtnMarginRight: '0px',
    rightBigBtnMarginBottom: '10px',
    rightBigBtnMarginLeft: '0px',
    // 작은 버튼 공통 너비·모서리 둥글기 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    leftSmallBtnWidth: 'auto',
    leftSmallBtnBorderRadius: '30px',
    leftSmallBtnAlign: 'center',
    rightSmallBtnWidth: 'auto',
    rightSmallBtnBorderRadius: '30px',
    rightSmallBtnAlign: 'center',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module04ImageProcessor,
    processors.module04TitleProcessor,
    processors.module04ButtonProcessor,
    processors.module04AdditionalContentProcessor,
    processors.twoColumnImageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * Module02 설정
 */
export const module02Config: ModuleConfig = {
  quillFields: ['description'],
  defaults: {
    titleLineHeight: '1.7',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    showTitle: true,
    buttonPaddingTop: '20px',
    buttonPaddingRight: '20px',
    buttonPaddingBottom: '20px',
    buttonPaddingLeft: '20px',
  },
  processors: [
    processors.module02ImageProcessor,
    processors.module02ButtonStyleProcessor,
    processors.module02AdditionalContentProcessor,
    processors.removeButtonProcessor,
    processors.imageLinkProcessor,
    processors.module12TitleProcessor,
  ],
}

/**
 * Module05-3 설정
 */
export const module053Config: ModuleConfig = {
  quillFields: ['topSectionText'],
  defaults: {
    topRightTitle1LineHeight: '1.7',
    topSectionTitleLineHeight: '1.7',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    // 작은 버튼 공통 너비·모서리 둥글기·텍스트 정렬 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    smallBtnWidth: 'auto',
    smallBtnBorderRadius: '30px',
    smallBtnAlign: 'center',
    // 통합 05: 상단 섹션 타이틀·텍스트, 오른쪽 타이틀 표시 (미설정 시 표시 = 기존 05-3 형태)
    showTopSectionTitle: true,
    showTopSectionText: true,
    showRightTitle: true,
    rightTitleEmphasis: false,
    rightTitleBgColor: '#e5e5e5',
    rightTitleTextColor: '#111111',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module053ImageProcessor,
    processors.module053UnifyProcessor,
    processors.module053ButtonProcessor,
    processors.imageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * Module01 설정
 */
export const module01Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    showTitle: true,
    contentTitleLineHeight: '1.7',
    contentTitle: '콘텐츠 타이틀',
    titleColor: '#eb2a25',
    contentText: '콘텐츠 텍스트',
    bgColor: '#f5f5f5',
    textAlign: 'left',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '10px',
    paddingLeft: '0px',
  },
  processors: [processors.module12TitleProcessor],
}

/**
 * Module01-1 설정
 */
export const module011Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
  defaults: {
    rightTitleLineHeight: '1.7',
    leftTitleLineHeight: '1.7',
    // 좌·우 공통 박스 색상 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    titleBgColor: '#e5e5e5',
    titleTextColor: '#111111',
    contentBgColor: '#f3f3f3',
    contentTextColor: '#333333',
  },
}

/**
 * Module01-2 설정
 */
export const module012Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    // 카테고리 배지 (기본 표시 = 기존 인스턴스 폴백)
    showCategory: true,
    categoryBgColor: '#666666',
    categoryTextColor: '#ffffff',
    categoryTextFontSize: '14px',
    categoryBorderRadius: '30px',
    contentTextFontSize: '14px',
    textColor: '#333333',
    // 박스 배경/안쪽 여백/바깥 여백/모서리 (기존 하드코딩 값과 동일한 폴백)
    bgColor: '#fcfcfc',
    paddingTop: '20px',
    paddingRight: '20px',
    paddingBottom: '20px',
    paddingLeft: '20px',
    marginTop: '0px',
    marginRight: '20px',
    marginBottom: '20px',
    marginLeft: '20px',
    borderRadius: '0px',
    // 박스 테두리 (기본 on = 기존 인스턴스의 1px solid #cccccc)
    showBorder: true,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#cccccc',
  },
  processors: [
    processors.module012CategoryProcessor,
    processors.boxBorderProcessor,
    processors.boxBorderRadiusProcessor,
  ],
}

/**
 * Module05-1 설정
 */
export const module051Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    boxTitleLineHeight: '1.7',
    ImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    ImageAlt: '이미지',
    boxBgColor: '#e5e5e5',
    boxColor: '#111111',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    // 버튼 공통 너비·모서리 둥글기·텍스트 정렬 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    smallBtnWidth: 'auto',
    smallBtnBorderRadius: '30px',
    smallBtnAlign: 'center',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module051ButtonProcessor,
    processors.imageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * Module05 설정 (4개 버튼 모듈)
 */
export const module05Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    imageAlt: '이미지',
    button1BgColor: '#111111',
    button1TextColor: '#ffffff',
    button2BgColor: '#2196F3',
    button2TextColor: '#ffffff',
    button3BgColor: '#4CAF50',
    button3TextColor: '#ffffff',
    button4BgColor: '#FF5722',
    button4TextColor: '#ffffff',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    // 버튼 공통 너비·모서리 둥글기·텍스트 정렬 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    smallBtnWidth: 'auto',
    smallBtnBorderRadius: '30px',
    smallBtnAlign: 'center',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module052ButtonProcessor,
    processors.imageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * Module06 설정
 */
export const module06Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
  defaults: {
    rightTitleLineHeight: '1.7',
    leftTitleLineHeight: '1.7',
    leftTitleBgColor: '#e5e5e5',
    leftTitleColor: '#333333',
    leftImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    leftImageAlt: '이미지',
    leftImageBorderRadius: '0px',
    leftImageLinkUrl: '#',
    rightTitleBgColor: '#e5e5e5',
    rightTitleColor: '#333333',
    rightImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    rightImageAlt: '이미지',
    rightImageBorderRadius: '0px',
    rightImageLinkUrl: '#',
    // 버튼 공통 너비·모서리 둥글기·텍스트 정렬 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    leftSmallBtnWidth: 'auto',
    leftSmallBtnBorderRadius: '30px',
    leftSmallBtnAlign: 'center',
    rightSmallBtnWidth: 'auto',
    rightSmallBtnBorderRadius: '30px',
    rightSmallBtnAlign: 'center',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module06MultiButtonProcessor,
    processors.twoColumnImageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * Module07 / Module07_reverse 설정
 */
export const module07Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    // 타이틀 정렬 (기존 인스턴스 폴백 = 왼쪽). 본문은 에디터 정렬 사용.
    titleAlign: 'left',
    // 타이틀 배경색/글자색 (기존 인스턴스 폴백 = 배경 없음 · 기존 글자색)
    titleBgColor: 'transparent',
    titleTextColor: '#111111',
    // 타이틀 폰트 웨이트/모서리 둥글기 (기존 폴백 = 볼드 · 각짐)
    titleFontWeight: '700',
    titleBorderRadius: '0px',
    // 텍스트(본문) 박스 — 폰트 웨이트/배경/글자색/모서리 둥글기 (기존 폴백 = 400 · 투명 · 기존 색 · 각짐)
    contentFontWeight: '400',
    contentBgColor: 'transparent',
    contentTextColor: '#333333',
    contentBorderRadius: '0px',
    titleLineHeight: '1.7',
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    imageAlt: '이미지',
    buttonBgColor: '#e5e5e5',
    buttonTextColor: '#333333',
    // 버튼 너비·모서리 둥글기·텍스트 정렬 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    buttonWidth: 'auto',
    buttonBorderRadius: '30px',
    buttonAlign: 'center',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
    textAreaPaddingTop: '25px',
    textAreaPaddingRight: '0px',
    textAreaPaddingBottom: '25px',
    textAreaPaddingLeft: '0px',
    // 좌/우 영역 비율(숫자 %) — 미설정 시 50:50
    leftWidthPercent: '50',
    rightWidthPercent: '50',
  },
  processors: [
    processors.module07ButtonProcessor,
    processors.imageLinkProcessor,
    processors.twoColumnRatioProcessor,
  ],
}

/**
 * ModuleFooter 설정
 */
export const moduleSnsIconsConfig: ModuleConfig = {
  defaults: {
    snsIconBgColor: '#333333',
    snsAlign: 'center',
    paddingTop: '15px',
    paddingRight: '5px',
    paddingBottom: '15px',
    paddingLeft: '5px',
    // 순서 있는 아이콘 배열(노출/링크/순서를 데이터로 관리) — 렌더 폴백
    snsIcons: defaultSnsIcons(),
  },
  processors: [processors.snsIconsProcessor],
}

/**
 * ModuleContactInfo 설정 (연락처 원소 모듈 — H·T·E·F)
 * 항목별 노출·순서·값은 순서 있는 배열(contactItems)로 관리하고, 렌더는 footerContactProcessor가 담당한다.
 */
export const moduleContactInfoConfig: ModuleConfig = {
  defaults: {
    contactFontSize: '13px',
    contactTextColor: '#333333',
    contactAlign: 'center',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '10px',
    paddingLeft: '0px',
    // 순서 있는 연락처 배열 — 렌더 폴백(기본값은 코리아빌드 정보)
    contactItems: defaultContactItems({
      websiteUrl: 'www.koreabuild.co.kr',
      phone: '02-6121-6362',
      email: 'hvackorea@esgroup.net',
      fax: '02-6121-6363',
    }),
  },
  processors: [processors.footerContactProcessor],
}

export const moduleFooterConfig: ModuleConfig = {
  quillFields: ['companyInfo'],
  defaults: {
    // 푸터 공통 배경색·텍스트 색상 (기존 인스턴스 폴백 = 기존 하드코딩 값)
    footerBgColor: '#e9e9e9',
    footerTextColor: '#333333',
    companyInfo:
      '<p style="margin:0; padding:0;"><strong>코리아빌드 사무국</strong></p><p style="margin:0; padding:0;">(주)메쎄이상</p><p style="margin:0; padding:0; font-size:13px;">서울시 마포구&nbsp;월드컵북로&nbsp;58길&nbsp;9 ES타워&nbsp;(03922)</p>',
    companyInfoFontSize: '16px',
    websiteUrl: 'www.koreabuild.co.kr',
    phone: '02-6121-6362',
    email: 'hvackorea@esgroup.net',
    fax: '02-6121-6363',
    unsubscribeUrl: '#',
    inquiryEmail: 'hvackorea@esgroup.net',
    // 안내문구 다국어(영문) 표시 — 미설정 시 국문 안내문구 노출
    showEnglishFooter: false,
    // SNS 아이콘 공통 배경색 (모든 원형 아이콘에 적용) — 기존 하드코딩 #333333을 속성화
    snsIconBgColor: '#333333',
    // SNS 링크 (미설정 시 #로 폴백, 미노출 아이콘은 프로세서가 블록 제거)
    homeUrl: '#',
    facebookUrl: '#',
    xUrl: '#',
    blogUrl: '#',
    youtubeUrl: '#',
    instagramUrl: '#',
    kakaoUrl: '#',
    linkedinUrl: '#',
    zuzuzuUrl: 'https://kcoupet.com/',
    enUrl: '#',
    jpUrl: '#',
    thUrl: '#',
  },
  processors: [processors.footerContactProcessor, processors.footerSnsProcessor],
}

/**
 * Module10 설정
 */
export const module10Config: ModuleConfig = {
  quillFields: ['title'],
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png',
    imageAlt: '이미지',
    labelBgColor: '#333333',
    labelTextColor: '#ffffff',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [processors.module10LabelProcessor, processors.module10ImageProcessor, processors.module10TimeProcessor, processors.imageLinkProcessor],
}

/**
 * Module10-1 설정
 */
export const module101Config: ModuleConfig = {
  defaults: {
    leftImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png',
    leftImageAlt: '이미지',
    leftLabelBgColor: '#333333',
    leftLabelTextColor: '#ffffff',
    leftImageBorderRadius: '0px',
    leftImageLinkUrl: '#',
    rightImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png',
    rightImageAlt: '이미지',
    rightLabelBgColor: '#333333',
    rightLabelTextColor: '#ffffff',
    rightImageBorderRadius: '0px',
    rightImageLinkUrl: '#',
  },
  processors: [processors.module101LabelProcessor, processors.twoColumnImageLinkProcessor],
}

/**
 * Module11 설정
 */
export const module11Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    // 링크 사용 토글 — 기본 on(기존 인스턴스의 링크 유지), URL 미입력 시 링크는 자동으로 걸리지 않는다
    showLink: true,
    linkUrl: '',
    textColor: '#111111',
    showLabel: true,
    labelText: '중랑구',
    labelColor: '#111111',
    labelTextFontSize: '14px',
    contentText: '2022년 국내전시회 참가기업 지원사업(~2/25)',
    contentTextFontSize: '14px',
    showButton: true,
    buttonText: 'GO →',
    buttonBgColor: '#999999',
    buttonTextColor: '#ffffff',
    // 박스 배경/안쪽 여백/바깥 여백/모서리/테두리 (기존 하드코딩 값과 동일한 폴백)
    bgColor: '#eaeaea',
    paddingTop: '10px',
    paddingRight: '10px',
    paddingBottom: '10px',
    paddingLeft: '10px',
    marginTop: '2px',
    marginRight: '20px',
    marginBottom: '2px',
    marginLeft: '20px',
    borderRadius: '0px',
    showBorder: false,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#cccccc',
  },
  processors: [
    processors.module11LabelProcessor,
    processors.module11LinkProcessor,
    processors.boxBorderProcessor,
    processors.boxBorderRadiusProcessor,
  ],
}

/**
 * Module12 설정
 */
export const module12Config: ModuleConfig = {
  quillFields: ['contentText'],
  lineHeightMap: { contentText: 'textLineHeight' },
  defaults: {
    showTitle: true,
    titleText: '콘텐츠 타이틀',
    titleFontSize: '16px',
    titleColor: '#111111',
    titleLineHeight: '1.7',
    contentText: '콘텐츠 텍스트를 입력하세요',
    textFontSize: '14px',
    textColor: '#333333',
    textLineHeight: '1.7',
    boxBgColor: '#f5f5f5',
    boxBorderWidth: '0px',
    boxBorderColor: '#dddddd',
    textAlign: 'center',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '10px',
    paddingLeft: '0px',
  },
  processors: [processors.module12TitleProcessor],
}

/**
 * ModuleTable 설정
 */
export const moduleTableConfig: ModuleConfig = {
  // ModuleTable은 replaceModuleTableContent에서 별도 처리
}

/**
 * ModuleSubTitle 설정
 */
export const moduleSubTitleConfig: ModuleConfig = {
  autoReplacePlaceholders: false, // 커스텀 프로세서 사용
  processors: [processors.subtitleDefaultProcessor],
}

/**
 * ModuleMultiImage 설정
 */
export const moduleMultiImageConfig: ModuleConfig = {
  defaults: {
    leftImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    leftImageAlt: '이미지',
    leftImageBorderRadius: '0px',
    leftImageLinkUrl: '#',
    rightImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    rightImageAlt: '이미지',
    rightImageBorderRadius: '0px',
    rightImageLinkUrl: '#',
    // 좌/우 이미지 테두리 (기본 none = 기존 인스턴스 폴백 = 테두리 없음)
    leftImageBorderStyle: 'none',
    leftImageBorderWidth: '1px',
    leftImageBorderColor: '#000000',
    rightImageBorderStyle: 'none',
    rightImageBorderWidth: '1px',
    rightImageBorderColor: '#000000',
  },
  processors: [processors.twoColumnImageLinkProcessor],
}

/**
 * ModuleDivider 설정 (구분선)
 */
export const moduleDividerConfig: ModuleConfig = {
  defaults: {
    borderColor: '#dddddd',
    borderWidth: '1px',
    borderStyle: 'solid',
    dividerWidth: '100%',
    paddingTop: '20px',
    paddingRight: '0px',
    paddingBottom: '20px',
    paddingLeft: '0px',
  },
}

/**
 * TopLanguageButton 설정 (상단 언어 선택 버튼)
 * 버튼별 텍스트·링크·활성화 여부 + '기본/액티브' 색상 세트를 처리하는 커스텀 프로세서 사용.
 */
export const topLanguageButtonConfig: ModuleConfig = {
  defaults: {
    button1Show: true,
    button1Text: 'EN',
    button1Link: '#',
    button1Active: true,
    button2Show: true,
    button2Text: 'JP',
    button2Link: '#',
    button2Active: false,
    button3Show: true,
    button3Text: 'TH',
    button3Link: '#',
    button3Active: false,
    defaultBgColor: '#ffffff',
    defaultTextColor: '#fe5f0d',
    defaultBorderColor: '#fe5f0d',
    activeBgColor: '#fe5f0d',
    activeTextColor: '#ffffff',
    activeBorderColor: '#fe5f0d',
    buttonFontSize: '16px',
    buttonWidth: '70px',
    paddingTop: '20px',
    paddingRight: '25px',
    paddingBottom: '20px',
    paddingLeft: '25px',
  },
  processors: [processors.topLanguageButtonProcessor],
}

/**
 * 모듈 ID를 설정으로 매핑하는 레지스트리
 */
export const MODULE_CONFIG_REGISTRY: Record<string, ModuleConfig> = {
  ModuleNewsHeader: moduleNewsHeaderConfig,
  ModuleBasicHeader: moduleBasicHeaderConfig,
  ModuleImageHeader: moduleImageHeaderConfig,
  ModuleDescText: moduleDescTextConfig,
  ModuleInlineText: moduleInlineTextConfig,
  ModuleImg: moduleImgConfig,
  ModuleOneButton: moduleOneButtonConfig,
  ModuleTwoButton: moduleTwoButtonConfig,
  ModuleSmallButton: moduleSmallButtonConfig,
  SectionTitle: sectionTitleConfig,
  ModuleTable: moduleTableConfig,
  Module01: module01Config,
  Module04: module04Config,
  Module02: module02Config,
  Module05: module05Config,
  'Module01-1': module011Config,
  'Module01-2': module012Config,
  'Module05-1': module051Config,
  'Module05-3': module053Config,
  Module06: module06Config,
  Module07: module07Config,
  Module07_reverse: module07Config, // 동일한 설정 사용
  ModuleFooter: moduleFooterConfig,
  ModuleSnsIcons: moduleSnsIconsConfig,
  ModuleContactInfo: moduleContactInfoConfig,
  Module10: module10Config,
  'Module10-1': module101Config,
  Module11: module11Config,
  Module12: module12Config,
  ModuleSubTitle: moduleSubTitleConfig,
  ModuleMultiImage: moduleMultiImageConfig,
  ModuleDivider: moduleDividerConfig,
  TopLanguageButton: topLanguageButtonConfig,
}
