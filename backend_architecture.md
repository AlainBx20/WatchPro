# WatchPro Backend Architecture Blueprint

This is a comprehensive, production-ready backend architecture specification for a real-time co-watching platform with AI features. It leverages Firebase for application state and coordination, LiveKit for real-time media (audio/video), and external AI APIs for intelligent features.

---

## 1. High-Level Architecture Overview

The system is divided into three distinct layers, ensuring optimal performance, scalability, and separation of concerns:

1. **State & Coordination Layer (Firebase)**: Handles authentication, persistent app state, real-time playback synchronization, chat, and business logic orchestration.
2. **Media Transport Layer (LiveKit/WebRTC)**: A dedicated WebRTC SFU (Selective Forwarding Unit) that handles scalable transmission of microphone and camera streams. 
3. **AI Layer (External APIs + Cloud Functions)**: Asynchronous processing layer that consumes chat history, playback events, and metadata to generate insights (summaries, recaps, recommendations) without interrupting the main media flow.

---

## 2. Responsibilities of Each Layer

### Firebase Auth
- Manages strict user identity (Email, Google Auth, Anonymous Guests).
- Issues JWTs valid across Firebase and your custom backend logic.
- Maintains user profiles and roles.

### Cloud Firestore (Persistent Data)
- Stores structural room metadata, persistent chat history, user profiles, and AI outputs.
- Acts as the source of truth for playback state (current video, current timestamp, playing/paused state).
- Designed for scale, low-latency document reads/writes, and strong querying capabilities.

### Realtime Database (RTDB) (Ephemeral State)
- **Why RTDB over Firestore for presence?** RTDB maintains a continuous socket connection and has built-in `onDisconnect` triggers. It is significantly faster and cheaper for high-frequency, ephemeral state changes (online status, typing indicators, speaking indicators) that do not need to be permanently stored or queried.
- Manages "Who is online right now" and "Who is currently typing/speaking".

### Cloud Functions
- Securely orchestrates interactions that clients cannot be trusted to do (e.g., generating LiveKit WebRTC tokens).
- Listens to Firestore changes to trigger AI prompt generation asynchronously.
- Runs scheduled clean-up jobs for dead rooms.
- Issues AI requests via APIs (OpenAI / Anthropic).

### LiveKit / WebRTC (Media Layer)
- Strictly handles Audio and Video packet routing.
- Automatically handles network resilience, packet loss, and variable bitrates (Simulcast).
- Keeps media bandwidth entirely off Firebase infrastructure.

### AI Layer
- Activated via Cloud Functions based on specific triggers (e.g., a user joins late, a room session ends).
- Generates "What you missed" text modules.
- Processes chat and playback timestamps to detect highlights.

---

## 3. Firestore Schema in Detail

Firestore collections are optimized for shallow reads and subcollections for scalable isolation.

### `users` (Collection)
**Document ID:** `uid` (from Firebase Auth)
```json
{
  "displayName": "Alex Rivera",
  "email": "alex@example.com",
  "avatarUrl": "https://...",
  "createdAt": "timestamp",
  "role": "user"
}
```

### `rooms` (Collection)
**Document ID:** `roomId` (e.g., auto-generated or custom `XKCD-7392`)
```json
{
  "name": "Movie Night Friday",
  "hostId": "uid_123",
  "createdAt": "timestamp",
  "status": "active", // active, ended
  "mediaMetadata": {
    "title": "Stranger Things S4 E09",
    "sourceUrl": "https://...",
    "type": "video/mp4",
    "duration": 2847
  },
  "playbackState": {
    "isPlaying": true,
    "timestamp": 1420.5,
    "lastUpdatedAt": "timestamp (server time)",
    "updatedBy": "uid_456"
  },
  "settings": {
    "hostOnlyControls": false,
    "requireApproval": false
  }
}
```

#### Subcollections under `rooms/{roomId}`:

- **`chatMessages`**
  ```json
  {
    "userId": "uid_123",
    "text": "Omg this scene is wild 😱",
    "createdAt": "timestamp (server time)",
    "isAI": false,
    "reactions": { "🔥": ["uid_123", "uid_456"] }
  }
  ```
- **`playbackLog`** (Action history, used for AI highlights)
  ```json
  {
    "action": "paused",
    "userId": "uid_123",
    "videoTimestamp": 1420.5,
    "createdAt": "timestamp"
  }
  ```
