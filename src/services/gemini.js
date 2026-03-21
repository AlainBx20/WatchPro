import { GoogleGenAI } from '@google/genai';

// By default, try to read from localStorage. If empty, it will throw when used.
// THE SECRET KEY HAS BEEN MOVED TO THE SECURE .env FILE.
export function getGeminiClient() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem('watchpro_gemini_key');
  
  const apiKey = localKey || envKey;

  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('No Gemini API key found. Please add a .env file or set it in Chat Settings.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateChatResponse(prompt, chatHistory, videoContext) {
  const ai = getGeminiClient();
  
  const systemPrompt = `You are WatchPro AI, a helpful, fun, and insightful AI watching a video alongside users in a watch party. 
Current Video Title/URL: ${videoContext}

Recent Chat History (for context):
${chatHistory.map(m => `[${m.time}] ${m.name}: ${m.text}`).join('\n')}

Keep your answer very concise (1-3 sentences max). Read the room's vibe based on the chat history.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { text: systemPrompt },
      { text: `User asks/prompts: ${prompt}` }
    ]
  });

  return response.text;
}

export async function generateSessionRecap(chatHistory, videoContext) {
  const ai = getGeminiClient();

  const systemPrompt = `You are WatchPro AI. Generate a fun, engaging "Session Recap" for the watch party based ONLY on the following chat logs and video context.

Video watched: ${videoContext}
Total messages: ${chatHistory.length}

Chat Logs:
${chatHistory.map(m => `[${m.time}] ${m.name}: ${m.text}`).join('\n')}

Format your response exactly using this JSON structure. Do NOT wrap it in markdown codeblocks (no \`\`\`json). Just return the raw JSON:
{
  "plotSummary": "2-3 sentences summarizing what the video was about based on the context and chat.",
  "groupVibe": "2-3 sentences analyzing the mood, who talked the most, and what the reactions were like.",
  "highlights": [
    { "time": "Approx Time", "text": "A notable moment or quote from the chat" },
    { "time": "Approx Time", "text": "Another notable moment" },
    { "time": "Approx Time", "text": "A third notable moment" }
  ],
  "recommendation": "Name of a similar YouTube video to watch next based on this vibe."
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: systemPrompt
  });

  try {
    let cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse recap JSON:", response.text);
    throw new Error("Failed to generate a nicely formatted recap. The AI returned something unexpected.");
  }
}

export async function generateRoomVibe(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) return { emoji: '🧊', label: 'Chilling', sub: 'Quiet room' };
  
  const ai = getGeminiClient();
  const systemPrompt = `Analyze the emotional vibe of these chat messages. 
Messages: ${chatHistory.map(m => m.text).join(' | ')}
Return ONLY a valid JSON object matching exactly this schema, no markdown blocks:
{"emoji":"🔥","label":"Hype","sub":"High energy"}`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
    const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch(e) { return { emoji: '🤔', label: 'Unsure', sub: 'Analyzing...' }; }
}

export async function generateSmartReplies(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) return ["That's crazy!", "Whoa 🤯", "Lol exactly"];
  
  const ai = getGeminiClient();
  const systemPrompt = `Based on the last few chat messages, generate 3 very short, casual, natural-sounding replies (1-4 words max) that a user could click to quickly respond in chat.
Recent Chat: ${chatHistory.slice(-4).map(m => m.text).join(' | ')}
Return ONLY a valid JSON array of 3 strings, no markdown blocks:
["Reply 1", "Reply 2", "Reply 3"]`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
    const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch(e) { return ["Wow", "Haha", "Wait what?"]; }
}

export async function generateVideoTrivia(videoContext) {
  if (!videoContext) return [];
  
  const ai = getGeminiClient();
  const systemPrompt = `Generate 3 fun trivia questions related to the YouTube URL or title: "${videoContext}".
Return ONLY a valid JSON array matching exactly this schema, no markdown blocks:
[
  {"question":"What year did this video's artist release their first album?","options":["1990","2001","2008","2015"],"correctIndex":1,"funFact":"It went double platinum!"}
]`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
    const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch(e) { return []; }
}

export async function generateYoutubeSearch(query) {
  if (!query) return [];
  
  const ai = getGeminiClient();
  const systemPrompt = `You are a YouTube Search API proxy. The user searched for: "${query}".
Return ONLY a valid JSON array of 6 real, highly relevant YouTube video IDs that actually exist on YouTube.
Schema:
[
  {
    "id": "real_11_char_id",
    "title": "Exact Title of the video",
    "channel": "Channel Name",
    "duration": "10:35",
    "views": "1.2M views"
  }
]
No markdown blocks, just the raw JSON array. Make sure the IDs are valid.`;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
    const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const items = JSON.parse(cleanText);
    
    return items.map(item => ({
      ...item,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnail: `https://i.ytimg.com/vi/${item.id}/hq720.jpg`
    }));
  } catch(e) { 
    console.warn("AI Search Failed:", e);
    return []; 
  }
}
