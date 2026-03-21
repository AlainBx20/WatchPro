import { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Headset, VolumeX } from 'lucide-react';
import { useAudioLevels } from '../hooks/useWatchParty';
import { rtdb } from '../services/firebase';
import { ref, update } from 'firebase/database';

export default function VoiceControls({ roomId, uid, onStart, onStop, isCapturing }) {
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [isHoveringPtt, setIsHoveringPtt] = useState(false);

  // Trigger real hardware cap when buttons toggled
  const handleToggleMic = async () => {
    const nextMic = !micOn;
    setMicOn(nextMic);
    if (nextMic || videoOn) {
      await onStart(videoOn, nextMic);
    } else if (!nextMic && !videoOn) {
      onStop();
    }
  };

  const handleToggleVideo = async () => {
    const nextVideo = !videoOn;
    setVideoOn(nextVideo);
    if (nextVideo || micOn) {
      await onStart(nextVideo, micOn);
    } else if (!nextVideo && !micOn) {
      onStop();
    }
  };

  // Sync media intent up strictly for Presence so remote avatars can render mic state
  useEffect(() => {
    if(!roomId || !uid) return;
    try {
      update(ref(rtdb, `presence/${roomId}/${uid}`), {
        'media/micOn': micOn,
        'media/camOn': videoOn,
        'media/isSpeaking': (micOn || isHoveringPtt) && !deafened
      });
    } catch(err) { console.error("Could not sync media intent", err) }
  }, [roomId, uid, micOn, videoOn, isHoveringPtt, deafened]);

  const isSpeaking = (micOn || isHoveringPtt) && !deafened;
  const levels = useAudioLevels(isSpeaking);

  return (
    <div className="voice-controls">
      <button
        className={`voice-btn ${micOn ? 'active' : 'danger'}`}
        onClick={handleToggleMic}
        title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      <button
        className={`voice-btn ${videoOn ? 'active' : 'danger'}`}
        onClick={handleToggleVideo}
        title={videoOn ? 'Stop Video' : 'Start Video'}
      >
        {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      <button
        className={`voice-btn ${deafened ? 'danger' : ''}`}
        style={{ color: deafened ? 'var(--danger)' : 'var(--text-primary)' }}
        onClick={() => setDeafened(!deafened)}
        title={deafened ? 'Undeafen' : 'Deafen'}
      >
        {deafened ? <VolumeX size={20} /> : <Headset size={20} />}
      </button>

      <div className="divider-v" />

      {/* Push to talk / Audio level indicator */}
      <button
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        className={`voice-btn ptt ${isSpeaking ? 'active' : ''}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setIsHoveringPtt(true); }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setIsHoveringPtt(false); }}
        onPointerLeave={() => setIsHoveringPtt(false)}
        onTouchStart={(e) => { e.preventDefault(); setIsHoveringPtt(true); }}
        onTouchEnd={(e) => { e.preventDefault(); setIsHoveringPtt(false); }}
        onTouchCancel={() => setIsHoveringPtt(false)}
        onContextMenu={(e) => e.preventDefault()}
        title="Push to Talk"
      >
        {isSpeaking ? (
          <div className="audio-indicator">
            {levels.map((h, i) => (
              <div key={i} className="audio-bar" style={{ height: h, background: '#fff' }} />
            ))}
          </div>
        ) : 'Hold to Speak'}
      </button>
    </div>
  );
}
