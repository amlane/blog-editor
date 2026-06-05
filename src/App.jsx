import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { isConfigured, getStoredConfig } from './lib/github'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Settings from './pages/Settings'
import { LayoutDashboard, Settings as SettingsIcon, BookOpen, Github } from 'lucide-react'

export default function App() {
  const [configured, setConfigured] = useState(isConfigured())
  const location = useLocation()
  const navigate = useNavigate()
  const { owner, repo } = getStoredConfig()

  useEffect(() => {
    setConfigured(isConfigured())
  }, [location])

  useEffect(() => {
    if (!isConfigured() && location.pathname !== '/settings') {
      navigate('/settings')
    }
  }, [])

  function handleSettingsSaved() {
    setConfigured(isConfigured())
    if (isConfigured()) navigate('/')
    else navigate('/settings')
  }

  const isEditing = location.pathname.startsWith('/editor/')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BookOpen size={22} />
          <span>Blog Editor</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive && !isEditing ? 'active' : ''}`} end>
            <LayoutDashboard size={17} /> Posts
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={17} /> Settings
          </NavLink>
        </nav>

        {configured && (
          <div className="sidebar-repo">
            <Github size={13} />
            <span>{owner}/{repo}</span>
          </div>
        )}
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:filePath" element={<Editor />} />
          <Route path="/settings" element={<Settings onSaved={handleSettingsSaved} />} />
        </Routes>
      </main>
    </div>
  )
}
