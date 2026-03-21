import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Play, Users, Zap, Search } from 'lucide-react';

export default function Lobby() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');

  const createRoom = () => {
    const newId = uuidv4().substring(0, 8); // Short memorable ID
    // Pass the custom name through state
    navigate(`/r/${newId}`, { state: { roomName: roomNameInput.trim() || 'Untitled Party' } });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (joinId.trim()) {
      // Extract from URL if they pasted whole URL
      const match = joinId.match(/\/r\/([a-zA-Z0-9-]+)/);
      const finalId = match ? match[1] : joinId.trim();
      navigate(`/r/${finalId}`);
    }
  };

  return (
    <div className="app-shell animate-fadeIn" style={{ background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 800, width: '100%', padding: 40, textAlign: 'center' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ 
            width: 50, height: 50, borderRadius: 12, 
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <Play fill="currentColor" size={24} style={{ marginLeft: 3 }} />
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Watch<span className="gradient-text">Pro</span></h1>
        </div>
        
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6 }}>
          The AI-powered watch party platform.<br/>
          Watch YouTube together, chat with friends, and let WatchPro AI enhance the experience.
        </p>

        <div style={{ 
          maxWidth: 600, margin: '0 auto', 
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          padding: '40px 30px', borderRadius: 32,
          display: 'flex', flexDirection: 'column', gap: 30,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.02)'
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Start a fresh session</div>
            
            <input 
              placeholder="Give your room a name..." 
              value={roomNameInput}
              onChange={e => setRoomNameInput(e.target.value)}
              style={{ 
                width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                color: '#fff', outline: 'none', transition: 'all 0.3s ease',
                fontSize: '0.95rem'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            <button 
              className="btn-primary" 
              onClick={createRoom}
              style={{ padding: '18px 24px', fontSize: '1.2rem', width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}
            >
              <Zap size={20} /> Create New Room
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '0 20px' }}>
             <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--border))' }} />
             <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', opacity: 0.6 }}>OR</div>
             <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Have an invite link?</div>
            <form onSubmit={joinRoom} style={{ display: 'flex', position: 'relative' }}>
              <input 
                placeholder="Paste Room ID or Link" 
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                style={{ 
                  width: '100%', padding: '18px 24px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                  color: '#fff', outline: 'none', transition: 'all 0.3s ease',
                  fontSize: '1rem'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--accent)';
                  e.target.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.2)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button 
                type="submit"
                style={{
                  position: 'absolute', right: 8, top: 8, bottom: 8,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: 'none',
                  borderRadius: '50%', width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'transform 0.2s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Search size={20} />
              </button>
            </form>
          </div>

        </div>

        {/* Feature Highlights Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 60, textAlign: 'left' }}>
          {[
            { icon: '✨', title: 'WatchPro AI Copilot', desc: 'Real-time interactive AI that watches alongside you, answers questions, and generates session recaps.' },
            { icon: '⚡', title: 'Sub-Second Sync', desc: 'Host controls playback for everyone instantly over secure WebRTC & Firestore pipelines.' },
            { icon: '🌐', title: 'Infinite Rooms', desc: 'Every room is isolated. Bring your own YouTube links. Private and secure.' }
          ].map(f => (
            <div key={f.title} style={{ padding: 24, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
