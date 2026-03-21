import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Bot, Clock, PlayCircle, MessageCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateSmartReplies } from '../services/gemini';
import EmojiShelf from './EmojiShelf';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '🔥', '👏', '😭', '🤯', '💯'];

// Local chat history for when Firestore is in sandbox mode
const LOCAL_HISTORY = [
  { id: 'h1', title: 'Lo-fi Hip Hop Radio', emoji: '🎵', meta: 'Watched 2h ago · 3 participants', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: 'h2', title: 'Nature Documentary', emoji: '🌍', meta: 'Watched yesterday · 5 participants', url: 'https://www.youtube.com/watch?v=BHACKCNDMW8' },
  { id: 'h3', title: 'Epic Music Mix', emoji: '🎶', meta: 'Watched 3 days ago · 2 participants', url: 'https://www.youtube.com/watch?v=hHW1oY26kxQ' },
];

export default function ChatPanel({ activeTab, setActiveTab, roomId, currentUser, firestoreMessages, localProfile, onReaction }) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  // Combine Firestore messages with local messages, filtering out duplicates
  const allMessages = [...(firestoreMessages || [])];
  localMessages.forEach(localMsg => {
    const isDuplicate = allMessages.some(firestoreMsg => 
      firestoreMsg.userId === localMsg.userId && firestoreMsg.text === localMsg.text
    );
    if (!isDuplicate) {
      allMessages.push(localMsg);
    }
  });

  allMessages.sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
    return timeA - timeB;
  });

  const [smartReplies, setSmartReplies] = useState(['Wow', 'No way!', 'Haha exactly']);

  // Fetch AI Smart Replies based on recent chat
  useEffect(() => {
    let active = true;
    const fetchReplies = async () => {
      if (allMessages.length > 0) {
        try {
          const replies = await generateSmartReplies(allMessages.slice(-5));
          if (active && replies?.length) setSmartReplies(replies);
        } catch(e) {}
      }
    };
    
    // Only run every ~45 seconds to not hit quota limits for something small
    const timer = setInterval(fetchReplies, 45000);
    fetchReplies();
    
    return () => { active = false; clearInterval(timer); };
  }, [allMessages.length]); // Dependency triggers when new messages arrive

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUser) return;

    const text = input.trim();
    setInput('');

    const senderName = localProfile?.name || currentUser.displayName || 'Guest';
    const senderColor = localProfile?.color || '#7c3aed';
    const senderInitials = senderName.slice(0, 2).toUpperCase();

    const newMsg = {
      id: `local-${Date.now()}`,
      userId: currentUser.uid,
      name: senderName,
      color: senderColor,
      initials: senderInitials,
      text: text,
      createdAt: new Date(),
      isAI: false
    };

    // Always add to local messages immediately (optimistic)
    setLocalMessages(prev => [...prev, newMsg]);

    // Try to send to Firestore (will silently fail in sandbox mode)
    try {
      await addDoc(collection(db, "rooms", roomId, "chatMessages"), {
        userId: currentUser.uid,
        name: senderName,
        color: senderColor,
        initials: senderInitials,
        text: text,
        createdAt: serverTimestamp(),
        isAI: false
      });
    } catch(err) {
      // Silent - message already shown locally
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = async (emoji) => {
    onReaction?.(emoji);

    if(!currentUser || !roomId) return;

    const senderName = localProfile?.name || currentUser.displayName || 'Guest';
    const senderColor = localProfile?.color || '#7c3aed';
    const senderInitials = senderName.slice(0, 2).toUpperCase();

    // Add locally
    setLocalMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      userId: currentUser.uid,
      name: senderName,
      color: senderColor,
      initials: senderInitials,
      text: emoji,
      createdAt: new Date(),
      isAI: false
    }]);

    try {
      await addDoc(collection(db, "rooms", roomId, "chatMessages"), {
        userId: currentUser.uid,
        name: senderName,
        color: senderColor,
        initials: senderInitials,
        text: emoji,
        createdAt: serverTimestamp(),
        isAI: false
      });
    } catch(err) { /* silent */ }
  };

  // Safe mapping of messages
  const safeMessages = allMessages.map(msg => ({
    ...msg,
    time: msg.createdAt?.toDate
      ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : msg.createdAt instanceof Date
        ? msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Now',
    isSelf: msg.userId === currentUser?.uid
  }));

  return (
    <aside className="right-sidebar">
      <div className="sidebar-tabs">
        {['Chat', 'History'].map(tab => (
          <button
            key={tab}
            className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {tab === 'Chat' ? <MessageCircle size={13} /> : <Clock size={13} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Chat' && (
        <div className="chat-panel">
          <div className="ai-suggestions" style={{ opacity: 0.8, filter: 'saturate(0.5)' }}>
            <span style={{ fontSize: '0.65rem', marginRight: 4, letterSpacing: '0.5px' }}>✨ SMART REPLY</span>
            {smartReplies.map(chip => (
              <button key={chip} className="ai-suggestion-chip" onClick={() => setInput(chip)}>{chip}</button>
            ))}
          </div>

          <div className="messages-area">
            {safeMessages.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', flex: 1, gap: 12, padding: 40,
                color: 'var(--text-muted)', textAlign: 'center'
              }}>
                <MessageCircle size={32} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No messages yet</div>
                <div style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                  Be the first to say something! Use reactions or type a message below.
                </div>
              </div>
            )}

            {safeMessages.map((msg, i) => (
              <div key={msg.id || i} className={`${msg.isSelf ? 'message-self' : ''}`}>
                {msg.isAI ? (
                  <div className="ai-message">
                    <div className="ai-label">
                      <Bot size={11} /> WatchPro AI
                    </div>
                    <div className="ai-text">{msg.text}</div>
                  </div>
                ) : (
                  <div className="message-item">
                    <div className="message-avatar" style={{ background: `linear-gradient(135deg, ${msg.color}cc, ${msg.color}66)` }}>
                      {msg.initials}
                    </div>
                    <div className="message-body">
                      <div className="message-header">
                        <span className="message-name" style={{ color: msg.color }}>{msg.name}</span>
                        <span className="message-time">{msg.time}</span>
                      </div>
                      {msg.text.length <= 2 ? (
                        /* Single emoji reaction - display large */
                        <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{msg.text}</div>
                      ) : (
                        <div className="message-text">{msg.text}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="quick-reactions">
            {QUICK_REACTIONS.map(e => (
              <button key={e} className="reaction-btn" onClick={() => handleReaction(e)}>{e}</button>
            ))}
          </div>

          <div className="chat-input-area">
            <div className="chat-input-wrap">
              <textarea
                className="chat-input"
                placeholder="Message the room…"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 4 }}>
              <button 
                className="icon-btn"
                onClick={async () => {
                  const aiMsg = { id: `ai-${Date.now()}`, isAI: true, text: "Summoning AI for a room summary...", createdAt: new Date() };
                  setLocalMessages(prev => [...prev, aiMsg]);
                  // Real summarize logic would go here
                  setTimeout(() => {
                    setLocalMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, text: "I've been monitoring the room! Everyone seems to be enjoying the P2P stream. Should I recommend some similar movies?"} : m));
                  }, 2000);
                }}
                title="WatchPro AI"
                style={{ color: 'var(--accent-bright)' }}
              >
                <Bot size={18} />
              </button>
              
              <button 
                className={`icon-btn ${showEmojiPicker ? 'active' : ''}`} 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ color: showEmojiPicker ? 'var(--accent-bright)' : 'inherit' }}
                title="Emoji"
              >
                <Smile size={18} />
              </button>
              {showEmojiPicker && (
                <EmojiShelf 
                  onSelect={(emoji) => {
                    setInput(prev => prev + emoji);
                    if (!input.trim()) handleReaction(emoji);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <button className="send-btn" onClick={handleSend} title="Send">
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'History' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Recent Sessions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LOCAL_HISTORY.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-glass)'; }}
              >
                <div style={{
                  width: 44, height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-2-soft))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', flexShrink: 0
                }}>
                  {item.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{item.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.meta}</div>
                </div>
                <PlayCircle size={18} style={{ color: 'var(--accent-bright)', flexShrink: 0, opacity: 0.7 }} />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 24, padding: 16,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(14,165,233,0.08))',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>✨ Session Recap</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              AI-generated summaries of your watch sessions will appear here
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
