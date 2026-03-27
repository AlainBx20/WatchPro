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

// AI & Content Proxy Exports
const aiApi = require('./src/api/ai.api');
exports.proxyOllama = aiApi.proxyOllama;
exports.proxyMovieRecommendations = aiApi.proxyMovieRecommendations;
exports.proxyYoutube = aiApi.proxyYoutube;
exports.proxyMovies = aiApi.proxyMovies;
