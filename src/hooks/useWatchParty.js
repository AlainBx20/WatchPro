import { useState, useEffect, useRef, useCallback } from 'react';

export function useVideoSimulator(appState) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(2847); // 47:27
  const intervalRef = useRef(null);

  useEffect(() => {
    if (appState === 'playing') {
      intervalRef.current = setInterval(() => {
        setCurrentTime(t => Math.min(t + 1, duration));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [appState, duration]);

  const seek = useCallback((ratio) => {
    setCurrentTime(Math.floor(ratio * duration));
  }, [duration]);

  return { currentTime, duration, seek };
}

export function useAudioLevels(isSpeaking) {
  const [levels, setLevels] = useState([2, 6, 3, 8, 4]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isSpeaking) {
      intervalRef.current = setInterval(() => {
        setLevels([
          Math.random() * 14 + 2,
          Math.random() * 14 + 2,
          Math.random() * 14 + 2,
          Math.random() * 14 + 2,
          Math.random() * 14 + 2,
        ]);
      }, 120);
    } else {
      clearInterval(intervalRef.current);
      setLevels([2, 2, 2, 2, 2]);
    }
    return () => clearInterval(intervalRef.current);
  }, [isSpeaking]);

  return levels;
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, addToast };
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
