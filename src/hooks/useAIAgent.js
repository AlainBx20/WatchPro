import { useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getGeminiClient } from '../services/gemini';

// Only ONE ai agent instance should reply to prevent spam.
// We'll elect the "host" as the one whose browser runs the AI agent.

export function useAIAgent(roomId, isHost, chatMessages, videoContext, pauseVideo) {
  const lastMessageCount = useRef(0);
  const afkTimer = useRef(null);
  const isTypingRef = useRef(false);

  // AFK Monitor (Active for all users individually)
  useEffect(() => {
    const resetAfk = () => {
      clearTimeout(afkTimer.current);
      afkTimer.current = setTimeout(() => {
        // If AFK for 2 minutes, show an alert and optionally pause
        if (isHost && pauseVideo) {
          pauseVideo();
          sendSystemMessage("WatchPro AI: I noticed you've been away. I've paused the video for you.");
        }
      }, 120 * 1000); // 2 minutes
    };

    window.addEventListener('mousemove', resetAfk);
    window.addEventListener('keydown', resetAfk);
    resetAfk();

    return () => {
      window.removeEventListener('mousemove', resetAfk);
      window.removeEventListener('keydown', resetAfk);
      clearTimeout(afkTimer.current);
    };
  }, [isHost, pauseVideo]);

  // AI Chat Participant (Only Host runs this to prevent message duplication)
  useEffect(() => {
    if (!isHost || !roomId) return;
    
    // Only react to NEW messages
    if (chatMessages.length > lastMessageCount.current && lastMessageCount.current !== 0) {
      const latestMsg = chatMessages[0]; // because array is reversed
      
      // Auto-reply logic: Reply to mentions or purely randomly (20% chance)
      const isMention = latestMsg.text.toLowerCase().includes('@ai') || latestMsg.text.toLowerCase().includes('watchpro');
      const isRandomHit = Math.random() < 0.20;

      // Don't reply to ourselves
      if (latestMsg.userId !== 'system-ai' && (isMention || isRandomHit) && !isTypingRef.current) {
        generateAndSendReply(latestMsg.text, chatMessages, videoContext, roomId);
      }
    }
    
    lastMessageCount.current = chatMessages.length;
  }, [chatMessages, isHost, roomId, videoContext]);

  const sendSystemMessage = async (text) => {
    try {
      await addDoc(collection(db, "rooms", roomId, "chatMessages"), {
        text,
        userId: "system-ai",
        userName: "WatchPro AI ✨",
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.warn("AI failed to send message"); }
  };

  const generateAndSendReply = async (triggerText, history, vContext, rid) => {
    isTypingRef.current = true;
    try {
      const ai = getGeminiClient();
      
      // Give the AI some persona context
      const prompt = `You are a real-time AI participant in a movie watch-party platform called WatchPro.
Current Video: ${vContext}

Recent Chat:
${history.slice(0, 5).reverse().map(m => `[${m.userName}]: ${m.text}`).join('\n')}

The user just said: "${triggerText}".
Act like a fun, slightly witty friend watching the video with them. 
Keep your response to ONE short sentence so it looks like a natural chat message. Do not use quotes around your response.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      const replyText = response.text.trim();
      
      // Add artificial typing delay so it feels natural
      setTimeout(() => {
        sendSystemMessage(replyText);
        isTypingRef.current = false;
      }, 1500 + Math.random() * 2000);

    } catch(err) {
      isTypingRef.current = false;
    }
  };
}
