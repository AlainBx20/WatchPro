import { useState, useEffect, useRef, useCallback } from "react";
import { onSnapshot, doc, collection, orderBy, query, limit, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, onValue, set, onDisconnect, push, serverTimestamp as rtdbTimestamp } from "firebase/database";
import { db, rtdb } from "../services/firebase";

// Fallback data if Firebase isn't fully set up yet
const FALLBACK_ROOM_DATA = {
  name: "WatchPro Lobby",
  hostId: "local-user",
  mediaMetadata: { title: "YouTube Sync Test", duration: 0, sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  playbackState: { isPlaying: false, timestamp: 0 }
};

export function useFirebaseRoom(roomId, initialRoomName = "WatchPro Lobby") {
  const [roomData, setRoomData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiSummaries, setAiSummaries] = useState([]);
  const [isSandbox, setIsSandbox] = useState(false);

  const safeSetRoomData = useCallback((updater) => {
    setRoomData(updater);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let unsubscribeRoom = null;
    let unsubscribeChat = null;
    let unsubscribeAi = null;
    let resolved = false;

    // Failsafe timeout
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn("⏰ Firestore timeout → entering offline sandbox mode.");
        setIsSandbox(true);
        setRoomData(FALLBACK_ROOM_DATA);
      }
    }, 4000);

    const createRoomIfNeeded = async () => {
      try {
        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          console.log("📝 Creating room document:", roomId);
          await setDoc(roomRef, {
            name: initialRoomName,
            hostId: "system",
            mediaMetadata: { title: "YouTube Sync Test", duration: 0, sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
            playbackState: { isPlaying: false, timestamp: 0, lastUpdatedAt: serverTimestamp() },
            createdAt: serverTimestamp()
          });
          console.log("✅ Room document created");
        }
      } catch(err) {
        console.warn("Could not create room:", err.message);
      }
    };

    // Create the room first, then listen
    createRoomIfNeeded().then(() => {
      try {
        unsubscribeRoom = onSnapshot(
          doc(db, "rooms", roomId),
          (snap) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(fallbackTimer);
            }
            if (snap.exists()) {
              console.log("🔄 Room data received from Firestore");
              setRoomData(snap.data());
            } else {
              console.warn("Room document doesn't exist, using fallback.");
              setIsSandbox(true);
              setRoomData(FALLBACK_ROOM_DATA);
            }
          },
          (error) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(fallbackTimer);
            }
            console.error("Firestore error:", error.message);
            setIsSandbox(true);
            setRoomData(FALLBACK_ROOM_DATA);
          }
        );
      } catch(e) {
        resolved = true;
        clearTimeout(fallbackTimer);
        setIsSandbox(true);
        setRoomData(FALLBACK_ROOM_DATA);
      }
    });

    // Chat listener
    try {
      const qChat = query(
        collection(db, "rooms", roomId, "chatMessages"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      unsubscribeChat = onSnapshot(qChat,
        (snap) => {
          const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
          setMessages(msgs);
        },
        () => console.log("Chat fallback active")
      );
    } catch(e) { console.log("Chat init error"); }

    // AI summaries listener
    try {
      const qAi = query(
        collection(db, "rooms", roomId, "aiSummaries"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      unsubscribeAi = onSnapshot(qAi,
        (snap) => {
          setAiSummaries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        () => console.log("AI summaries fallback active")
      );
    } catch(e) { console.log("AI init error"); }

    return () => {
      clearTimeout(fallbackTimer);
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeAi) unsubscribeAi();
    };
  }, [roomId]);

  return { roomData, messages, aiSummaries, setRoomData: safeSetRoomData, isSandbox };
}

export function useFirebasePresence(roomId, user, profile) {
  const [presenceData, setPresenceData] = useState({});

  useEffect(() => {
    if (!roomId || !profile?.name || !user) return;

    const uid = user.uid;

    // Always try RTDB for presence
    const userRef = ref(rtdb, `presence/${roomId}/${uid}`);
    const roomRef = ref(rtdb, `presence/${roomId}`);

    const joinState = {
      status: "online",
      lastActive: Date.now(),
      isTyping: false,
      media: { micOn: true, camOn: false, isSpeaking: false },
      profile: profile
    };

    try {
      set(userRef, joinState).then(() => {
        console.log("✅ Presence set in RTDB for", uid);
      }).catch(e => {
        console.warn("RTDB set failed:", e.message);
        // Fallback to local presence
        setPresenceData({
          [uid]: { status: "online", media: { isSpeaking: false }, profile }
        });
      });

      onDisconnect(userRef).set({ ...joinState, status: "offline" });

      const unsub = onValue(roomRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          console.log("👥 Presence update:", Object.keys(data).length, "users");
          setPresenceData(data);
        }
      }, (error) => {
        console.warn("Presence read failed:", error.message);
        setPresenceData({
          [uid]: { status: "online", media: { isSpeaking: false }, profile }
        });
      });

      return () => {
        unsub();
        try {
          onDisconnect(userRef).cancel();
          set(userRef, { ...joinState, status: "offline" }).catch(() => {});
        } catch(e) {}
      };
    } catch(err) {
      console.warn("RTDB Init bypass:", err);
      setPresenceData({
        [uid]: { status: "online", media: { isSpeaking: false }, profile }
      });
    }
  }, [roomId, user, profile]);

  return { presenceData };
}
export function useFirebaseReactions(roomId, onNewReaction) {
  useEffect(() => {
    if (!roomId || !onNewReaction) return;

    const reactionsRef = ref(rtdb, `reactions/${roomId}`);
    const startTime = Date.now();

    // Use onValue carefully to only pick up new reactions
    const unsub = onValue(reactionsRef, (snap) => {
      if (!snap.exists()) return;
      
      const data = snap.val();
      const keys = Object.keys(data);
      const latestKey = keys[keys.length - 1];
      const latest = data[latestKey];

      // Only trigger if it's new (added after we joined or within last 2 seconds)
      if (latest.timestamp > startTime - 2000) {
        onNewReaction(latest.emoji, latest.senderName);
      }
    });

    return () => unsub();
  }, [roomId, onNewReaction]);

  const sendReaction = (emoji, senderName = "Guest") => {
    if (!roomId) return;
    const reactionsRef = ref(rtdb, `reactions/${roomId}`);
    push(reactionsRef, {
      emoji,
      senderName,
      timestamp: Date.now()
    });
  };

  return { sendReaction };
}
