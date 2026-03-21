# 🎬 WatchPro: The Ultimate AI-Powered Watch Party Experience

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)

**WatchPro** isn't just another video syncing app; it's a social cinematic platform built for the modern web. We combine low-latency synchronization with local AI intelligence to recreate the feeling of a real movie theater with your friends, wherever they are in the world.

---

## 🔥 Key Features

### ⚡ Sub-Second Synchronization
Our "Sync Guardian" engine continuously monitors all participants. If a viewer falls behind by even 1.5 seconds, the system automatically snaps them back to the host's head-time. Play/Pause and Seek events are broadcasted globally in real-time.

### 🤖 WatchPro AI Copilot
Powered by Google Gemini, our built-in AI assistant watches with you.
- **Smart Replies**: One-tap responses based on the current chat context.
- **Session Recaps**: AI-generated summaries of your watch parties so you never forget the best moments.
- **Interactive Chat**: Ask the AI about the video you're watching or just vibe with it.

### 🎭 Personal Identity & Premium Onboarding
First impressions matter. When you join WatchPro, you choose your identity:
- **Avatar Library**: Choose from hundreds of high-quality characters (powered by DiceBear).
- **Custom Uploads**: Directly upload your own photos.
- **Persistent Profiles**: Your name, color, and avatar are saved in Firestore, so the party knows you when you return.

### 🌈 Live "Vibe" Reactions
Don't just chat—react! Our global reaction system allows everyone to send emojis that float across the screen for all participants.
- **Attributed Reactions**: See who sent what with nametags on every floating emoji.
- **Vibe Control**: Feeling distracted? Use the dedicated "Vibe" toggle in the player to mute reactions locally for a cleaner view.

### 🎙️ Total Social Control
- **Push-To-Talk (PTT)**: High-quality voice controls with deafen/mute options.
- **Custom Room Naming**: Brand your lobby before you start the stream.
- **Participants Sidebar**: Always see who's online, who's buffering, and who's currently the host.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite 6 (Hyper-fast HMR)
- **Styling**: Vanilla CSS (Premium Glassmorphism Design System)
- **Database**: 
  - **Cloud Firestore**: Persistent data (messages, room meta, user profiles).
  - **Realtime Database (RTDB)**: Ephemeral data (presence, live reactions).
- **AI Engine**: Google Generative AI (Gemini 1.5 Pro)
- **Media**: Custom YouTube Player implementation with the YT IFrame API.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Firebase project (Firestore + RTDB)
- A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AlainBx20/WatchPro.git
   cd WatchPro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file (or update `src/services/firebase.js` and `src/services/gemini.js`) with your credentials.

4. **Launch Dev Server**
   ```bash
   npm run dev
   ```

---

## 📽️ How to Use

1. **Host a Party**: Create a name for your lobby in the home screen and click "Start Session".
2. **Setup Your Profile**: Pick your mascot or upload your own, set your name, and choose your vibe color.
3. **Pick a Movie**: Paste any YouTube link into the URL bar and hit "Update Video".
4. **Invite Friends**: Copy the Room ID from the Top Bar and send it to your crew!

---

## ✨ Contribution

We built WatchPro because watching things alone is boring. If you have ideas for features—like Netflix integration, global theater modes, or VR support—feel free to fork and PR!

**Developed by AlainBx20 & The DeepMind Team**
"Watch together, sync perfectly, react endlessly."
