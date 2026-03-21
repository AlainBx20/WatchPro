import { useRef, useEffect } from 'react';
import { Mic, MicOff, Crown, Wifi, WifiOff } from 'lucide-react';

function SpeakingWave() {
  return (
    <div className="speaking-wave">
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
    </div>
  );
}

function ParticipantVideo({ stream, isLocal }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '50%', background: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none'
        }}
      />
    </div>
  );
}

export default function ParticipantsPanel({ participants, collapsed, remoteStreams, localStream }) {
  const online = participants.filter(p => p.status === 'online');
  const offline = participants.filter(p => !p.status || p.status === 'offline');

  return (
    <aside className={`left-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">Participants</span>
        <span className="participant-count">{online.length} online</span>
      </div>

      <div className="participants-list">
        {online.map(p => {
          const isSpeaking = p.media?.isSpeaking;
          const isMuted = p.media?.micOn === false;
          const stream = p.id.includes('local') || p.id === 'current-user-id' ? localStream : (remoteStreams ? remoteStreams[p.id] : null);
          const hasVideo = !!stream;

          return (
            <div key={p.id} className="participant-item">
              <div className="avatar-wrap">
                <div
                  className={`avatar ${p.isHost ? 'avatar-host' : ''}`}
                  style={{ 
                    background: p.avatar ? 'none' : `linear-gradient(135deg, ${p.color}cc, ${p.color}66)`,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {hasVideo ? (
                    <ParticipantVideo stream={stream} isLocal={p.id.includes('(You)') || p.id.startsWith('local')} />
                  ) : p.avatar ? (
                    <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    p.initials
                  )}
                </div>
                <div className="online-dot" />
              </div>
              <div className="participant-info">
                <div className="participant-name">{p.name}</div>
                <div className="participant-status flex gap-1 items-center">
                  {p.isHost && <span className="host-label">Host</span>}
                  {p.isBuffering && <span className="buffering-badge">Buffering…</span>}
                </div>
              </div>
              <div className="participant-icons">
                {isSpeaking && <SpeakingWave />}
                {!isSpeaking && (
                  isMuted
                    ? <MicOff className="mic-icon mic-muted" size={14} />
                    : <Mic className="mic-icon" size={14} />
                )}
                {p.isHost && <Crown size={13} style={{ color: '#f59e0b', marginLeft: 2 }} />}
              </div>
            </div>
          );
        })}

        {offline.length > 0 && (
          <>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '8px 10px 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Offline
            </div>
            {offline.map(p => (
              <div key={p.id} className="participant-item" style={{ opacity: 0.45 }}>
                <div className="avatar-wrap">
                  <div 
                    className="avatar" 
                    style={{ 
                      background: p.avatar ? 'none' : `linear-gradient(135deg, ${p.color}66, ${p.color}33)`,
                      overflow: 'hidden'
                    }}
                  >
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                    ) : (
                      p.initials
                    )}
                  </div>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--text-muted)', border: '2px solid var(--bg-secondary)', position: 'absolute', bottom: 0, right: 0 }} />
                </div>
                <div className="participant-info">
                  <div className="participant-name">{p.name}</div>
                  <div className="participant-status flex gap-1 items-center">
                    <WifiOff size={10} style={{ color: 'var(--text-muted)' }} />
                    <span>Disconnected</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
