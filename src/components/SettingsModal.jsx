import { useState } from 'react';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    darkTheme: true,
    compactMode: false,
    autoTranslate: true,
    aiSuggestions: true,
    spatialAudio: true,
    hardwareAccel: true,
    notifsAudio: true,
    notifsChat: false,
    aiKey: localStorage.getItem('watchpro_gemini_key') || ''
  });

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  const ToggleRow = ({ label, sub, stateKey }) => (
    <div className="modal-row">
      <div>
        <div className="modal-row-label">{label}</div>
        {sub && <div className="modal-row-sub">{sub}</div>}
      </div>
      <div className={`toggle-switch ${settings[stateKey] ? 'on' : ''}`} onClick={() => toggle(stateKey)}>
        <div className="toggle-knob" />
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Room Settings</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Playback & Audio</div>
          <ToggleRow label="Spatial Audio" sub="Positional audio for participants" stateKey="spatialAudio" />
          <ToggleRow label="Hardware Acceleration" sub="Smoother video playback" stateKey="hardwareAccel" />
        </div>

        <div className="modal-section">
          <div className="modal-section-title">AI Engine</div>
          
          <div className="modal-row" style={{ display: 'block', paddingBottom: 16 }}>
            <div className="modal-row-label">Google Gemini API Key</div>
            <div className="modal-row-sub" style={{ marginBottom: 8 }}>Bring your own key to power AI Recaps and the Assistant for free.</div>
            <input 
              type="password"
              placeholder="AIzaSy..."
              value={settings.aiKey || ''}
              onChange={e => setSettings(s => ({ ...s, aiKey: e.target.value }))}
              style={{
                width: '100%', padding: '8px 12px', fontSize: '0.8rem',
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
          </div>

          <ToggleRow label="AI Suggestions" sub="Show quick prompts based on context" stateKey="aiSuggestions" />
          <ToggleRow label="Auto-Translate Subtitles" sub="Real-time translation for foreign audio" stateKey="autoTranslate" />
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Appearance</div>
          <ToggleRow label="Dark Theme" sub="Easier on the eyes (recommended)" stateKey="darkTheme" />
          <ToggleRow label="Compact Mode" sub="Hide avatars in chat" stateKey="compactMode" />
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Notifications</div>
          <ToggleRow label="Join/Leave Alerts" sub="Play a sound when someone enters" stateKey="notifsAudio" />
          <ToggleRow label="Chat Notifications" sub="Toast popups for new messages" stateKey="notifsChat" />
        </div>

        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={() => {
              if (settings.aiKey) localStorage.setItem('watchpro_gemini_key', settings.aiKey);
              onClose();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
