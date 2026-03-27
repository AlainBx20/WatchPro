import { GoogleGenAI } from '@google/genai';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// THE SECRET KEY HAS BEEN MOVED TO THE SECURE .env FILE.
export function getGeminiClient() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem('watchpro_gemini_key');
  const apiKey = localKey || envKey;
  if (!apiKey || apiKey === 'your_key_here') return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * ⚡ SOCIAL AI ENGINE: PROXY PROTOCOL
 * React Frontend -> Firebase Backend Proxy -> Ollama (Ngrok/Local)
 * Bypasses CORS and keeps AI infrastructure centralized.
 */
async function callAI(prompt, jsonMode = false) {
  const envModel = import.meta.env.VITE_OLLAMA_MODEL || "qwen2.5:14b";
  
  // 1. Try secure Backend Proxy (Server-to-Server)
  try {
    console.log("🦾 AI Engine: Requesting via secure Backend Proxy...");
    const proxyOllama = httpsCallable(functions, 'proxyOllama');
    
    const result = await proxyOllama({
      prompt: prompt,
      model: envModel,
      jsonMode: jsonMode
    });
    
    if (result.data?.response) {
      console.log("✅ AI Engine: Success via Backend Proxy");
      return result.data.response;
    }
  } catch (backendError) {
    console.warn("⚠️ AI Engine: Backend Proxy unavailable. Check if functions are deployed or local emulator is running.", backendError.message);
  }

  // 2. Emergency Direct Local Probe (Low Probability fallback)
  const localUrls = ["http://127.0.0.1:11434/api/generate", "http://localhost:11434/api/generate"];
  for (const url of localUrls) {
     try {
       const res = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ model: envModel, prompt: prompt, stream: false })
       });
       if (res.ok) {
         const d = await res.json();
         return d.response;
       }
     } catch(e) {}
  }

  // 3. Final Fallback to Gemini Cloud
  const genAI = getGeminiClient();
  if (!genAI) throw new Error("AI Offline: Backend Proxy unreachable and Cloud AI key missing.");
  
  console.log("☁️ AI Engine: Using Gemini Cloud fallback...");
  const result = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ text: prompt }]
  });
  return result.text;
}

export async function generateChatResponse(prompt, chatHistory, videoContext) {
  const systemPrompt = `You are WatchPro AI, a helpful, fun AI watching a video alongside users.
  Video: ${videoContext}
  History: ${chatHistory.slice(-5).map(m => `${m.name}: ${m.text}`).join('\n')}
  Question: ${prompt}
  Keep answer to 1-2 sentences. Speak like a friend.`;

  return await callAI(systemPrompt);
}

export async function generateSessionRecap(chatHistory, videoContext) {
  const systemPrompt = `Generate a fun watch party recap in JSON format.
  Video: ${videoContext}
  Chat: ${chatHistory.map(m => `${m.name}: ${m.text}`).join(' | ')}
  
  Format:
  {
    "plotSummary": "...",
    "groupVibe": "...",
    "highlights": [{"time": "...", "text": "..."}],
    "recommendation": "..."
  }
  JSON ONLY.`;

  const text = await callAI(systemPrompt, true);
  try {
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch (e) { throw new Error("AI Summary format error"); }
}

export async function generateRoomVibe(chatHistory) {
  if (!chatHistory?.length) return { emoji: '🧊', label: 'Chilling', sub: 'Quiet room' };

  const prompt = `Analyze these messages: ${chatHistory.map(m => m.text).join(' | ')}
  Return JSON: {"emoji":"⚡","label":"Vibe Name","sub":"Description"}. JSON ONLY.`;

  try {
    const text = await callAI(prompt, true);
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch (e) { return { emoji: '🤔', label: 'Processing', sub: 'Analyzing vibe...' }; }
}

export async function generateSmartReplies(chatHistory) {
  if (!chatHistory?.length) return ["Wow!", "Cool", "Haha"];

  const prompt = `Based on chat: ${chatHistory.slice(-3).map(m => m.text).join(' | ')}
  Return 3 short 1-word replies as JSON string array. Example: ["Nice", "No", "Lol"]. JSON ONLY.`;

  try {
    const text = await callAI(prompt, true);
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch (e) { return ["Wow", "Haha", "Cool"]; }
}

export async function generateVideoTrivia(videoContext) {
  const prompt = `3 fun trivia questions about: ${videoContext}.
  Return JSON array: [{"question":"", "options":["","","",""], "correctIndex":0, "funFact":""}]. JSON ONLY.`;

  try {
    const text = await callAI(prompt, true);
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch (e) { return []; }
}

export async function generateYoutubeSearch(query) {
  // We now use Invidious directly in YouTubeBrowser.jsx, but keeping this for compatibility.
  return [];
}
