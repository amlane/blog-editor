// GitHub API helpers

const GITHUB_API = 'https://api.github.com'

function getConfig() {
  const token = localStorage.getItem('gh_token')
  const owner = localStorage.getItem('gh_owner')
  const repo = localStorage.getItem('gh_repo')
  const branch = localStorage.getItem('gh_branch') || 'main'
  const postsPath = localStorage.getItem('gh_posts_path') || 'posts'
  return { token, owner, repo, branch, postsPath }
}

function headers() {
  const { token } = getConfig()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function isConfigured() {
  const { token, owner, repo } = getConfig()
  return !!(token && owner && repo)
}

export async function validateConfig(token, owner, repo) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error('Repository not found or token invalid')
  return res.json()
}

export async function listPosts() {
  const { owner, repo, branch, postsPath } = getConfig()
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${postsPath}?ref=${branch}`,
    { headers: headers() }
  )
  if (res.status === 404) return [] // posts folder doesn't exist yet
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
  const files = await res.json()
  return files.filter(f => f.name.endsWith('.md'))
}

export async function getPost(path) {
  const { owner, repo, branch } = getConfig()
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
  const file = await res.json()
  const binary = atob(file.content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  const content = new TextDecoder('utf-8').decode(bytes)
  return { content, sha: file.sha, path: file.path }
}

export async function savePost(path, content, sha = null, commitMessage = null) {
  const { owner, repo, branch } = getConfig()
  const message = commitMessage || (sha ? `Update ${path}` : `Create ${path}`)
  // TextEncoder handles the full Unicode range (curly quotes, em-dashes, etc.)
  // btoa only handles latin1, so we go through Uint8Array → binary string first
  const bytes = new TextEncoder().encode(content)
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  const body = {
    message,
    content: btoa(binary),
    branch,
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub error: ${res.status}`)
  }
  return res.json()
}

export async function deletePost(path, sha) {
  const { owner, repo, branch } = getConfig()
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ message: `Delete ${path}`, sha, branch }),
    }
  )
  if (!res.ok) throw new Error(`GitHub error: ${res.status}`)
  return res.json()
}

export function saveConfig(token, owner, repo, branch, postsPath) {
  localStorage.setItem('gh_token', token)
  localStorage.setItem('gh_owner', owner)
  localStorage.setItem('gh_repo', repo)
  localStorage.setItem('gh_branch', branch)
  localStorage.setItem('gh_posts_path', postsPath)
}

export function clearConfig() {
  ;['gh_token', 'gh_owner', 'gh_repo', 'gh_branch', 'gh_posts_path'].forEach(
    k => localStorage.removeItem(k)
  )
}

export function getStoredConfig() {
  return getConfig()
}
