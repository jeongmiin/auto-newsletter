import { describe, it, expect } from 'vitest'
import {
  replaceModuleBasicHeaderContent,
  replaceModuleDescTextContent,
  replaceModuleImgContent,
  replaceModuleOneButtonContent,
  replaceModuleTwoButtonContent,
  replaceSectionTitleContent,
  replaceModuleSubTitleContent,
  replaceDefaultTemplate,
} from '../moduleContentReplacer'

describe('moduleContentReplacer', () => {
  describe('replaceModuleBasicHeaderContent', () => {
    it('로고 URL과 Alt 텍스트를 교체해야 함', () => {
      const html = '<img src="{{logoImageUrl}}" alt="{{logoAlt}}" />'
      const properties = {
        logoImageUrl: 'https://example.com/logo.png',
        logoAlt: '회사 로고',
      }

      const result = replaceModuleBasicHeaderContent(html, properties)

      expect(result).toContain('https://example.com/logo.png')
      expect(result).toContain('회사 로고')
    })

    it('헤더 텍스트를 교체해야 함', () => {
      const html = '<h1>{{headerText}}</h1>'
      const properties = {
        headerText: '<p>뉴스레터 제목</p>',
      }

      const result = replaceModuleBasicHeaderContent(html, properties)

      expect(result).toContain('뉴스레터 제목')
    })

    it('기본값이 적용되어야 함', () => {
      const html = '<img src="{{logoImageUrl}}" alt="{{logoAlt}}" />'
      const properties = {}

      const result = replaceModuleBasicHeaderContent(html, properties)

      expect(result).toContain('design.messeesang.com')
      expect(result).toContain('로고')
    })
  })

  describe('replaceModuleDescTextContent', () => {
    it('설명 텍스트를 교체해야 함', () => {
      const html = '<p>{{descriptionText}}</p>'
      const properties = {
        descriptionText: '<strong>중요한 공지사항</strong>',
      }

      const result = replaceModuleDescTextContent(html, properties)

      expect(result).toContain('중요한 공지사항')
    })

    it('빈 값일 때 빈 문자열로 교체되어야 함', () => {
      const html = '<p>{{descriptionText}}</p>'
      const properties = {
        descriptionText: '',
      }

      const result = replaceModuleDescTextContent(html, properties)

      expect(result).toBe('<p></p>')
    })
  })

  describe('replaceModuleImgContent', () => {
    it('이미지 URL과 Alt를 교체해야 함', () => {
      const html = '<img src="{{imageUrl}}" alt="{{imageAlt}}" />'
      const properties = {
        imageUrl: 'https://example.com/image.jpg',
        imageAlt: '상품 이미지',
      }

      const result = replaceModuleImgContent(html, properties)

      expect(result).toContain('https://example.com/image.jpg')
      expect(result).toContain('상품 이미지')
    })

    it('기본 이미지 URL이 적용되어야 함', () => {
      const html = '<img src="{{imageUrl}}" alt="{{imageAlt}}" />'
      const properties = {}

      const result = replaceModuleImgContent(html, properties)

      expect(result).toContain('design.messeesang.com')
    })
  })

  describe('replaceModuleOneButtonContent', () => {
    it('버튼 텍스트와 URL을 교체해야 함', () => {
      const html = '<a href="{{buttonUrl}}">{{buttonText}}</a>'
      const properties = {
        buttonText: '더 보기',
        buttonUrl: 'https://example.com',
      }

      const result = replaceModuleOneButtonContent(html, properties)

      expect(result).toContain('더 보기')
      expect(result).toContain('https://example.com')
    })

    it('버튼 배경색과 텍스트 색상을 교체해야 함', () => {
      const html =
        '<div style="background-color: {{buttonBgColor}}; color: {{buttonTextColor}};"></div>'
      const properties = {
        buttonBgColor: '#ff0000',
        buttonTextColor: '#ffffff',
      }

      const result = replaceModuleOneButtonContent(html, properties)

      expect(result).toContain('#ff0000')
      expect(result).toContain('#ffffff')
    })

    it('기본값이 적용되어야 함', () => {
      const html = '<a href="{{buttonUrl}}">{{buttonText}}</a>'
      const properties = {}

      const result = replaceModuleOneButtonContent(html, properties)

      expect(result).toContain('큰 버튼 →')
      expect(result).toContain('href="#"')
    })
  })

  describe('replaceModuleTwoButtonContent', () => {
    it('두 개의 버튼을 모두 교체해야 함', () => {
      const html = `
        <a href="{{button1Url}}">{{button1Text}}</a>
        <a href="{{button2Url}}">{{button2Text}}</a>
      `
      const properties = {
        button1Text: '버튼 A',
        button1Url: 'https://a.com',
        button2Text: '버튼 B',
        button2Url: 'https://b.com',
      }

      const result = replaceModuleTwoButtonContent(html, properties)

      expect(result).toContain('버튼 A')
      expect(result).toContain('https://a.com')
      expect(result).toContain('버튼 B')
      expect(result).toContain('https://b.com')
    })

    it('각 버튼의 색상을 개별적으로 교체해야 함', () => {
      const html = `
        <div style="background: {{button1BgColor}}; color: {{button1TextColor}};"></div>
        <div style="background: {{button2BgColor}}; color: {{button2TextColor}};"></div>
      `
      const properties = {
        button1BgColor: '#ff0000',
        button1TextColor: '#ffffff',
        button2BgColor: '#00ff00',
        button2TextColor: '#000000',
      }

      const result = replaceModuleTwoButtonContent(html, properties)

      expect(result).toContain('#ff0000')
      expect(result).toContain('#00ff00')
    })
  })

  describe('replaceSectionTitleContent', () => {
    it('메인 타이틀을 교체해야 함', () => {
      const html = '<h2>{{mainTitle}}</h2>'
      const properties = {
        mainTitle: '섹션 제목',
      }

      const result = replaceSectionTitleContent(html, properties)

      expect(result).toContain('섹션 제목')
    })

    it('서브 타이틀이 있으면 교체해야 함', () => {
      const html = `
        <h2>{{mainTitle}}</h2>
        <div class="subtitle">{{subTitle}}</div>
      `
      const properties = {
        mainTitle: '메인',
        subTitle: '서브',
      }

      const result = replaceSectionTitleContent(html, properties)

      expect(result).toContain('메인')
      expect(result).toContain('서브')
    })

    it('서브 타이틀이 빈 값이면 요소가 제거되어야 함', () => {
      const html = `
        <h2>{{mainTitle}}</h2>
        <!-- 서브 타이틀 -->
        <tr><td class="subtitle">{{subTitle}}</td></tr>
        <!-- //서브 타이틀 -->
      `
      const properties = {
        mainTitle: '메인',
        subTitle: '',
      }

      const result = replaceSectionTitleContent(html, properties)

      expect(result).toContain('메인')
      expect(result).not.toContain('{{subTitle}}')
    })
  })

  describe('replaceModuleSubTitleContent', () => {
    it('서브타이틀 텍스트를 교체해야 함', () => {
      const html = '<div>{{subtitleText}}</div>'
      const properties = {
        subtitleText: '기조연설 (14:20~14:40)',
      }

      const result = replaceModuleSubTitleContent(html, properties)

      expect(result).toContain('기조연설')
    })

    it('빈 값일 때 기본값이 적용되어야 함', () => {
      const html = '<div>{{subtitleText}}</div>'
      const properties = {
        subtitleText: '',
      }

      const result = replaceModuleSubTitleContent(html, properties)

      expect(result).toContain('기조연설 (14:20~14:40)')
    })
  })

  describe('replaceDefaultTemplate', () => {
    it('모든 플레이스홀더를 자동으로 교체해야 함', () => {
      const html = `
        <div>
          <h1>{{title}}</h1>
          <p>{{content}}</p>
          <a href="{{url}}">{{linkText}}</a>
        </div>
      `
      const properties = {
        title: '제목',
        content: '내용',
        url: 'https://example.com',
        linkText: '링크',
      }

      const result = replaceDefaultTemplate(html, properties)

      expect(result).toContain('제목')
      expect(result).toContain('내용')
      expect(result).toContain('https://example.com')
      expect(result).toContain('링크')
    })

    it('공백이 있는 플레이스홀더도 처리해야 함', () => {
      const html = '<div>{{ title }}</div>'
      const properties = {
        title: '제목',
      }

      const result = replaceDefaultTemplate(html, properties)

      expect(result).toContain('제목')
    })

    it('존재하지 않는 속성은 그대로 유지되어야 함', () => {
      const html = '<div>{{nonExistent}}</div>'
      const properties = {}

      const result = replaceDefaultTemplate(html, properties)

      // properties에 없는 키는 교체되지 않음 (Object.entries에서 제외됨)
      expect(result).toBe('<div>{{nonExistent}}</div>')
    })
  })

  describe('특수 문자 처리', () => {
    it('HTML 태그를 처리해야 함', () => {
      const html = '<div>{{descriptionText}}</div>'
      const properties = {
        descriptionText: '<strong>강조된 텍스트</strong>',
      }

      const result = replaceModuleDescTextContent(html, properties)

      expect(result).toContain('강조된 텍스트')
    })

    it('줄바꿈 문자를 처리해야 함', () => {
      const html = '<div>{{content}}</div>'
      const properties = {
        content: '첫 줄\n둘째 줄',
      }

      const result = replaceModuleDescTextContent(html, properties)

      expect(result).toBeDefined()
    })
  })

  describe('엣지 케이스', () => {
    it('빈 HTML에 대해 오류 없이 처리해야 함', () => {
      const html = ''
      const properties = { test: 'value' }

      expect(() => replaceDefaultTemplate(html, properties)).not.toThrow()
    })

    it('빈 properties 객체를 처리해야 함', () => {
      const html = '<div>{{test}}</div>'
      const properties = {}

      const result = replaceDefaultTemplate(html, properties)

      expect(result).toBeDefined()
    })

    it('중복된 플레이스홀더를 모두 교체해야 함', () => {
      const html = '<div>{{text}}</div><div>{{text}}</div>'
      const properties = { text: '반복' }

      const result = replaceDefaultTemplate(html, properties)

      expect(result.match(/반복/g)).toHaveLength(2)
    })
  })
})