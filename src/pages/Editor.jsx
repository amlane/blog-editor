import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPost, savePost, getStoredConfig } from '../lib/github'
import { parseFrontmatter, stringifyFrontmatter, slugify, todayISO } from '../lib/markdown'
import RichEditor from '../components/RichEditor'
import { Save, ArrowLeft, ExternalLink, Eye, EyeOff, AlertCircle, CheckCircle, Loader } from 'lucide-react'

export default function Editor() {
  const { filePath } = useParams()
  const navigate = useNavigate()
  const isNew = filePath === 'new'
  const decodedPath = isNew ? null : decodeURIComponent(filePath)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [date, setDate] = useState(todayISO())
  const [excerpt, setExcerpt] = useState('')
  const [draft, setDraft] = useState(false)
  const [tags, setTags] = useState('')
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [sha, setSha] = useState(null)
  const [currentPath, setCurrentPath] = useState(null)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saved' | 'error'
  const [saveError, setSaveError] = useState('')
  const [showMeta, setShowMeta] = useState(true)
  const [slugEdited, setSlugEdited] = useState(false)
  const saveTimer = useRef(null)

  const { postsPath } = getStoredConfig()

  useEffect(() => {
    if (!isNew) loadPost()
  }, [filePath])

  async function loadPost() {
    setLoading(true)
    try {
      const { content, sha: fileSha, path } = await getPost(decodedPath)
      const { data, content: body } = parseFrontmatter(content)
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setDate(data.date || todayISO())
      setExcerpt(data.excerpt || '')
      setDraft(data.draft === 'true' || data.draft === true)
      setTags(data.tags || '')
      setBodyMarkdown(body.trim())
      setSha(fileSha)
      setCurrentPath(path)
      setSlugEdited(true) // Don't auto-update slug when editing existing
    } catch (err) {
      alert(`Error loading post: ${err.message}`)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    if (!slugEdited) {
      setSlug(slugify(e.target.value))
    }
  }

  function buildPath(slugVal) {
    return `${postsPath || 'posts'}/${slugVal || 'untitled'}.md`
  }

  async function handleSave() {
    if (!title.trim()) { alert('Please add a title'); return }
    const currentSlug = slug || slugify(title)
    if (!currentSlug) { alert('Please add a slug'); return }

    setSaving(true)
    setSaveStatus(null)

    const frontmatter = {
      title: title.trim(),
      slug: currentSlug,
      date,
      ...(excerpt ? { excerpt: excerpt.trim() } : {}),
      ...(tags ? { tags } : {}),
      ...(draft ? { draft: 'true' } : {}),
    }

    const fullContent = stringifyFrontmatter(frontmatter, bodyMarkdown)
    const savePath = currentPath || buildPath(currentSlug)

    try {
      // Always fetch the latest SHA before saving to avoid stale-SHA conflicts
      // when the file has been edited locally and pushed since we last loaded it.
      let latestSha = sha
      if (savePath && currentPath) {
        try {
          const latest = await getPost(savePath)
          latestSha = latest.sha
        } catch {
          // File doesn't exist yet (new post) — that's fine, sha stays null
          latestSha = null
        }
      }

      const result = await savePost(savePath, fullContent, latestSha)
      const newSha = result.content?.sha
      setSha(newSha)
      setCurrentPath(savePath)
      setSaveStatus('saved')
      saveTimer.current = setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const previewPath = currentPath || buildPath(slug || slugify(title))
  const { owner, repo, branch } = getStoredConfig()
  const ghUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${previewPath}`

  if (loading) {
    return (
      <div className="editor-loading">
        <Loader size={24} className="spin" />
        <span>Loading post…</span>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Posts
        </button>
        <div className="editor-topbar-right">
          {saveStatus === 'saved' && (
            <span className="save-indicator success"><CheckCircle size={14} /> Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="save-indicator error"><AlertCircle size={14} /> {saveError}</span>
          )}
          {currentPath && (
            <a className="gh-link" href={ghUrl} target="_blank" rel="noreferrer" title="View on GitHub">
              <ExternalLink size={14} /> GitHub
            </a>
          )}
          <button className="toggle-meta-btn" onClick={() => setShowMeta(v => !v)} title="Toggle post settings">
            {showMeta ? <EyeOff size={15} /> : <Eye size={15} />}
            {showMeta ? 'Hide meta' : 'Show meta'}
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={15} className="spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save to GitHub'}
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          <input
            className="title-input"
            value={title}
            onChange={handleTitleChange}
            placeholder="Post title…"
          />

          {showMeta && (
            <div className="meta-panel">
              <div className="meta-row">
                <div className="meta-field">
                  <label>Slug</label>
                  <input
                    value={slug}
                    onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
                    placeholder="my-post-slug"
                  />
                  <span className="meta-hint">→ {buildPath(slug || slugify(title))}</span>
                </div>
                <div className="meta-field">
                  <label>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <div className="meta-row">
                <div className="meta-field grow">
                  <label>Excerpt</label>
                  <input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short description for listing pages…" />
                </div>
                <div className="meta-field">
                  <label>Tags</label>
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2" />
                </div>
                <div className="meta-field narrow">
                  <label>Status</label>
                  <label className="draft-toggle">
                    <input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} />
                    Draft
                  </label>
                </div>
              </div>
            </div>
          )}

          <RichEditor
            initialMarkdown={bodyMarkdown}
            onChange={setBodyMarkdown}
          />
        </div>
      </div>
    </div>
  )
}
