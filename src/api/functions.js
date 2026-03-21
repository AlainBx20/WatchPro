import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

// References to the Cloud Functions mapped via their export names in index.js
const createRoomFunction = httpsCallable(functions, "createRoom");
const joinRoomFunction = httpsCallable(functions, "joinRoom");
const generateRecapFunction = httpsCallable(functions, "generateRejoinRecap");

/**
 * Creates a new WatchPro room and fetches the LiveKit Host Token
 * @param {string} title - The title of the room/media
 * @param {string} sourceUrl - Optional media URL
 * @returns {Promise<{roomId: string, livekitToken: string}>}
 */
export async function createRoom(title, sourceUrl) {
  try {
    const result = await createRoomFunction({ title, sourceUrl });
    return result.data;
  } catch (error) {
    console.error("Failed to create room via Firebase Functions:", error);
    throw error;
  }
}

/**
 * Joins an existing WatchPro room and fetches the LiveKit Guest Token
 * @param {string} roomId - The room UUID to join
 * @returns {Promise<{roomId: string, livekitToken: string}>}
 */
export async function joinRoom(roomId) {
  try {
    const result = await joinRoomFunction({ roomId });
    return result.data;
  } catch (error) {
    console.error("Failed to join room via Firebase Functions:", error);
    throw error;
  }
}

/**
 * Triggers the AI to summarize the recent events in the room chat
 * @param {string} roomId - The current room ID
 * @returns {Promise<{success: boolean}>}
 */
export async function triggerRejoinRecap(roomId) {
  try {
    const result = await generateRecapFunction({ roomId });
    return result.data;
  } catch (error) {
    console.error("Failed to trigger AI recap:", error);
    throw error;
  }
}
