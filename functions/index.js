const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin globally
initializeApp();

// Export API / HTTP Callable Functions
const roomsApi = require('./src/api/rooms.api');
exports.createRoom = roomsApi.createRoom;
exports.joinRoom = roomsApi.joinRoom;

// Export Firestore Trigger Functions
const chatTrigger = require('./src/triggers/chat.trigger');
exports.onChatMessage = chatTrigger.onChatMessage;

// Rejoin Recap Export
const recapApi = require('./src/api/recap.api');
exports.generateRejoinRecap = recapApi.generateRejoinRecap;
