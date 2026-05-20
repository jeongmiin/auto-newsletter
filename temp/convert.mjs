// Extract AUTO_NEWSLETTER_METADATA from HTML and produce a template entry.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'temp', 'gcaf_temp_newletter.html')
const DEST = path.join(ROOT, 'public', 'templates', 'templates-config.json')

const html = fs.readFileSync(SRC, 'utf-8')

const startMarker = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
const endMarker = '<!-- AUTO_NEWSLETTER_METADATA_END -->'
const startIdx = html.indexOf(startMarker)
const endIdx = html.indexOf(endMarker)
if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found')
  process.exit(1)
}
const between = html.substring(startIdx + startMarker.length, endIdx).trim()
const jsonMatch = between.match(/<!--\s*([\s\S]*?)\s*-->/)
if (!jsonMatch) {
  console.error('JSON comment not found')
  process.exit(1)
}
const data = JSON.parse(jsonMatch[1].trim())

if (!Array.isArray(data.modules)) {
  console.error('modules array missing')
  process.exit(1)
}

const cleanedModules = data.modules.map((m) => {
  const { order, ...rest } = m
  return rest
})

const gocafTemplate = {
  id: 'gocaf-template',
  name: '고카프 템플릿',
  description: '고카프 vol60 전체 구성 (헤더 ~ 푸터, 40개 모듈)',
  wrapSettings: data.wrapSettings,
  modules: cleanedModules,
}

// Load existing config, replace/insert the gocaf-template entry.
let config = { templates: [] }
if (fs.existsSync(DEST)) {
  config = JSON.parse(fs.readFileSync(DEST, 'utf-8'))
  if (!Array.isArray(config.templates)) config.templates = []
}
const existingIdx = config.templates.findIndex((t) => t.id === 'gocaf-template')
if (existingIdx >= 0) {
  config.templates[existingIdx] = gocafTemplate
} else {
  config.templates.push(gocafTemplate)
}

fs.writeFileSync(DEST, JSON.stringify(config, null, 2) + '\n', 'utf-8')

console.log(`OK — ${cleanedModules.length} modules written to templates-config.json`)
console.log(`Sample module types:`)
const types = cleanedModules.map((m) => m.moduleId)
console.log(`  ${types.slice(0, 10).join(', ')}${types.length > 10 ? ', ...' : ''}`)
