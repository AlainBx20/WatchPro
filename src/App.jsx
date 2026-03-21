import { useState, useRef, useEffect } from 'react';
import './App.css';

import { useToasts } from './hooks/useWatchParty';
import { useFirebaseRoom, useFirebasePresence, useFirebaseReactions } from './hooks/useFirebaseSync';
import { useMediaRTC } from './hooks/useMediaRTC';
import { db, auth } from './services/firebase';
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import TopBar from './components/TopBar';
import ParticipantsPanel from './components/ParticipantsPanel';
import VideoArea from './components/VideoArea';
import VoiceControls from './components/VoiceControls';
import ChatPanel from './components/ChatPanel';
import AIAssistant from './components/AIAssistant';
import SettingsModal from './components/SettingsModal';
import SessionRecapModal from './components/SessionRecapModal';
import Lobby from './components/Lobby';

import { useAIAgent } from './hooks/useAIAgent';
import { BrowserRouter, Routes, Route, useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';


const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];
const PRESET_AVATARS = [
  'api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'api.dicebear.com/7.x/avataaars/svg?seed=Chester',
  'api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
  'api.dicebear.com/7.x/avataaars/svg?seed=Casper',
  'api.dicebear.com/7.x/avataaars/svg?seed=Sassy',
  'api.dicebear.com/7.x/avataaars/svg?seed=Coco',
  'api.dicebear.com/7.x/avataaars/svg?seed=Shadow'
];

// Setup Onboarding screen
function OnboardingScreen({ onComplete, initialName = '', initialAvatar = '', initialColor = '' }) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar || PRESET_AVATARS[0]);
  const [color, setColor] = useState(initialColor || AVATAR_COLORS[3]);
  const [customAvatar, setCustomAvatar] = useState('');
  const [isUsingCustom, setIsUsingCustom] = useState(!!initialAvatar && !PRESET_AVATARS.some(a => initialAvatar.includes(a)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ 
        name: name.trim(), 
        avatar: isUsingCustom && customAvatar ? customAvatar : `https://${avatar}`, 
        color 
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatar(reader.result);
        setIsUsingCustom(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)' }}>
      <div className="modal-content animate-slideUp" style={{ maxWidth: 440, width: '90%', padding: '40px', borderRadius: '32px', background: 'rgba(22, 22, 31, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: 20 }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: '50%', 
              background: `linear-gradient(135deg, ${color}, ${color}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 10px 30px ${color}44`,
              border: '4px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src={isUsingCustom && customAvatar ? customAvatar : `https://${avatar}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Welcome to <span className="gradient-text">WatchPro</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>Setup your identity to join the party</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Display Name</label>
            <input 
              autoFocus
              className="settings-select" 
              style={{ width: '100%', padding: '16px 20px', fontSize: '1.1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Enter your name..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
              maxLength={16}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Choose Avatar</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {PRESET_AVATARS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAvatar(a); setIsUsingCustom(false); }}
                  style={{
                    padding: 8, borderRadius: '12px', background: !isUsingCustom && avatar === a ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${!isUsingCustom && avatar === a ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.2s', cursor: 'pointer'
                  }}
                >
                  <img src={`https://${a}`} alt="preset" style={{ width: '100%', borderRadius: '8px' }} />
                </button>
              ))}
            </div>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="avatar-upload"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '12px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)',
                  background: isUsingCustom ? 'rgba(124,58,237,0.1)' : 'transparent',
                  cursor: 'pointer', fontSize: '0.85rem', color: isUsingCustom ? 'var(--accent-bright)' : 'var(--text-muted)'
                }}
              >
                {isUsingCustom ? '✨ Custom Avatar Uploaded' : '➕ Upload Custom Image'}
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Theme Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: `3px solid ${color === c ? '#fff' : 'transparent'}`,
                    boxShadow: color === c ? `0 0 15px ${c}` : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="primary-btn" style={{ width: '100%', padding: '18px', justifyContent: 'center', fontSize: '1.2rem', borderRadius: '18px' }} disabled={!name.trim()}>
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}


function WatchRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoomName = location.state?.roomName || "WatchPro Lobby";

  // Real Firebase Auth - sign in anonymously
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Sign in anonymously on mount
  useEffect(() => {
    const doAuth = async () => {
      try {
        const result = await signInAnonymously(auth);
        console.log("✅ Firebase Auth: Signed in as", result.user.uid);
        setUser(result.user);

        // Try to fetch existing profile from Firestore
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        if (userDoc.exists()) {
          console.log("👤 Profile found in Firestore");
          setProfile(userDoc.data());
        } else {
          // Check localStorage as fallback
          const localProfile = localStorage.getItem('watchpro_profile');
          if (localProfile) {
            setProfile(JSON.parse(localProfile));
          }
        }
      } catch (err) {
        console.warn("⚠️ Firebase Auth failed, using local fallback:", err.message);
        setUser({ uid: `local-${Math.floor(Math.random()*10000)}`, displayName: 'Guest' });
      }
      setAuthReady(true);
      setProfileLoading(false);
    };
    doAuth();
  }, []);

  const handleProfileComplete = async (newProfile) => {
    setProfile(newProfile);
    // Persist to LocalStorage
    localStorage.setItem('watchpro_profile', JSON.stringify(newProfile));
    // Persist to Firestore
    if (user && user.uid) {
      try {
        await setDoc(doc(db, "users", user.uid), newProfile);
        console.log("💾 Profile saved to Firestore");
      } catch(e) { console.error("Could not save profile", e); }
    }
  };

  // Firebase hooks
  const { roomData, messages, aiSummaries, setRoomData, isSandbox } = useFirebaseRoom(roomId, initialRoomName);
  const { presenceData } = useFirebasePresence(roomId, user, profile);
  
  const { sendReaction } = useFirebaseReactions(roomId, (emoji, sender) => {
    if (window.__addFloatingEmoji) window.__addFloatingEmoji(emoji, sender);
  });

  // Real-time P2P Voice/Video Mesh
  const { 
    localStream, remoteStreams, startCapture, stopCapture, isCapturing 
  } = useMediaRTC(roomId, user?.uid, profile?.name);

  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Chat');
  
  const [volume, setVolume] = useState(70);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [followHost, setFollowHost] = useState(true);
  const [outOfSync, setOutOfSync] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  const videoRef = useRef(null);
  const { toasts, addToast } = useToasts();

  const activeVideoUrl = roomData?.mediaMetadata?.sourceUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const isPlaying = roomData?.playbackState?.isPlaying ?? false;
  const appState = isPlaying ? 'playing' : 'paused';

  // Determine if the current user is the host
  const isHost = roomData?.hostId === user?.uid;

  // AI Agent (Only runs if `isHost`, prevents duplicates. Also monitors AFK)
  useAIAgent(
    roomId, 
    isHost,
    messages, 
    activeVideoUrl,
    () => handleStateChange('paused') // AFK pause callback
  );

  // Claim host role if the room doesn't have a real host yet
  useEffect(() => {
    if (!roomData || !user || !profile || isSandbox) return;
    const hostId = roomData.hostId;
    if (!hostId || hostId === 'system') {
      console.log('👑 Claiming host role for:', user.uid);
      updateDoc(doc(db, "rooms", roomId), {
        hostId: user.uid
      }).then(() => console.log('✅ Host claimed'))
        .catch(err => console.warn('Host claim failed:', err.message));
    }
  }, [roomData?.hostId, user, profile, isSandbox]);
  
  const handleStateChange = async (newState) => {
    if (!roomData) return;
    
    // Optimistic
    setRoomData(prev => ({
      ...prev,
      playbackState: { ...prev.playbackState, isPlaying: newState === 'playing' }
    }));

    if (!isSandbox) {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          "playbackState.isPlaying": newState === 'playing',
          "playbackState.lastUpdatedAt": serverTimestamp(),
          "playbackState.updatedBy": user?.uid
        });
      } catch(err) { console.warn("State update failed:", err.message); }
    }
  };

  const handleSeek = async (ratio) => {
    if (!roomData) return;
    const seekTime = ratio * (roomData.mediaMetadata?.duration || 300);
    
    if (followHost) { setFollowHost(false); setOutOfSync(true); }
    setRoomData(prev => ({
      ...prev,
      playbackState: { ...prev.playbackState, timestamp: seekTime }
    }));

    if (!isSandbox) {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          "playbackState.timestamp": seekTime,
          "playbackState.updatedBy": user?.uid,
          "playbackState.lastUpdatedAt": serverTimestamp()
        });
      } catch(err) { console.warn("Seek update failed:", err.message); }
    }
  };

  const handleTimeReport = async (time, duration) => {
    // We only update Firestore, avoiding local setRoomData to prevent stuttering re-renders for the host
    if (!isSandbox && isHost) {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          "playbackState.timestamp": time,
          "mediaMetadata.duration": duration,
          "playbackState.updatedBy": user?.uid
        });
      } catch(err) { /* silent */ }
    }
  };

  const handleUrlChange = async (newUrl) => {
    if (!roomData) return;
    if (!isHost) {
      addToast({ type: 'warning', icon: '🔒', title: 'Host Only', sub: 'Only the host can change the video' });
      return;
    }
    
    console.log("🎬 Switching video to:", newUrl);
    
    // Optimistic local update
    setRoomData(prev => ({
      ...prev,
      mediaMetadata: { ...prev.mediaMetadata, sourceUrl: newUrl },
      playbackState: { isPlaying: true, timestamp: 0 }
    }));

    // Sync to Firestore so other users get it
    if (!isSandbox) {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          "mediaMetadata.sourceUrl": newUrl,
          "playbackState.timestamp": 0,
          "playbackState.isPlaying": true,
          "playbackState.lastUpdatedAt": serverTimestamp()
        });
        console.log("✅ Video URL synced to Firestore");
      } catch(err) { console.warn("URL sync failed:", err.message); }
    }
  };

  const handleResync = () => {
    setOutOfSync(false);
    setFollowHost(true);
    addToast({ type: 'sync', icon: '⚡', title: 'Resynced', sub: 'You are back in sync with the host' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (aiSummaries.length > 0) {
       addToast({ type: 'info', icon: '✨', title: 'AI Recap Added', sub: 'New summary parsed' });
    }
  }, [aiSummaries, addToast]);


  // Auth loading
  if (!authReady || profileLoading) {
    return (
       <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center', background: '#000' }}>
         <div className="loader-ring" />
         <div style={{ marginTop: 20, color: '#fff', fontSize: '0.9rem' }}>Authenticating...</div>
       </div>
    );
  }

  // Room data loading
  if (!roomData) {
    return (
       <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center', background: '#000' }}>
         <div className="loader-ring" />
         <div style={{ marginTop: 20, color: '#fff', fontSize: '0.9rem' }}>Connecting to WatchPro Session...</div>
       </div>
    );
  }

  // Onboarding gate
  if (!profile) {
    return (
      <OnboardingScreen 
        onComplete={handleProfileComplete} 
        initialName={user?.displayName || ''} 
      />
    );
  }

  // Parse mapped presence
  const participantsList = Object.keys(presenceData || {}).map(uid => {
     const pData = presenceData[uid];
     const pName = pData.profile?.name || "Guest";
     const pColor = pData.profile?.color || "#0ea5e9";
     const pAvatar = pData.profile?.avatar || null;
     
     return {
       id: uid, 
       ...pData, 
       name: uid === user?.uid ? pName + ' (You)' : pName, 
       initials: pName.slice(0, 2).toUpperCase(), 
       color: pColor,
       avatar: pAvatar,
       isHost: uid === roomData?.hostId
     };
  });

  const onlineCount = participantsList.filter(p => p.status === 'online').length;

  return (
    <div className="app-shell animate-fadeIn">
      <TopBar 
        appState={appState}
        panelOpen={panelOpen} setPanelOpen={setPanelOpen}
        outOfSync={outOfSync}
        onOpenSettings={() => setShowSettings(true)}
        onOpenRecap={() => setShowRecap(true)}
        addToast={addToast}
        latency="low"
        roomName={roomData.name}
        onUrlChange={handleUrlChange}
        onlineCount={onlineCount}
        isHost={isHost}
        chatMessages={messages}
        onLeaveRoom={() => {
          // Optional: You could update presence to 'offline' here if needed before routing
          navigate('/');
        }}
      />

      <div className="main-layout">
        <ParticipantsPanel 
          participants={participantsList} 
          collapsed={!panelOpen} 
          onlineCount={onlineCount}
          remoteStreams={remoteStreams}
          localStream={localStream}
        />
        
        {/* Center column: video + voice controls */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <VideoArea 
                url={activeVideoUrl} 
                appState={appState} 
                onStateChange={handleStateChange}
                currentTime={roomData?.playbackState?.timestamp || 0} 
                duration={roomData?.mediaMetadata?.duration || 0} 
                onSeek={handleSeek}
                onTimeReport={handleTimeReport}
                volume={volume} setVolume={setVolume}
                isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
                followHost={followHost} setFollowHost={setFollowHost}
                outOfSync={outOfSync} onResync={handleResync}
                videoRef={videoRef}
                isHost={isHost}
              />
            </div>
          </div>

          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <VoiceControls 
              roomId={roomId} uid={user?.uid}
              isCapturing={isCapturing}
              onStart={startCapture}
              onStop={stopCapture}
            />
          </div>
          
        </div>

        <ChatPanel 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          roomId={roomId} 
          currentUser={user} 
          firestoreMessages={messages} 
          localProfile={profile} 
          onReaction={(emoji) => sendReaction(emoji, profile?.name || user?.displayName || 'Guest')}
        />
      </div>

      <AIAssistant summaries={aiSummaries} chatMessages={messages} videoContext={activeVideoUrl} />

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-line" />
            <div className="toast-icon">{t.icon}</div>
            <div className="toast-message">
              <div className="toast-title">{t.title}</div>
              {t.sub && <div className="toast-sub">{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showRecap && <SessionRecapModal chatMessages={messages} videoContext={activeVideoUrl} onClose={() => setShowRecap(false)} />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/r/:roomId" element={<WatchRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