- **`aiSummaries`**
  ```json
  {
    "type": "rejoin_recap",
    "targetUserId": "uid_789", // Null if global
    "content": "In the last 15 minutes, the detective...",
    "createdAt": "timestamp"
  }
  ```

---

## 4. Realtime Database (RTDB) Schema in Detail

RTDB is structured specifically for presence and ephemeral states.

```json
{
  "presence": {
    "roomId_123": {
      "uid_456": {
        "status": "online",
        "lastActive": 16987654321,
        "isTyping": false,
        "media": {
          "micOn": true,
          "camOn": false,
          "isSpeaking": true
        }
      }
    }
  }
}
```

---

## 5. Cloud Functions List & Responsibilities

1. **`createRoom (HTTP Callable)`**: Validates user, creates Firestore `rooms` doc, sets host, returns `roomId`.
2. **`joinRoom (HTTP Callable)`**: Validates invite/access, checks room capacity, returns a generated **LiveKit Access Token** mapping the `uid` to the LiveKit room.
3. **`onPlaybackChanged (Firestore Trigger: onWrite)`**: Listens to changes in `rooms/{roomId}/playbackState`. Logs the event to `playbackLog`. Warns clients if someone seeks drastically.
4. **`onChatMessage (Firestore Trigger: onCreate)`**: Listens to new chats. If a message tags `@WatchProAI` or if it's the 100th message, triggers an async task to generate AI insights.
5. **`generateRejoinRecap (HTTP Callable)`**: A late-joining client requests a recap. Function fetches the last 20 minutes of `chatMessages` and `playbackLog`, calls OpenAI, and writes the result to the `aiSummaries` subcollection.
6. **`cleanupStaleRooms (Cron Job)`**: Runs every hour. Looks for rooms where RTDB presence is empty for > 2 hours and marks them as `status: 'ended'`.
7. **`endSessionSummary (Firestore Trigger: onUpdate)`**: When room `status` changes to `ended`, fetches all data, generates a final recap, saves to user's `watchHistory`.

---

## 6. Authentication and Authorization Flow

1. Client authenticates via Firebase Auth (Google/Email/Anonymous).
2. Firebase issues a secure JWT (`idToken`).
3. Client uses this token for native Firestore reads/writes (enforced by Security Rules).
4. For privileged actions (like getting a LiveKit WebRTC token), the client calls a Firebase Cloud Function.
5. The Cloud Function verifies the Firebase Auth token, ensures the user is allowed in the room, and returns the signed LiveKit token.

---

## 7. Room Lifecycle Flow

1. **Creation**: Host clicks "Create". Client calls `createRoom` function. Firestore doc is created. Host gets LiveKit token.
2. **Invites**: Client generates a shareable link `watchpro.app/room/ID`. 
3. **Joining**: Guest opens link, creates Anonymous Firebase account (if not logged in). Guest calls `joinRoom`, gets validated, receives LiveKit token.
4. **Closing**: Host leaves, RTDB `onDisconnect` fires. Cloud function detects host left, optionally triggers session end process.

---

## 8. Playback Synchronization Flow

1. Host clicks "Pause" in their custom video player.
2. Host client eagerly pauses local video and writes to Firestore:
   `rooms/{roomId}.update({ 'playbackState.isPlaying': false, 'playbackState.timestamp': 345.2, 'playbackState.updatedBy': 'hostUid', 'playbackState.lastUpdatedAt': serverTimestamp() })`
3. Firebase syncs this document change to all connected clients in ~100ms.
4. Guest clients receive the update. They check `updatedBy`. Since it's not their own ID, they adjust their local video player (`videoEl.currentTime = 345.2; videoEl.pause();`).
5. **Latency Handling**: If `isPlaying` is true, clients calculate exact time using: `desiredTime = state.timestamp + (Date.now() - state.lastUpdatedAt)`.

---

## 9. Presence Flow

1. Client joins room and connects to Firebase RTDB.
2. Client writes `{ status: 'online' }` to `presence/{roomId}/{uid}`.
3. Client registers an `onDisconnect()` hook on that specific RTDB node to write `{ status: 'offline' }`.
4. If the client closes the tab, loses Wi-Fi, or crashes, Firebase server automatically executes the `onDisconnect` hook.
5. Other clients listen to `presence/{roomId}` and instantly update the UI (showing/hiding avatars).

---

## 10. Voice/Video Connection Flow (LiveKit)

