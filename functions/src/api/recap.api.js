const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { generateSummarizationPrompt } = require('../services/ai.service');

// Fetch late join recap
exports.generateRejoinRecap = onCall(async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { roomId } = data;
  const db = getFirestore();

  try {
    // Collect context: Recent chats + Recent Playback Actions
    const chatSnap = await db.collection(`rooms/${roomId}/chatMessages`)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
      
    // (Optional) We could also join playback logs here.
    
    let contextArr = [];
    chatSnap.forEach(doc => {
      const msg = doc.data();
      if (!msg.isAI) {
        contextArr.push(`${msg.name}: ${msg.text}`);
      }
    });

    // Call OpenAI
    const aiText = await generateSummarizationPrompt(contextArr.reverse().join('\n'));
    
    // Store in `aiSummaries` subcollection so the client can listen to it.
    // Target it to the specific user who asked for the recap.
    await db.collection(`rooms/${roomId}/aiSummaries`).add({
      type: 'rejoin_recap',
      targetUserId: auth.uid,
      content: aiText,
      createdAt: new Date()
    });

    return { success: true };

  } catch (error) {
    console.error('Recap generation failed:', error);
    throw new HttpsError('internal', 'AI generation failed');
  }
});
