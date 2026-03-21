import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { rtdb } from '../services/firebase';
import { ref, onValue, set, onDisconnect, off } from 'firebase/database';

export function useMediaRTC(roomId, uid, username) {
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { uid: stream }
  const [isCapturing, setIsCapturing] = useState(false);
  
  const callsRef = useRef({}); // { uid: callObj }
  const streamRef = useRef(null);

  // 1. Initialize PeerJS and ask for local devices
  const startCapture = async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      streamRef.current = stream;
      setLocalStream(stream);
      setIsCapturing(true);
      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      return null;
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setLocalStream(null);
    setIsCapturing(false);
    
    // Close all current calls
    Object.values(callsRef.current).forEach(call => call.close());
    callsRef.current = {};
    setRemoteStreams({});
  };

  useEffect(() => {
    if (!roomId || !uid) return;

    // Use a unique but stable ID for PeerJS based on UID and Room
    const peerId = `watchpro-${roomId}-${uid}`;
    const newPeer = new Peer(peerId, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      debug: 1
    });

    newPeer.on('open', (id) => {
      console.log('PeerJS Connection Open:', id);
      setPeer(newPeer);
      
      // Publish Peer ID to Firebase Presence so others can call us
      set(ref(rtdb, `presence/${roomId}/${uid}/peerId`), id);
      onDisconnect(ref(rtdb, `presence/${roomId}/${uid}/peerId`)).remove();
    });

    // Handle incoming calls
    newPeer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      
      // Answer with local stream if we have one
      call.answer(streamRef.current);
      
      call.on('stream', (remoteStream) => {
        const remoteUid = call.peer.split('-').pop();
        setRemoteStreams(prev => ({ ...prev, [remoteUid]: remoteStream }));
      });
      
      call.on('close', () => {
        const remoteUid = call.peer.split('-').pop();
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[remoteUid];
          return next;
        });
      });
      
      callsRef.current[call.peer] = call;
    });

    newPeer.on('error', (err) => {
      console.error("PeerJS Error:", err);
    });

    // Monitor other participants to call them
    const presenceRef = ref(rtdb, `presence/${roomId}`);
    onValue(presenceRef, (snapshot) => {
      const users = snapshot.val() || {};
      
      Object.entries(users).forEach(([otherUid, data]) => {
        if (otherUid === uid) return;
        if (!data.peerId) return;
        
        // If we haven't called them yet and we have a local stream, call them!
        if (!callsRef.current[data.peerId] && streamRef.current) {
          console.log("Calling peer:", data.peerId);
          const call = newPeer.call(data.peerId, streamRef.current);
          
          call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [otherUid]: remoteStream }));
          });
          
          call.on('close', () => {
             setRemoteStreams(prev => {
               const next = { ...prev };
               delete next[otherUid];
               return next;
             });
             delete callsRef.current[data.peerId];
          });
          
          callsRef.current[data.peerId] = call;
        }
      });
    });

    return () => {
      newPeer.destroy();
      off(presenceRef);
    };
  }, [roomId, uid]);

  return { 
    localStream, 
    remoteStreams, 
    startCapture, 
    stopCapture, 
    isCapturing 
  };
}
