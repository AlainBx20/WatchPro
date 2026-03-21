const { OpenAI } = require('openai');

// Note: Ensure OPENAI_API_KEY is stored securely in Firebase Secret Manager
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Mockable AI Service
 * Generates a recap of missed events based on chat context.
 */
async function generateSummarizationPrompt(chatMessagesText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an AI assistant in a Co-watching room. A user just rejoined late. Based on the following recent chat messages and playback timestamps, write a strictly 2-sentence summary of the vibe in the room and what major plot event just happened on-screen." 
        },
        { 
          role: "user", 
          content: chatMessagesText 
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    return response.choices[0].message.content;
  } catch (err) {
    console.error('Error generating AI summary:', err);
    return "The WatchPro AI encountered an error generating your recap. The group seems to be enjoying the show!";
  }
}

module.exports = {
  generateSummarizationPrompt
};
