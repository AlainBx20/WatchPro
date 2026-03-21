import { useState, useEffect } from 'react';
import { AI_PROMPTS } from '../data/mockData';
import { generateChatResponse } from '../services/gemini';
import AITrivia from './AITrivia';

export default function AIAssistant({ summaries = [], chatMessages = [], videoContext = '' }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);

  // When a new summary comes in from Firestore, update the AI UI and open it
  useEffect(() => {
    if (summaries.length > 0) {
      setResponse(summaries[0].content);
      setLoading(false);
      setOpen(true);
    }
  }, [summaries]);

  const handlePrompt = async (promptLabel) => {
    setLoading(true);
    setResponse(null);
    
    try {
      // Map chat messages into a digestible format
      const history = chatMessages.slice(0, 15).reverse().map(m => ({
        time: (m.createdAt?.toDate ? m.createdAt.toDate() : new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: m.userName || 'Unknown',
        text: m.text
      }));

      const reply = await generateChatResponse(promptLabel, history, videoContext);
      setResponse(reply);
    } catch (err) {
      console.error(err);
      setResponse(err.message || "Failed to contact Gemini AI. Check your API key in Settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen(o => !o)} title="AI Assistant">
        ✨
      </button>

      {open && (
        <div className="ai-drawer">
          <div className="ai-drawer-header">
            <div className="ai-avatar">✨</div>
            <div className="ai-header-info">
              <div className="ai-header-name gradient-text">WatchPro AI</div>
              <div className="ai-header-status">● Active · Scene aware</div>
            </div>
            
            <button 
              className="icon-btn" 
              onClick={() => setShowTrivia(!showTrivia)}
              style={{ padding: '4px 8px', fontSize: '0.75rem', background: showTrivia ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8 }}
            >
              🎮 Trivia!
            </button>

            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              style={{ width: 28, height: 28 }}
            >✕</button>
          </div>
          
          {showTrivia ? (
            <div style={{ padding: 16 }}>
              <AITrivia videoContext={videoContext} />
            </div>
          ) : (
            <>
              <div className="ai-response-area">
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <div className="loader-ring" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Thinking…
                  </div>
                ) : response ? (
                  <div className="ai-response-text animate-fadeIn">{response}</div>
                ) : (
                  <div className="ai-response-text" style={{ color: 'var(--text-muted)' }}>
                    Hi! I'm watching with you. Ask me anything about what's happening in the show.
                  </div>
                )}
              </div>

              <div className="ai-actions">
                {AI_PROMPTS.map(p => (
                  <button
                    key={p.label}
                    className="ai-action-btn"
                    onClick={() => handlePrompt(p.label)}
                  >
                    <span className="ai-action-icon">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
