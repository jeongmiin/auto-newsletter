/**
 * 이미지 업로드 API 목(mock) 서버 — 개발용.
 *
 * 실제 서버(fmstest.e-sang.net 등)는 사내망에서만 닿기 때문에, 밖에서도 업로드 화면 전체를
 * 확인할 수 있도록 같은 계약을 흉내 낸다.
 *
 *   POST /api/files/s3upload   multipart(file, directory) → { savedFileName: '<URL>' }
 *   GET  /files/<경로>          업로드된 파일을 그대로 돌려준다 (미리보기가 실제로 뜨도록)
 *
 * 실행: npm run mock:upload    (Vite 프록시의 기본 대상이 이 포트다)
 * 저장 위치: .mock-uploads/ — 임시 폴더라 커밋하지 않는다.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.MOCK_UPLOAD_PORT || 5174)
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.mock-uploads')

/** 업로드 처리를 얼마나 느리게 흉내 낼지 (진행바 확인용, ms) */
const FAKE_LATENCY = Number(process.env.MOCK_UPLOAD_LATENCY || 400)

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  // .svg는 일부러 없다 — 업로드 허용 목록에서 뺀 형식이라(s3Upload.ts 참고),
  // 어떤 경로로든 들어오면 이미지가 아닌 application/octet-stream으로 내려가 실행되지 않는다.
}

/**
 * multipart/form-data 본문을 파트로 나눈다.
 *
 * 파일 바이트가 깨지지 않도록 Buffer 상태로 자른다 — 문자열로 바꾸면 바이너리가 손상된다.
 * 목 서버라 중첩 multipart 등 특수한 경우는 다루지 않는다.
 */
function parseMultipart(body, boundary) {
  const sep = Buffer.from(`--${boundary}`)
  const parts = []
  let cursor = body.indexOf(sep)
  while (cursor !== -1) {
    const start = cursor + sep.length
    // 끝 경계는 '--boundary--'
    if (body.slice(start, start + 2).toString() === '--') break
    const next = body.indexOf(sep, start)
    if (next === -1) break

    const chunk = body.slice(start, next)
    const headerEnd = chunk.indexOf('\r\n\r\n')
    if (headerEnd !== -1) {
      const headers = chunk.slice(0, headerEnd).toString('utf8')
      // 헤더와 본문 사이 \r\n\r\n(4바이트) 이후부터, 끝의 \r\n은 제외
      const content = chunk.slice(headerEnd + 4, chunk.length - 2)
      const name = /name="([^"]*)"/.exec(headers)?.[1] ?? ''
      const filename = /filename="([^"]*)"/.exec(headers)?.[1]
      parts.push({ name, filename, content })
    }
    cursor = next
  }
  return parts
}

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

/**
 * '/e-dm/2026/vms/' → ['e-dm','2026','vms']
 *
 * 저장 폴더 밖으로 나가는 조각은 버린다 — '..'(상위 이동)과 'C:'(드라이브 지정) 둘 다.
 * 역슬래시도 구분자로 본다(윈도우 경로가 섞여 들어오는 경우).
 */
const safeSegments = (directory) =>
  String(directory || '')
    .split(/[\\/]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..' && !s.includes(':'))

function handleUpload(req, res) {
  const contentType = req.headers['content-type'] || ''
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!boundary) {
    sendJson(res, 400, { message: 'multipart/form-data가 아닙니다.' })
    return
  }

  const chunks = []
  req.on('data', (c) => chunks.push(c))
  // 저장은 이 비동기 콜백 안에서 일어나므로 바깥 try/catch가 잡지 못한다 — 여기서 따로 감싼다
  req.on('end', () => {
    try {
      saveUpload(res, Buffer.concat(chunks), boundary[1] || boundary[2])
    } catch (err) {
      console.error('  ← 저장 실패:', err)
      if (!res.headersSent) sendJson(res, 500, { message: String(err?.message || err) })
    }
  })
}

function saveUpload(res, body, boundary) {
  const parts = parseMultipart(body, boundary)
  const filePart = parts.find((p) => p.name === 'file' && p.filename)
  const dirPart = parts.find((p) => p.name === 'directory')

  if (!filePart) {
    sendJson(res, 400, { message: '파일이 없습니다.' })
    return
  }
  const directory = dirPart ? dirPart.content.toString('utf8') : ''
  if (!directory.trim()) {
    sendJson(res, 400, { message: '업로드 경로를 입력하세요.' })
    return
  }

  // 파일명에도 경로가 섞여 올 수 있으니 마지막 조각만 쓴다
  const fileName = safeSegments(filePart.filename).pop() || 'upload.bin'
  const segments = safeSegments(directory)
  const dir = path.join(ROOT, ...segments)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, fileName), filePart.content)

  const url = `http://localhost:${PORT}/files/${[...segments, fileName].join('/')}`
  console.log(`  ← 저장 ${[...segments, fileName].join('/')} (${filePart.content.length} bytes)`)

  // 실제 서버처럼 약간의 지연을 줘 진행바가 보이게 한다
  setTimeout(() => sendJson(res, 200, { savedFileName: url }), FAKE_LATENCY)
}

function handleFile(req, res, urlPath) {
  const segments = safeSegments(decodeURIComponent(urlPath.replace(/^\/files\/?/, '')))
  const target = path.join(ROOT, ...segments)
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
    // 브라우저가 직접 열어볼 수도 있으니 열어 둔다 (목 서버 한정)
    'Access-Control-Allow-Origin': '*',
  })
  fs.createReadStream(target).pipe(res)
}

http
  .createServer((req, res) => {
    const urlPath = (req.url || '').split('?')[0]
    console.log(`${req.method} ${urlPath}`)

    // 요청 하나가 잘못돼도 서버가 죽지 않게 감싼다 — 개발 중 목 서버가 조용히 내려가면
    // 화면에서는 '서버에 연결하지 못했어요'로만 보여 원인을 찾기 어렵다.
    try {
      if (req.method === 'POST' && urlPath === '/api/files/s3upload') {
        handleUpload(req, res)
        return
      }
      if (req.method === 'GET' && urlPath.startsWith('/files/')) {
        handleFile(req, res, urlPath)
        return
      }
      // 실제 서버와 같이 POST만 받는다는 것을 흉내 낸다
      res.writeHead(405, { Allow: 'POST' }).end('Method Not Allowed')
    } catch (err) {
      console.error('  ← 처리 실패:', err)
      if (!res.headersSent) sendJson(res, 500, { message: String(err?.message || err) })
      else res.end()
    }
  })
  // ⚠ 반드시 127.0.0.1(내 PC)에만 연다 — 주소를 생략하면 모든 네트워크 인터페이스에 열려,
  //   이 서버를 켜 둔 동안 같은 와이파이·사내망의 누구든 인증 없이 파일을 올리고 읽어갈 수 있다.
  //   접속하는 건 같은 PC의 Vite 프록시뿐이라 막아도 동작에는 영향이 없다.
  .listen(PORT, '127.0.0.1', () => {
    console.log(`목 업로드 서버 http://localhost:${PORT} (이 PC에서만 접속 가능)`)
    console.log(`  POST /api/files/s3upload  → 저장 위치 ${ROOT}`)
  })
