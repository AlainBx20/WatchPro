import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  RefreshCw, PictureInPicture2, Zap, ZapOff
} from 'lucide-react';
import { formatTime } from '../hooks/useWatchParty';
import WebTorrentPlayer from './WebTorrentPlayer';


/**
 * Extract YouTube video ID from any URL format
 */
function extractYouTubeId(url) {
  if (!url) return null;
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

/**
 * Load the YouTube IFrame API script (once)
 */
let ytApiReady = false;
let ytApiCallbacks = [];

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (ytApiReady) { resolve(); return; }
    ytApiCallbacks.push(resolve);
    
    if (document.getElementById('yt-api-script')) return; // Already loading
    
    const tag = document.createElement('script');
    tag.id = 'yt-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks = [];
    };
  });
}

function EmojiFloat({ emoji, x, y, sender }) {
  return (
    <div className="emoji-float" style={{ 
      left: x, top: y, position: 'absolute', 
      display: 'flex', alignItems: 'center', gap: 6,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 50
    }}>
      <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
      {sender && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          padding: '2px 8px', borderRadius: 10,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {sender}
        </span>
      )}
    </div>
  );
}

/**
 * AMBIENT GLOW: Samples the video and projects colors behind it
 */
function AmbientGlow({ playerRef, isMagnet, videoEl }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let frameId;
    const updateGlow = () => {
      try {
        let source = null;
        if (isMagnet && videoEl) {
          source = videoEl;
        } else if (playerRef.current && playerRef.current.getIframe) {
          // YT Iframe doesn't allow cross-origin sampling easily, 
          // but we can provide a fallback gradient or use a proxy if needed.
          // For now, we'll focus on P2P/HTML5 sampling.
          source = null; 
        }

        if (source && source.readyState >= 2) {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          
          // Ultra-simple average
          let r=0, g=0, b=0;
          for (let i=0; i<data.length; i+=40) { // Sparse sampling
            r += data[i]; g += data[i+1]; b += data[i+2];
          }
          const count = data.length / 40;
          const avgR = Math.round(r/count);
          const avgG = Math.round(g/count);
          const avgB = Math.round(b/count);
          
          if (containerRef.current) {
            containerRef.current.style.boxShadow = `0 0 120px 40px rgba(${avgR}, ${avgG}, ${avgB}, 0.35)`;
          }
        }
      } catch(e) {}
      frameId = requestAnimationFrame(updateGlow);
    };
    
    updateGlow();
    return () => cancelAnimationFrame(frameId);
  }, [isMagnet, videoEl, playerRef]);

  return (
    <div ref={containerRef} style={{ 
      position: 'absolute', inset: '10%', zIndex: -1, 
      transition: 'box-shadow 0.8s ease',
      borderRadius: '50px' 
    }}>
      <canvas ref={canvasRef} width="32" height="18" style={{ display: 'none' }} />
    </div>
  );
}

