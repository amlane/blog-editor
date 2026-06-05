import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPosts, getPost, deletePost } from '../lib/github'
import { parseFrontmatter, formatDate } from '../lib/markdown'
import { PenSquare, Trash2, Plus, RefreshCw, FileText, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function fetchPosts() {
    setLoading(true)
    setError(null)
    try {
      const files = await listPosts()
      const parsed = await Promise.all(
        files.map(async f => {
          const { content, sha } = await getPost(f.path)
          const { data } = parseFrontmatter(content)
          return {
            path: f.path,
            sha,
            title: data.title || f.name.replace('.md', ''),
            date: data.date || '',
            excerpt: data.excerpt || '',
            draft: data.draft === 'true' || data.draft === true,
          }
        })
      )
      // Sort newest first
      parsed.sort((a, b) => (a.date < b.date ? 1 : -1))
      setPosts(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  async function handleDelete(post) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    setDeleting(post.path)
    try {
      await deletePost(post.path, post.sha)
      setPosts(p => p.filter(x => x.path !== post.path))
    } catch (err) {
      alert(`Error deleting: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Posts</h1>
          <p className="post-count">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        </div>
        <div className="header-actions">
          <button className="icon-action-btn" onClick={fetchPosts} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="new-post-btn" onClick={() => navigate('/editor/new')}>
            <Plus size={18} /> New Post
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading posts from GitHub…</span>
        </div>
      )}

      {error && (
        <div className="error-state">
          <AlertCircle size={20} />
          <div>
            <strong>Couldn't load posts</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="empty-state">
          <FileText size={48} strokeWidth={1} />
          <h3>No posts yet</h3>
          <p>Create your first post and it'll be saved to your GitHub repo.</p>
          <button className="new-post-btn" onClick={() => navigate('/editor/new')}>
            <Plus size={18} /> Write your first post
          </button>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="post-list">
          {posts.map(post => (
            <div key={post.path} className="post-card">
              <div className="post-card-main" onClick={() => navigate(`/editor/${encodeURIComponent(post.path)}`)}>
                <div className="post-card-top">
                  <h3>{post.title}</h3>
                  {post.draft && <span className="draft-badge">Draft</span>}
                </div>
                {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
                <div className="post-meta">
                  <span className="post-path">{post.path}</span>
                  {post.date && <span className="post-date">{formatDate(post.date)}</span>}
                </div>
              </div>
              <div className="post-card-actions">
                <button
                  className="icon-action-btn"
                  onClick={() => navigate(`/editor/${encodeURIComponent(post.path)}`)}
                  title="Edit"
                >
                  <PenSquare size={16} />
                </button>
                <button
                  className="icon-action-btn danger"
                  onClick={() => handleDelete(post)}
                  disabled={deleting === post.path}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
