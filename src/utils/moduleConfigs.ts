/**
 * 모듈별 설정 정의
 * 각 모듈의 기본값, Quill 필드, 프로세서를 선언적으로 정의
 */

import type { ModuleConfig } from './moduleContentProcessor'
import * as processors from './processors'

/**
 * ModuleBasicHeader 설정
 */
export const moduleBasicHeaderConfig: ModuleConfig = {
  quillFields: ['headerText'],
  defaults: {
    logoImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/logo-gray.png',
    logoAlt: '로고',
  },
}

/**
 * ModuleDescText 설정
 */
export const moduleDescTextConfig: ModuleConfig = {
  quillFields: ['descriptionText'],
}

/**
 * ModuleImg 설정
 */
export const moduleImgConfig: ModuleConfig = {
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    imageAlt: '이미지',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [processors.imageLinkProcessor],
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
  },
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
  },
}

/**
 * SectionTitle 설정
 */
export const sectionTitleConfig: ModuleConfig = {
  processors: [processors.removeEmptySubTitleProcessor],
}

/**
 * Module04 설정
 */
export const module04Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
  defaults: {
    leftImageBorderRadius: '0px',
    leftImageLinkUrl: '#',
    rightImageBorderRadius: '0px',
    rightImageLinkUrl: '#',
  },
  processors: [
    processors.module04ImageProcessor,
    processors.module04ButtonProcessor,
    processors.module04AdditionalContentProcessor,
    processors.twoColumnImageLinkProcessor,
  ],
}

/**
 * Module02 설정
 */
export const module02Config: ModuleConfig = {
  defaults: {
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [
    processors.module02ImageProcessor,
    processors.module02ButtonStyleProcessor,
    processors.module02AdditionalContentProcessor,
    processors.removeButtonProcessor,
    processors.imageLinkProcessor,
  ],
}

/**
 * Module05-3 설정
 */
export const module053Config: ModuleConfig = {
  defaults: {
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [
    processors.module053ImageProcessor,
    processors.module053ButtonProcessor,
    processors.imageLinkProcessor,
  ],
}

/**
 * Module01 설정
 */
export const module01Config: ModuleConfig = {
  defaults: {
    contentTitle: '콘텐츠 타이틀',
    titleColor: '#eb2a25',
    contentText: '콘텐츠 텍스트',
    bgColor: '#f5f5f5',
  },
}

/**
 * Module01-1 설정
 */
export const module011Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
}

/**
 * Module01-2 설정
 */
export const module012Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    categoryBgColor: '#666666',
    categoryTextColor: '#ffffff',
  },
}

/**
 * Module05-1 설정
 */
export const module051Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    ImageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    ImageAlt: '이미지',
    boxBgColor: '#e5e5e5',
    boxColor: '#111111',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [processors.module051ButtonProcessor, processors.imageLinkProcessor],
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
  },
  processors: [processors.module052ButtonProcessor, processors.imageLinkProcessor],
}

/**
 * Module06 설정
 */
export const module06Config: ModuleConfig = {
  quillFields: ['leftContent', 'rightContent'],
  defaults: {
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
  },
  processors: [processors.module06MultiButtonProcessor, processors.twoColumnImageLinkProcessor],
}

/**
 * Module07 / Module07_reverse 설정
 */
export const module07Config: ModuleConfig = {
  quillFields: ['contentText'],
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-2column.png',
    imageAlt: '이미지',
    buttonBgColor: '#e5e5e5',
    buttonTextColor: '#333333',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [processors.module07ButtonProcessor, processors.imageLinkProcessor],
}

/**
 * ModuleFooter 설정
 */
export const moduleFooterConfig: ModuleConfig = {
  defaults: {
    topText: '<strong>코리아빌드 사무국</strong> (주)메쎄이상',
    addressText: '서울시 마포구 월드컵북로&nbsp;58길&nbsp;9 ES타워&nbsp;(03922)',
    websiteUrl: 'www.koreabuild.co.kr',
    phone: '02-6121-6362',
    email: 'hvackorea@esgroup.net',
    unsubscribeUrl: '#',
    inquiryEmail: 'hvackorea@esgroup.net',
  },
  processors: [processors.footerSnsProcessor],
}

/**
 * Module10 설정
 */
export const module10Config: ModuleConfig = {
  defaults: {
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-speaker.png',
    imageAlt: '이미지',
    labelBgColor: '#333333',
    labelTextColor: '#ffffff',
    imageBorderRadius: '0px',
    imageLinkUrl: '#',
  },
  processors: [processors.module10LabelProcessor, processors.imageLinkProcessor],
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
 * ModuleSubTitle 설정
 */
export const moduleSubTitleConfig: ModuleConfig = {
  autoReplacePlaceholders: false, // 커스텀 프로세서 사용
  processors: [processors.subtitleDefaultProcessor],
}

/**
 * 모듈 ID를 설정으로 매핑하는 레지스트리
 */
export const MODULE_CONFIG_REGISTRY: Record<string, ModuleConfig> = {
  ModuleBasicHeader: moduleBasicHeaderConfig,
  ModuleDescText: moduleDescTextConfig,
  ModuleImg: moduleImgConfig,
  ModuleOneButton: moduleOneButtonConfig,
  ModuleTwoButton: moduleTwoButtonConfig,
  SectionTitle: sectionTitleConfig,
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
  Module10: module10Config,
  'Module10-1': module101Config,
  ModuleSubTitle: moduleSubTitleConfig,
}
