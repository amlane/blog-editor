// Frontmatter parsing and serialization (no bundler-heavy gray-matter needed)

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw }
  const frontmatter = {}
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx === -1) return
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  })
  return { data: frontmatter, content: match[2] }
}

export function stringifyFrontmatter(data, content) {
  const lines = ['---']
  Object.entries(data).forEach(([k, v]) => {
    // Quote values that contain colons or special chars
    const needsQuotes = typeof v === 'string' && (v.includes(':') || v.includes('#'))
    lines.push(`${k}: ${needsQuotes ? `"${v}"` : v}`)
  })
  lines.push('---')
  lines.push('')
  lines.push(content)
  return lines.join('\n')
}

export function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}
