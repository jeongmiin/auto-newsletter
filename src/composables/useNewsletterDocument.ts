import { useModuleStore } from '@/stores/moduleStore'
import { useEditorStore } from '@/stores/editorStore'
import { processQuillHtml } from '@/utils/quillHtmlProcessor'
import { serializeModule } from '@/utils/projectFile'

/**
 * 지금 작업물을 **하나의 완성된 HTML 문서**로 만든다.
 *
 * 내려받기(저장용·발송용)·HTML 복사·임시 저장·웹 링크 생성이 모두 이 한 곳을 쓴다.
 * 만드는 자리가 갈라지면 '발송용으로 받은 파일'과 '웹 링크로 열리는 파일'이 미묘하게 달라지는데,
 * 그건 받는 사람만 알아채는 종류의 어긋남이라 여기 모아 둔다.
 */
export function useNewsletterDocument() {
  const moduleStore = useModuleStore()
  const editorStore = useEditorStore()

  /**
   * @param includeMetadata true면 재편집용 메타데이터(주석)를 담고(저장용),
   *                        false면 뺀다(발송용 — 메일에 그대로 실린다)
   */
  const buildDocument = async (includeMetadata: boolean): Promise<string> => {
    const finalHtml = processQuillHtml(await moduleStore.generateHtml())
    return wrapDocument(finalHtml, includeMetadata)
  }

  /** 본문 HTML을 문서로 감싼다 (본문을 이미 갖고 있을 때) */
  const wrapDocument = (finalHtml: string, includeMetadata: boolean): string => {
    let metadataBlock = ''
    if (includeMetadata) {
      const projectState = {
        // 직렬화는 파일 열기(복원)와 짝이라 utils/projectFile에 공용으로 둔다 —
        // 여기서 필드를 빠뜨리면 다시 열었을 때 그대로 유실된다.
        modules: moduleStore.modules.map(serializeModule),
        groups: moduleStore.groups,
        wrapSettings: editorStore.wrapSettings,
        // 만든 팀을 기록해 둔다(표시명이 아니라 불변 id).
        // 다시 열 때 현재 작업 팀을 덮어쓰지는 않는다 — projectFile.ts의 teamId 주석 참고.
        teamId: editorStore.currentTeamId,
      }
      // 콘텐츠의 '-->' 등으로 HTML 주석이 조기 종료되어 파일이 깨지는 것을 방지.
      // <, > 를 < / > 로 치환 → JSON 문자열 값 안에서만 등장하므로 JSON.parse가 복원(import 변경 불필요).
      const BACKSLASH = String.fromCharCode(92)
      const moduleMetadataJson = JSON.stringify(projectState)
        .replace(/</g, BACKSLASH + 'u003c')
        .replace(/>/g, BACKSLASH + 'u003e')
      metadataBlock = `
<!-- AUTO_NEWSLETTER_METADATA_START -->
<!-- ${moduleMetadataJson} -->
<!-- AUTO_NEWSLETTER_METADATA_END -->`
    }

    return `<!DOCTYPE html>
<html lang="ko" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>Newsletter</title>
  <style>
    /* 아웃룩(Word 엔진) 보정: 테이블 간격 제거, 이미지 보간/테두리 정리 */
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body style="margin:0; padding:0; background-color: #f2f2f2;">
${finalHtml}${metadataBlock}
</body>
</html>`
  }

  return { buildDocument, wrapDocument }
}
