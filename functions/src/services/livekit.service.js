const { AccessToken } = require('livekit-server-sdk');

// Note: In production, these should be securely injected via Firebase Config or Secret Manager
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

/**
 * Generate a signed JWT for LiveKit representing a user joining a media room.
 */
function generateLiveKitToken(roomName, participantId, participantName, canPublish = true) {
  // Creating a new LiveKit access token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantId,
    name: participantName,
    ttl: '2h', // Token valid for 2 hours
  });

  // Adding explicit WebRTC grants
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: canPublish,      // User can send audio/video
    canSubscribe: true,          // User can receive audio/video
    canPublishData: true         // User can send metadata packets (cursor position, reactions)
  });

  return at.toJwt();
}

module.exports = {
  generateLiveKitToken
};
