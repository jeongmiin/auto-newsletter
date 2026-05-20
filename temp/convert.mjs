// Extract AUTO_NEWSLETTER_METADATA from HTML and produce a template entry.
// Usage: node convert.mjs <htmlFile> <templateId> <templateName> <description>
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DEST = path.join(ROOT, 'public', 'templates', 'templates-config.json')

const [, , htmlArg, templateId, templateName, description = ''] = process.argv
if (!htmlArg || !templateId || !templateName) {
  console.error('Usage: node convert.mjs <htmlFile> <templateId> <templateName> [description]')
  process.exit(2)
}

const SRC = path.isAbsolute(htmlArg) ? htmlArg : path.join(ROOT, htmlArg)
const html = fs.readFileSync(SRC, 'utf-8')

const startMarker = '<!-- AUTO_NEWSLETTER_METADATA_START -->'
const endMarker = '<!-- AUTO_NEWSLETTER_METADATA_END -->'
const startIdx = html.indexOf(startMarker)
const endIdx = html.indexOf(endMarker)
if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found in', SRC)
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

const newTemplate = {
  id: templateId,
  name: templateName,
  description,
  wrapSettings: data.wrapSettings,
  modules: cleanedModules,
}

// Load existing config, replace/insert the entry by id.
let config = { templates: [] }
if (fs.existsSync(DEST)) {
  config = JSON.parse(fs.readFileSync(DEST, 'utf-8'))
  if (!Array.isArray(config.templates)) config.templates = []
}
const existingIdx = config.templates.findIndex((t) => t.id === templateId)
if (existingIdx >= 0) {
  config.templates[existingIdx] = newTemplate
  console.log(`Updated existing template: ${templateId}`)
} else {
  config.templates.push(newTemplate)
  console.log(`Added new template: ${templateId}`)
}

fs.writeFileSync(DEST, JSON.stringify(config, null, 2) + '\n', 'utf-8')

console.log(`OK — ${cleanedModules.length} modules (template count now: ${config.templates.length})`)
const types = cleanedModules.map((m) => m.moduleId)
const counts = types.reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {})
console.log('Module types:', counts)
