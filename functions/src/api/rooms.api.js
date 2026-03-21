const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { generateLiveKitToken } = require('../services/livekit.service');

// API: Create a new Watch Room
exports.createRoom = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Verify user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to create a room.');
  }

  const { title, sourceUrl } = data;
  const db = getFirestore();

  try {
    // 2. Create the room document in Firestore
    const roomRef = await db.collection('rooms').add({
      name: title || 'New Watch Party',
      hostId: auth.uid,
      createdAt: new Date(),
      status: 'active',
      mediaMetadata: {
        title: title || 'Select Media',
        sourceUrl: sourceUrl || null,
        duration: 0,
      },
      playbackState: {
        isPlaying: false,
        timestamp: 0,
        updatedBy: auth.uid,
        lastUpdatedAt: new Date(),
      },
      settings: {
        hostOnlyControls: false,
      }
    });

    // 3. Add the host to the room members subcollection
    await roomRef.collection('members').doc(auth.uid).set({
      joinedAt: new Date(),
      role: 'host'
    });

    // 4. Generate the initial LiveKit WebRTC token for the host
    const token = generateLiveKitToken(roomRef.id, auth.uid, auth.token.name || 'Host', true);

    return { 
      roomId: roomRef.id, 
      livekitToken: token 
    };

  } catch (error) {
    console.error('Error creating room:', error);
    throw new HttpsError('internal', 'Unable to create room.');
  }
});

// API: Join an existing room
exports.joinRoom = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to join.');
  }

  const { roomId } = data;
  const db = getFirestore();
  const roomRef = db.collection('rooms').doc(roomId);

  try {
    const roomSnap = await roomRef.get();
    
    if (!roomSnap.exists) {
        throw new HttpsError('not-found', 'Room does not exist.');
    }

    if (roomSnap.data().status === 'ended') {
        throw new HttpsError('failed-precondition', 'This watch party has ended.');
    }

    // Add user to room members
    await roomRef.collection('members').doc(auth.uid).set({
      joinedAt: new Date(),
      role: 'guest'
    });

    // Generate token for LiveKit media
    // Note: in a real environment, you might restrict publish permissions for guests
    const token = generateLiveKitToken(roomId, auth.uid, auth.token.name || 'Guest', true);

    return { 
      roomId, 
      livekitToken: token 
    };

  } catch (error) {
    console.error('Error joining room:', error);
    throw new HttpsError('internal', 'Unable to join room.', error);
  }
});