export default function VideoArea({
  appState, currentTime, duration, onSeek, onStateChange,
  volume, setVolume, isFullscreen, toggleFullscreen,
  followHost, setFollowHost, outOfSync, onResync,
  videoRef, url, isHost, onTimeReport
}) {
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [playerReady, setPlayerReady] = useState(false);
  const [html5Video, setHtml5Video] = useState(null);
  const [showReactions, setShowReactions] = useState(() => {
    return localStorage.getItem('watchpro_show_reactions') !== 'false';
  });

  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressInterval = useRef(null);
  const ignoreStateChange = useRef(false);

  // Detection logic for P2P content (Magnet or direct .torrent URL)
  const isTorrent = url?.startsWith('magnet:') || url?.toLowerCase().endsWith('.torrent');
  const videoId = isTorrent ? null : extractYouTubeId(url);
  const videoIdRef = useRef(videoId);
  const hostSyncInterval = useRef(null);

  // HOST: periodically report current playback time to Firestore
  useEffect(() => {
    if (hostSyncInterval.current) clearInterval(hostSyncInterval.current);
    
    if (isHost && playerReady && playerRef.current && onTimeReport) {
      hostSyncInterval.current = setInterval(() => {
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const t = playerRef.current.getCurrentTime();
            const d = playerRef.current.getDuration();
            if (typeof t === 'number' && t >= 0) {
              onTimeReport(t, d);
            }
          }
        } catch(e) {}
      }, 1500); // Increased frequency to 1.5s
    }
    
    return () => {
      if (hostSyncInterval.current) clearInterval(hostSyncInterval.current);
    };
  }, [isHost, playerReady, onTimeReport]);

  // VIEWER GUARDIAN: Aggressively sync to host's timestamp and state
  useEffect(() => {
    if (isHost || !playerReady || !playerRef.current || currentTime === undefined) return;
    
    const syncGuardian = setInterval(() => {
      try {
        const myTime = playerRef.current.getCurrentTime();
        const myState = playerRef.current.getPlayerState();
        
        // 1. Drift Check (Tolerance: 1.5s)
        const drift = Math.abs(myTime - currentTime);
        if (drift > 1.5) {
          console.log(`⏱️ Sync snap: drift ${drift.toFixed(1)}s → seeking ${currentTime.toFixed(1)}s`);
          playerRef.current.seekTo(currentTime, true);
        }

        // 2. Playback State Check (YT states: 1=playing, 2=paused)
        const targetState = (appState === 'playing') ? 1 : 2;
        if (myState !== targetState && myState !== 3) { // Ignore if buffering (3)
          if (targetState === 1) playerRef.current.playVideo();
          else playerRef.current.pauseVideo();
        }
      } catch(e) {}
    }, 1000); // Heartbeat check every 1s

    return () => clearInterval(syncGuardian);
  }, [currentTime, appState, isHost, playerReady]);

  // Initialize YouTube player
  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyed) return;

      // Destroy previous player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
      }

      // Create a fresh div for the player
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
        const playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player-' + Date.now();
        playerContainerRef.current.appendChild(playerDiv);

        playerRef.current = new window.YT.Player(playerDiv.id, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,       // Hide YouTube controls - we use our own
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            iv_load_policy: 3, // No annotations
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (destroyed) return;
              setPlayerReady(true);
              setLocalDuration(event.target.getDuration());
              
              // Set initial volume
              event.target.setVolume(volume);

              // Start progress tracking
              if (progressInterval.current) clearInterval(progressInterval.current);
              progressInterval.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                  try {
                    setLocalProgress(playerRef.current.getCurrentTime());
                    setLocalDuration(playerRef.current.getDuration());
                  } catch(e) {}
                }
              }, 500);
            },
            onStateChange: (event) => {
              if (destroyed || ignoreStateChange.current) return;
              
              // YT.PlayerState: PLAYING=1, PAUSED=2, BUFFERING=3, ENDED=0
              if (event.data === 1) { // PLAYING
                if (isHost) {
                  onStateChange('playing');
                }
              } else if (event.data === 2) { // PAUSED
                if (isHost) {
                  onStateChange('paused');
                }
              }
            }
          }
        });
      }
    };

    videoIdRef.current = videoId;
    setPlayerReady(false);
    initPlayer();

    return () => {
      destroyed = true;
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
      }
    };
  }, [videoId]); // Reinitialize when video changes

  // Sync play/pause state from Firestore → YouTube player
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      const playerState = playerRef.current.getPlayerState();
      // YT states: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
      
      ignoreStateChange.current = true;
      
      if (appState === 'playing' && playerState !== 1 && playerState !== 3) {
        playerRef.current.playVideo();
      } else if (appState === 'paused' && playerState === 1) {
        playerRef.current.pauseVideo();
      }
      
      // Reset ignore flag after a short delay
      setTimeout(() => { ignoreStateChange.current = false; }, 500);
    } catch(e) {
      console.warn('Player sync error:', e);
    }
  }, [appState, playerReady]);

  // Sync volume
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      }
    } catch(e) {}
  }, [volume, isMuted, playerReady]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      // The `toggleFullscreen` prop is a function to toggle, not set.
      // We need to ensure the parent's `isFullscreen` state is updated.
      // Assuming `toggleFullscreen` from props handles the actual state update in parent.
      // If the user exits fullscreen via ESC, the parent's state needs to be notified.
      // The `toggleFullscreen` prop should ideally be `setIsFullscreen` or similar.
      // For now, we'll just call the prop's `toggleFullscreen` if the state is out of sync.
      // A better approach would be to pass `setIsFullscreen` as a prop.
      if (isFullscreen !== !!document.fullscreenElement) {
        // This means the fullscreen state changed externally (e.g., ESC key)
        // and our parent component's `isFullscreen` prop is now out of sync.
        // We need a way to tell the parent to update its state.
        // Since `toggleFullscreen` is the only prop related to fullscreen control,
        // we'll call it, assuming it will correctly update the parent's state.
        // This is a bit of a hack if `toggleFullscreen` only *toggles* and doesn't *set*.
        // A more robust solution would be to pass a `setFullscreenState` prop.
        toggleFullscreen(); // Call the prop to sync parent state
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isFullscreen, toggleFullscreen]);

  /* Auto-hide controls */
  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (appState === 'playing') {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [appState]);

  useEffect(() => {
    if (appState !== 'playing') setShowControls(true);
    else revealControls();
    return () => clearTimeout(hideTimer.current);
  }, [appState, revealControls]);

  /* Progress bar */
  const handleSeekMouseDown = () => setIsSeeking(true);
  const handleSeekChange = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setLocalProgress(ratio * localDuration);
  };
  const handleSeekMouseUp = (e) => {
    setIsSeeking(false);
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekSeconds = ratio * localDuration;
    
    // Seek the YouTube player directly
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seekSeconds, true);
    }
    onSeek(ratio);
  };

  /* Floating emojis */
  const addEmoji = (emoji, sender) => {
    if (!showReactions) return;
    const id = Date.now();
    const x = 10 + Math.random() * 80 + '%';
    const y = 80 + '%';
    setFloatingEmojis(prev => [...prev, { id, emoji, x, y, sender }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 3000);
  };
  if (window.__addFloatingEmoji !== addEmoji) window.__addFloatingEmoji = addEmoji;

  const toggleReactions = (e) => {
    e.stopPropagation();
    const newVal = !showReactions;
    setShowReactions(newVal);
    localStorage.setItem('watchpro_show_reactions', String(newVal));
  };

  const currentProgressRatio = localDuration > 0 ? localProgress / localDuration : 0;

  return (
    <div
      className="video-area"
      ref={videoRef}
      onMouseMove={revealControls}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#000'
      }}
    >
      {/* Video Container */}
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000',
        overflow: 'hidden'
      }}>

        {/* YT Player */}
        <div 
          ref={playerContainerRef} 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
        />

        {/* Ambient Glow behind video */}
        <AmbientGlow playerRef={playerRef} isMagnet={isTorrent} videoEl={html5Video} />

        {isTorrent && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <WebTorrentPlayer 
              url={url} 
              volume={volume} 
              isMuted={isMuted} 
              isHost={isHost}
              onReady={(videoEl) => {
                setHtml5Video(videoEl);
                setPlayerReady(true);
                // Create a unified adapter so the Sync Guardian can control the HTML5 <video> exactly like YouTube
                playerRef.current = {
                  getCurrentTime: () => videoEl.currentTime,
                  getDuration: () => videoEl.duration,
                  getPlayerState: () => videoEl.paused ? 2 : 1, // 1=playing, 2=paused
                  seekTo: (sec) => { videoEl.currentTime = sec; },
                  playVideo: () => { videoEl.play().catch(e=>console.log(e)); },
                  pauseVideo: () => { videoEl.pause(); },
                  mute: () => { videoEl.muted = true; },
                  unMute: () => { videoEl.muted = false; },
                  setVolume: (val) => { videoEl.volume = val / 100; }
                };
              }}
              onStateChange={onStateChange}
              onDurationUpdate={setLocalDuration}
              onProgressUpdate={(t) => {
                setLocalProgress(t);
              }}
            />
          </div>
        )}

        {/* Empty state when no video */}
        {!videoId && !isTorrent && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, color: 'var(--text-secondary)'
          }}>
            <div style={{
              width: 80, height: 80,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(14,165,233,0.15))',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem',
              border: '1px solid rgba(124,58,237,0.3)'
            }}>🎬</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              {isHost ? 'Paste a YouTube Link' : 'Waiting for host to pick a video'}
            </div>
            <div style={{ fontSize: '0.85rem', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
              {isHost 
                ? 'Use the search bar above to paste any YouTube video URL' 
                : 'The host will select a video for everyone to watch together'}
            </div>
          </div>
        )}

        {/* Floating emojis */}
        {floatingEmojis.map(e => <EmojiFloat key={e.id} {...e} />)}

        {/* Floating Controls (PiP + Reaction Settings) */}
        <div style={{
          zIndex: 25, position: 'absolute', top: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: showReactions ? 'rgba(0,0,0,0.5)' : 'rgba(239, 68, 68, 0.4)', color: '#fff',
            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
            backdropFilter: 'blur(8px)', border: showReactions ? 'none' : '1px solid #ef4444'
          }} onClick={toggleReactions} title="Toggle reactions visibility">
            {showReactions ? <Zap size={12} fill="currentColor" /> : <ZapOff size={12} />}
            {showReactions ? 'Vibe ACTIVE' : 'Vibe OFF'}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
            backdropFilter: 'blur(8px)'
          }} onClick={e => e.stopPropagation()}>
            <PictureInPicture2 size={12} /> PiP
          </div>
        </div>

        {/* Out of Sync banner */}
        {outOfSync && (
          <div className="oos-banner" onClick={e => e.stopPropagation()} style={{ zIndex: 30 }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span className="oos-text">You're out of sync with the host</span>
            <button className="resync-btn" onClick={onResync}>Resync</button>
          </div>
        )}

        {/* Custom Controls overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '24px', zIndex: 20
        }} onClick={() => {
          if (isHost) {
            onStateChange(appState === 'playing' ? 'paused' : 'playing');
          }
        }}>

          {/* Progress bar */}
          <div style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="progress-wrap">
              <span className="time-label">{formatTime(localProgress)}</span>
              <div
                ref={progressRef}
                className="progress-bar"
                onMouseDown={isHost ? handleSeekMouseDown : undefined}
                onMouseMove={(e) => isHost && isSeeking && handleSeekChange(e)}
                onMouseUp={isHost ? handleSeekMouseUp : undefined}
                onClick={isHost ? handleSeekMouseUp : undefined}
                style={{ cursor: isHost ? 'pointer' : 'default' }}
              >
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min(currentProgressRatio * 100 + 12, 100)}%`,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 'var(--radius-full)',
                }} />
                <div className="progress-fill" style={{ width: `${currentProgressRatio * 100}%` }}>
                  <div className="progress-thumb" />
                </div>
              </div>
              <span className="time-label">{formatTime(localDuration)}</span>
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, width: '100%' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="play-btn"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isHost) {
                      onStateChange(appState === 'playing' ? 'paused' : 'playing'); 
                    }
                  }}
                  style={{ opacity: isHost ? 1 : 0.5, cursor: isHost ? 'pointer' : 'not-allowed', width: 48, height: 48 }}
                >
                  {appState === 'playing' ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button className="icon-btn" style={{ padding: 0, width: 'auto', height: 'auto' }} onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
                    {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
                  </button>
                  <input
                    className="volume-slider" type="range" min={0} max={100}
                    value={isMuted ? 0 : volume}
                    onChange={e => { e.stopPropagation(); setVolume(+e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 80 }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                {!isHost && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 100 }}>
                    <span>👑</span> Host controls playback
                  </div>
                )}
                {isHost && (
                  <button
                    className={`follow-host-toggle ${followHost ? '' : 'off'}`}
                    onClick={(e) => { e.stopPropagation(); setFollowHost(!followHost); }}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    <RefreshCw size={14} />
                    {followHost ? 'Following Host' : 'Follow Host'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginRight: 70 }}>
                <button 
                  className="icon-btn" 
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    width: 44, height: 44, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {isFullscreen ? <Minimize2 size={22} strokeWidth={2.5} /> : <Maximize2 size={22} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
