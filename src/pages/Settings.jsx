import { useState } from 'react'
import { validateConfig, saveConfig, clearConfig, getStoredConfig } from '../lib/github'
import { Github, CheckCircle, AlertCircle, LogOut, Eye, EyeOff } from 'lucide-react'

export default function Settings({ onSaved }) {
  const stored = getStoredConfig()
  const [token, setToken] = useState(stored.token || '')
  const [owner, setOwner] = useState(stored.owner || '')
  const [repo, setRepo] = useState(stored.repo || '')
  const [branch, setBranch] = useState(stored.branch || 'main')
  const [postsPath, setPostsPath] = useState(stored.postsPath || 'posts')
  const [showToken, setShowToken] = useState(false)
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      await validateConfig(token.trim(), owner.trim(), repo.trim())
      saveConfig(token.trim(), owner.trim(), repo.trim(), branch.trim(), postsPath.trim())
      setStatus('ok')
      setTimeout(() => onSaved?.(), 800)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  function handleDisconnect() {
    clearConfig()
    setToken('')
    setOwner('')
    setRepo('')
    setBranch('main')
    setPostsPath('posts')
    setStatus(null)
    onSaved?.()
  }

  const isConnected = !!(stored.token && stored.owner && stored.repo)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Github size={28} />
        <div>
          <h2>GitHub Connection</h2>
          <p>Connect your repository to store posts as Markdown files</p>
        </div>
      </div>

      {isConnected && (
        <div className="connected-banner">
          <CheckCircle size={16} />
          <span>Connected to <strong>{stored.owner}/{stored.repo}</strong></span>
          <button className="disconnect-btn" onClick={handleDisconnect}>
            <LogOut size={14} /> Disconnect
          </button>
        </div>
      )}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="field">
          <label>Personal Access Token</label>
          <div className="token-input">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="github_pat_..."
              required
            />
            <button type="button" className="icon-btn" onClick={() => setShowToken(v => !v)}>
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span className="hint">
            Create one at GitHub → Settings → Developer settings → Personal access tokens.
            Needs <code>repo</code> scope.
          </span>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Owner / Username</label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="your-username"
              required
            />
          </div>
          <div className="field">
            <label>Repository Name</label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="my-blog"
              required
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Branch</label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>
          <div className="field">
            <label>Posts folder path</label>
            <input
              type="text"
              value={postsPath}
              onChange={e => setPostsPath(e.target.value)}
              placeholder="posts"
            />
            <span className="hint">Folder inside your repo where .md files will live</span>
          </div>
        </div>

        {status === 'error' && (
          <div className="status-msg error">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        {status === 'ok' && (
          <div className="status-msg success">
            <CheckCircle size={16} /> Connected successfully!
          </div>
        )}

        <button
          type="submit"
          className="save-btn"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Connecting…' : 'Save & Connect'}
        </button>
      </form>

      <div className="settings-info">
        <h3>How it works</h3>
        <ol>
          <li>Posts are saved as <code>.md</code> files with YAML frontmatter in your repo.</li>
          <li>Each save creates a commit — your full post history is in Git.</li>
          <li>You can clone the repo locally and write posts in any editor.</li>
          <li>Your public blog reads from the same repo.</li>
        </ol>
      </div>
    </div>
  )
}