1. **Firebase is NOT the media transport layer.** It only handles the handshake.
2. Client calls `joinRoom` Cloud Function.
3. Function creates a signed LiveKit JWT containing `room: roomId`, `participant: uid`, and permissions (canPublish, canSubscribe).
4. Client uses the LiveKit SDK and passes the token: `LiveKitRoom.connect('wss://your-livekit-server.com', token)`.
5. WebRTC connections are established between the client and the LiveKit SFU.
6. LiveKit handles audio/video routing. It tells clients who is speaking using WebRTC audio levels.
7. Mute/Unmute actions are performed via LiveKit SDK, and simultaneously written to RTDB so participants without WebRTC connections can still see icon state changes.

---

## 11. AI Trigger Flow (Optimized for Cost & Efficiency)

*Avoid passing actual video frames to AI.*

**Scenario: Late Join Recap ("What did I miss?")**
1. User joins the room 30 minutes late.
2. Client detects `currentTime > 0` and historical gap. Client calls `generateRejoinRecap`.
3. Cloud Function queries `chatMessages` (last 50 messages) and `playbackLog` (major pauses/seeks) from Firestore.
4. Function constructs a prompt: 
   *"A user just joined. They are at video timestamp 30:00. The content is 'Stranger Things S4'. Here is the recent chat: [JSON]. Write a 2-sentence summary of the vibe and plot context."*
5. Function calls OpenAI API.
6. Function saves response to `rooms/{roomId}/aiSummaries`.
7. Client's Firestore listener triggers, displaying the modal to the user.

---

## 12. Security Rules and Permission Model (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Check if user is in room members list (managed by Cloud Functions)
    function isRoomMember(roomId) {
      return exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
    }
    
    // Check if user is the room host
    function isHost(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)).data.hostId == request.auth.uid;
    }

    match /rooms/{roomId} {
      // Anyone with link can read public room meta
      allow read: if request.auth != null;
      // Only host can update settings
      allow update: if isHost(roomId);
      
      // Playback State: Anyone in room can update if 'hostOnlyControls' is false
      // Otherwise, only host.
      
      match /chatMessages/{messageId} {
        allow read: if isRoomMember(roomId);
        allow create: if isRoomMember(roomId) && request.resource.data.userId == request.auth.uid;
        // No delete allowed except by host
        allow delete: if isHost(roomId);
      }
    }
  }
}
```

---

## 13. Scalability Considerations

- **Shallow Reads**: Firestore queries do not fetch subcollections by default. Fetching the `room` document does not accidentally pull thousands of chat messages.
- **Cost Minimization**: Ephemeral typing/speaking states are isolated to RTDB (bandwidth priced, heavily optimized), saving millions of expensive Firestore document writes.
- **Media Isolation**: LiveKit scales entirely independently of Firebase. Video streams never touch the database.

---

## 14. Failure Cases and Recovery Strategies

- **Desyncs**: If a user's connection lags, their local `currentTime` drifts from `playbackState.timestamp`. The client runs a check every 5 seconds. If drift > 2 seconds, UI shows the "Out of Sync / Resync" banner.
- **Client Crash**: RTDB `onDisconnect` triggers, updating presence to offline. LiveKit SFU detects WebRTC drop and stops forwarding their video. Reopening the app triggers the `joinRoom` token flow to reconnect.
- **AI Timeout**: If the OpenAI API takes > 10 seconds, the client gracefully degrades, hiding the AI "Thinking" state and falling back to a standard welcome message.

---

## 15. Suggested Project Structure (Monorepo)

```text
/watchpro
  /client                   # React + Vite application
    /src
      /components
      /hooks
      /services
        firebase.js         # Firebase config & init
        livekit.js          # WebRTC abstraction
  /functions                # Firebase Cloud Functions (Node.js/TypeScript)
    /src
      /api                  # HTTP endpoints (joinRoom, etc)
      /triggers             # Firestore background triggers
      /services
        ai.service.ts       # OpenAI API wrappers
        livekit.service.ts  # LiveKit server SDK (token generation)
  /rules                    # Security rules (firestore.rules, database.rules.json)
```

---

## 16. Example Payloads & Code

### LiveKit Token Generation (Cloud Function Pseudocode)
```typescript
import { AccessToken } from 'livekit-server-sdk';

export const joinRoom = functions.https.onCall(async (data, context) => {
  const { roomId } = data;
  const uid = context.auth.uid;

  // 1. Verify user is allowed in Firestore...
  
  // 2. Generate Media Token
  const at = new AccessToken('API_KEY', 'API_SECRET', {
    identity: uid,
    name: context.auth.token.name
  });
  
  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true
  });

  return { token: at.toJwt() };
});
```
