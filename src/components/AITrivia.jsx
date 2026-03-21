import { useState, useEffect } from 'react';
import { generateVideoTrivia } from '../services/gemini';
import { Loader } from 'lucide-react';

export default function AITrivia({ videoContext }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  useEffect(() => {
    async function load() {
      if (!videoContext) return;
      setLoading(true);
      try {
        const q = await generateVideoTrivia(videoContext);
        setQuestions(q);
      } catch(e) {}
      setLoading(false);
    }
    load();
  }, [videoContext]);

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      <Loader className="rotate" size={20} style={{ margin: '0 auto 10px' }}/>
      Generating Trivia from Video...
    </div>
  );

  if (!questions || questions.length === 0) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Could not parse trivia for this video.
    </div>
  );

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  if (isFinished) return (
    <div style={{ padding: 20, textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
      <h3>Trivia Completed! 🎉</h3>
      <button className="btn-primary" onClick={() => { setCurrentIndex(0); setSelected(null); }} style={{ marginTop: 10 }}>Play Again</button>
    </div>
  );

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    setTimeout(() => {
      setSelected(null);
      setCurrentIndex(i => i + 1);
    }, 4500); // Wait 4.5s to read fun fact before moving
  };

  const isCorrect = selected === currentQ.correctIndex;

  return (
    <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800, marginBottom: 8 }}>
        WatchPro Trivia • {currentIndex + 1} / {questions.length}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>
        {currentQ.question}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentQ.options.map((opt, i) => {
          let bg = 'rgba(255,255,255,0.05)';
          let border = '1px solid var(--border)';
          if (selected !== null) {
            if (i === currentQ.correctIndex) { bg = 'rgba(16,185,129,0.2)'; border = '1px solid #10b981'; } 
            else if (selected === i) { bg = 'rgba(239,68,68,0.2)'; border = '1px solid #ef4444'; }
          }
          return (
            <button 
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                background: bg, border: border, padding: '10px 14px', borderRadius: 8,
                color: '#fff', textAlign: 'left', fontSize: '0.85rem', transition: 'all 0.2s',
                cursor: selected === null ? 'pointer' : 'default', opacity: (selected !== null && i !== currentQ.correctIndex && selected !== i) ? 0.4 : 1
              }}
            >
              <span style={{ opacity: 0.6, marginRight: 8, fontWeight: 600 }}>{['A','B','C','D'][i]}</span> {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="animate-fadeIn" style={{ marginTop: 16, padding: 12, borderRadius: 8, background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderLeft: `3px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isCorrect ? '#34d399' : '#f87171' }}>
            {isCorrect ? 'Correct! 🎉' : 'Oof, that was wrong. 🫠'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            <strong>Fun Fact:</strong> {currentQ.funFact}
          </div>
        </div>
      )}
    </div>
  );
}
