import { useState, useEffect } from 'react';
import { Share2, Settings as SettingsIcon, Users, Tv, X, LogOut, CheckCircle, Navigation, Search, Copy, Link2, QrCode, Compass } from 'lucide-react';
import AILiveVibe from './AILiveVibe';
import ContentBrowser from './YouTubeBrowser';

export default function TopBar({
  appState, panelOpen, setPanelOpen, outOfSync, roomName,
  onOpenSettings, onOpenRecap, addToast, onUrlChange, isHost, chatMessages, onLeaveRoom
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState(24);

  useEffect(() => {
    let active = true;
    const calculatePing = () => {
      if (!active) return;
      // Simulating real-time WebSocket connection ping jitter
      const base = outOfSync ? 180 : 18;
      const jitter = outOfSync ? Math.random() * 120 : Math.random() * 22;
      setLatency(Math.floor(base + jitter));
    };
    
    calculatePing();
    const timer = setInterval(calculatePing, 2000); // Check every 2s
    return () => { active = false; clearInterval(timer); };
  }, [outOfSync]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    addToast({ type: 'success', icon: '🔗', title: 'Link copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    const val = linkInput.trim();
    if (!val) return;

    // If it looks like a URL or Magnet, update directly
    if (val.includes('youtube.com') || val.includes('youtu.be') || val.startsWith('magnet:')) {
      onUrlChange(val);
      addToast({ type: 'success', icon: '✨', title: 'Video Changed', sub: 'Loading link...' });
      setLinkInput('');
    } else {
      // Otherwise, open the browser and trigger search
      setShowBrowser(true);
    }
  };

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 16px' }}>
      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 700 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px var(--accent-glow)' }}>
            <Tv size={16} color="#fff" />
          </div>
          <span className="gradient-text" style={{ letterSpacing: '-0.5px' }}>WatchPro</span>
        </div>

        <div className="divider-v" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.90rem', fontWeight: 600 }}>{roomName || 'Connecting...'}</span>
            <span style={{ padding: '2px 8px', fontSize: '0.6rem', borderRadius: 20, background: isHost ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.1)', fontWeight: 700, letterSpacing: '0.5px', color: '#fff' }}>{isHost ? 'HOST' : 'VIEWER'}</span>
          </div>

          {!outOfSync ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(16,185,129,0.2)' }}>
               <CheckCircle size={12} />
               <span>In Sync</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>
               <span style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s infinite' }} />
               <span>Out of Sync</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: latency > 100 ? '#f59e0b' : 'var(--text-muted)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-glass)', transition: 'color 0.3s ease' }}>
             <Navigation size={11} style={{ transform: 'rotate(45deg)' }} />
             <span>{latency}ms {latency > 100 ? 'High' : 'Low'}</span>
          </div>

          <AILiveVibe chatMessages={chatMessages} />
        </div>
      </div>

      {/* Center - URL Input (Host only) or viewing indicator */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 20px', zIndex: 10 }}>
        {isHost ? (
          <form onSubmit={handleLinkSubmit} style={{ display: 'flex', width: '100%', maxWidth: 480, position: 'relative', pointerEvents: 'auto', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                placeholder="Paste Link or Search Content..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px 10px 40px', 
                  fontSize: '0.86rem', 
                  borderRadius: 30,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  cursor: 'text',
                  color: '#ffffff',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-bright)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button 
              type="button"
              className="btn-primary" 
              onClick={() => setShowBrowser(true)}
              style={{ padding: '0 20px', borderRadius: 30, fontSize: '0.85rem', flexShrink: 0, gap: 6 }}
            >
              <Compass size={16} />
              Browse
            </button>
          </form>
        ) : (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            padding: '6px 16px', borderRadius: 20, 
            background: 'rgba(124,58,237,0.1)', 
            border: '1px solid rgba(124,58,237,0.2)',
            fontSize: '0.78rem', color: 'var(--text-secondary)'
          }}>
            <span style={{ fontSize: '0.9rem' }}>👑</span>
            <span>Host is controlling the video</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          className={`icon-btn ${!panelOpen ? 'active' : ''}`}

          onClick={() => setPanelOpen(!panelOpen)}
          title="Toggle Participants"
        >
          <Users size={16} />
        </button>

        <button className="btn-primary" onClick={() => setShowInvite(true)} style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
          <Share2 size={13} />
          Invite
        </button>

        <button className="btn-ghost" onClick={onOpenRecap} style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
          ✨ Recap
        </button>

        <div className="divider-v" />

        <button className="icon-btn" onClick={onOpenSettings} title="Settings">
          <SettingsIcon size={16} />
        </button>

        <button className="icon-btn" onClick={onLeaveRoom} style={{ color: 'var(--danger)' }} title="Leave Room">
          <LogOut size={16} />
        </button>
      </div>

      {/* Invite Modal - Premium Design */}
      {showInvite && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowInvite(false)}
        >
          <div 
            style={{
              width: '90%', maxWidth: 420,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.1)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(14,165,233,0.08))',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Invite Friends</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share the room link to watch together</p>
              </div>
              <button className="icon-btn" onClick={() => setShowInvite(false)} style={{ background: 'var(--bg-glass)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* QR Code area */}
              <div style={{
                padding: 20,
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                border: '1px dashed var(--border)'
              }}>
                <div style={{
                  width: 140, height: 140,
                  background: '#fff',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 8
                }}>
                  <QrCode size={48} color="#333" />
                  <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>SCAN TO JOIN</span>
                </div>
              </div>

              {/* Room link */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Link2 size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                  Room Link
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={window.location.href}
                    style={{
                      flex: 1, padding: '10px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.82rem'
                    }}
                  />
                  <button 
                    onClick={handleCopyLink}
                    style={{
                      padding: '10px 16px',
                      background: copied ? 'var(--success)' : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px var(--accent-glow)',
                      border: 'none', cursor: 'pointer',
                      minWidth: 80, justifyContent: 'center'
                    }}
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share options */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'WhatsApp', color: '#25D366', icon: '📱' },
                  { label: 'Discord', color: '#5865F2', icon: '💬' },
                  { label: 'Twitter', color: '#1DA1F2', icon: '🐦' },
                ].map(s => (
                  <button key={s.label} style={{
                    flex: 1, padding: '10px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Content Browser Modal */}
      {showBrowser && (
        <ContentBrowser 
          onClose={() => setShowBrowser(false)}
          onSelect={(url) => {
            onUrlChange(url);
            const isMagnet = url.startsWith('magnet:');
            addToast({ 
              type: 'success', 
              icon: isMagnet ? '🍿' : '✨', 
              title: isMagnet ? 'Movie Selected' : 'Video Selected', 
              sub: isMagnet ? 'Connecting to P2P Swarm...' : 'Loading new video...' 
            });
          }}
        />
      )}
    </header>
  );
}
