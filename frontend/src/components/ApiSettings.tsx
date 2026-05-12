import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

export default function ApiSettings({ onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState('')
  const [chatKey, setChatKey] = useState('')
  const [imageKey, setImageKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // 从后端加载配置
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        setBaseUrl(config.baseUrl || '')
        setChatKey(config.chatKey || '')
        setImageKey(config.imageKey || '')
      })
      .catch(err => {
        console.error('加载配置失败:', err)
      })
  }, [])

  const handleSave = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          chatKey: chatKey.trim(),
          imageKey: imageKey.trim(),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      console.error('保存配置失败:', err)
    }
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
            <span>聊天 API Key</span>
            <input
              type="password"
              value={chatKey}
              onChange={e => setChatKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>
          <label>
            <span>生图 API Key</span>
            <input
              type="password"
              value={imageKey}
              onChange={e => setImageKey(e.target.value)}
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
