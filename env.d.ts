/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 이미지 업로드 API 주소.
   *
   * **비어 있으면 업로드 UI 자체가 숨겨진다**(URL 직접 입력만 남는다) — 서버 쪽 CORS 허용이
   * 끝나기 전에 배포해도 사용자에게 안 되는 버튼이 보이지 않게 하려는 안전장치다.
   *
   *  · 개발: `/api/files/s3upload` 같은 **상대 경로**를 넣는다. vite.config.ts의 프록시가
   *    받아서 서버끼리 대신 호출하므로 CORS가 적용되지 않는다.
   *  · 배포: 전체 URL을 넣는다. 이때는 브라우저가 직접 부르므로 **서버 응답에
   *    `Access-Control-Allow-Origin`이 반드시 있어야 한다**.
   */
  readonly VITE_S3_UPLOAD_URL?: string
  /**
   * 업로드 응답(`savedFileName`)이 전체 URL이 아니라 키/상대경로로 올 때 앞에 붙일 주소.
   * 응답이 이미 `http(s)://`로 시작하면 무시된다.
   */
  readonly VITE_S3_PUBLIC_BASE?: string
  /**
   * 저장소(S3) 버킷 주소 — '폴더 선택'이 이미 있는 회차 폴더를 읽어 오는 데 쓴다.
   *
   * 버킷이 ListObjectsV2를 공개하고 CORS도 열어 둬서 브라우저에서 바로 부를 수 있다.
   * 비워 두면 코드의 기본값(운영 버킷)을 쓴다 — 이미지 주소에 이미 공개된 값이다.
   */
  readonly VITE_S3_BUCKET_URL?: string
  /** Azure 키를 보관하는 서버 프록시의 공개 주소. 비밀키 자체를 넣지 않는다. */
  readonly VITE_AZURE_TRANSLATE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
