export const PARTICIPANTS = [
  { id: 1, name: 'Alex Rivera', initials: 'AR', color: '#7c3aed', isHost: true,  isOnline: true,  isMuted: false, isSpeaking: true,  isBuffering: false },
  { id: 2, name: 'Jordan Lee',  initials: 'JL', color: '#0ea5e9', isHost: false, isOnline: true,  isMuted: true,  isSpeaking: false, isBuffering: true  },
  { id: 3, name: 'Sam Parker',  initials: 'SP', color: '#10b981', isHost: false, isOnline: true,  isMuted: false, isSpeaking: false, isBuffering: false },
  { id: 4, name: 'Casey Kim',   initials: 'CK', color: '#f59e0b', isHost: false, isOnline: true,  isMuted: true,  isSpeaking: false, isBuffering: false },
  { id: 5, name: 'Morgan Chen', initials: 'MC', color: '#ef4444', isHost: false, isOnline: false, isMuted: false, isSpeaking: false, isBuffering: false },
];

export const MESSAGES = [
  { id: 1, userId: 2, name: 'Jordan Lee',  color: '#0ea5e9', initials: 'JL', text: 'Omg this scene is wild 😱', time: '7:12 PM', isAI: false },
  { id: 2, userId: 3, name: 'Sam Parker',  color: '#10b981', initials: 'SP', text: 'I know right! Been waiting for this episode all week 🔥', time: '7:12 PM', isAI: false },
  { id: 3, userId: 0, name: 'WatchPro AI', color: '#7c3aed', initials: '✨', text: 'This is the pivotal scene that references events from Episode 4 — the foreshadowing finally pays off here.', time: '7:13 PM', isAI: true },
  { id: 4, userId: 4, name: 'Casey Kim',   color: '#f59e0b', initials: 'CK', text: 'Wait I missed what happened before, can someone recap?', time: '7:14 PM', isAI: false },
  { id: 5, userId: 3, name: 'Sam Parker',  color: '#10b981', initials: 'SP', text: 'The character found the hidden letter from the previous season. It revealed everything about the conspiracy!', time: '7:14 PM', isAI: false },
  { id: 6, userId: 2, name: 'Jordan Lee',  color: '#0ea5e9', initials: 'JL', text: '🔥🔥🔥', time: '7:15 PM', isAI: false },
];

export const WATCH_HISTORY = [
  { id: 1, title: 'Stranger Things S4 E09',   meta: 'Watched 2 days ago • 52 min', emoji: '🎬' },
  { id: 2, title: 'The Bear - Season Finale',  meta: 'Watched 5 days ago • 48 min', emoji: '🍳' },
  { id: 3, title: 'Oppenheimer (2023)',         meta: 'Watched 1 week ago • 3h 1min',emoji: '💣' },
  { id: 4, title: 'Dune: Part Two',            meta: 'Watched 2 weeks ago • 2h 47m', emoji: '🌌' },
];

export const AI_PROMPTS = [
  { icon: '📖', label: 'Summarize what I missed', response: 'In the last 15 minutes: The detective uncovered the hidden letter revealing the secret society\'s true leader. A tense confrontation followed, ending with the protagonist escaping through the underground passage — setting up the dramatic season finale.' },
  { icon: '🎬', label: 'What just happened?',      response: 'The villain just revealed their true identity — they\'ve been working with the protagonist\'s mentor all along. The twist recontextualizes events from episodes 2, 5, and 7.' },
  { icon: '🎯', label: 'Recommend next content',    response: 'Based on what you\'re watching: **Dark (Netflix)** — similarly intricate plot, **Severance** — corporate mystery vibes, **The Prestige** — masterful reveals. All rated 9+/10 by your group.' },
  { icon: '🌍', label: 'Translate subtitles',       response: 'Auto-translation active. Currently rendering English subtitles from the Spanish dialogue. Toggle subtitle language in Settings → Accessibility.' },
  { icon: '✨', label: 'Show highlights',            response: 'Key moments so far: 00:04:22 — First clue discovered, 00:18:07 — Plot twist #1, 00:31:45 — Character reunion, 00:48:20 — The big reveal (current scene).' },
];

export const TOASTS_DEMO = [
  { id: 1, type: 'join',  icon: '👋', title: 'Morgan Chen joined',     sub: 'Welcome to the watch party!' },
  { id: 2, type: 'sync',  icon: '⚡', title: 'Playback synced',        sub: 'All users are now in sync'    },
  { id: 3, type: 'info',  icon: '⏸',  title: 'Alex paused the video', sub: 'Host paused for everyone'     },
  { id: 4, type: 'leave', icon: '👋', title: 'Casey left the room',    sub: 'See you next time!'           },
];
