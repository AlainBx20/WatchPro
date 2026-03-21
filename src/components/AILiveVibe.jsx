import { useState, useEffect } from 'react';
import { generateRoomVibe } from '../services/gemini';
import { Sparkles } from 'lucide-react';

export default function AILiveVibe({ chatMessages }) {
  const [vibe, setVibe] = useState({ emoji: '✨', label: 'Analyzing', sub: 'Reading the room...' });

  useEffect(() => {
    let active = true;
    
    // Only analyze if there's chat history and update every 30 seconds
    const analyze = async () => {
      if (chatMessages && chatMessages.length > 0) {
        // Take the last 15 messages for vibe analysis
        const recent = chatMessages.slice(0, 15).map(m => ({ text: m.text }));
        try {
          const newVibe = await generateRoomVibe(recent);
          if (active && newVibe && newVibe.label) {
            setVibe(newVibe);
          }
        } catch(e) { }
      }
    };

    analyze();
    const interval = setInterval(analyze, 30000); // Check every 30s
    return () => { active = false; clearInterval(interval); };
  }, [chatMessages]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px', borderRadius: 20,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      cursor: 'default',
      transition: 'all 0.3s ease',
      animation: 'pulseGlow 4s infinite alternate'
    }} title="Real-time Room Vibe analyzed by WatchPro AI">
      
      <div style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
        {vibe.emoji}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 4 }}>
          {vibe.label} <Sparkles size={10} color="var(--accent-bright)" />
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1 }}>
          {vibe.sub}
        </div>
      </div>
      
      <style>{`
        @keyframes pulseGlow {
          0% { border-color: rgba(124,58,237,0.1); box-shadow: 0 0 0 rgba(124,58,237,0); }
          100% { border-color: rgba(124,58,237,0.3); box-shadow: 0 0 12px rgba(124,58,237,0.15); }
        }
      `}</style>
    </div>
  );
}
