import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

export default function ApiSettings({ onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setBaseUrl(localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || '')
    setApiKey(localStorage.getItem('api_key') || import.meta.env.VITE_API_KEY || '')
  }, [])

  const handleSave = () => {
    localStorage.setItem('api_base_url', baseUrl.trim())
    localStorage.setItem('api_key', apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span>API 设置</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <label>
            <span>API 地址</span>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://bmai.kun8.vip"
            />
          </label>
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>
        </div>
        <div className="settings-footer">
          <button className="settings-save" onClick={handleSave}>
            {saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
