# WatchPro - Real-Time Co-Watching Platform

## 1. Video Player Area
- Embedded, responsive 16:9 video player with a cinematic gradient background.
- Simulated synchronized Play/Pause/Seek functionality.
- Interactive progress bar with timestamp calculations and buffered state indicator.
- "In Sync" / "Out of Sync" status badges.
- Late-join "Catch Up" banner.
- Auto-hiding playback controls overlay to prevent distraction.

## 2. Room Controls (Top Bar)
- Glassmorphism top bar with seamless border-bottom.
- Room name editing area and host badge.
- Real-time latency indicator (Low/Med/High states).
- "Invite" modal featuring raw link copying, a QR code placeholder, and prominent Room ID.
- Access to Session Recap, Settings, and a Leave Room functionality with toast notifications.

## 3. Participants Panel (Collapsible Left Sidebar)
- List of active users with beautifully styled initials avatars.
- Distinguished "Host" indicator.
- Speaking wave animations (3 animated bars) for users currently transmitting audio.
- Active "Buffering" status tags for users lagging behind.
- Microphone mute/unmute indicators.
- Offline users section shown with reduced opacity.

## 4. Chat & Reactions Panel (Right Sidebar)
- Real-time simulated chat with rich message styles (avatars, varying colors, timestamps).
- Animated "Typing..." indicator.
- AI-generated context messages seamlessly injected into chat history.
- "Quick Reactions" bar enabling single-click emojis to float dynamically across the video player.
- AI Suggestion prompt chips (e.g., "React to this scene").
- History View tab displaying past watch party sessions.

## 5. Playback Controls (Bottom Overlay)
- Play / Pause button radiating a subtle glow effect.
- Horizontal seek bar with active state thumb visibility.
- Volume control complete with mute toggling and a CSS range slider.
- "Follow Host" toggle enabling/disabling playback sync locking.
- Fullscreen entry and exit button.

## 6. Voice / Video Chat Controls
- Floating glassmorphism pill housing voice options.
- Microphone toggle explicitly showing muted/unmuted states.
- Push-To-Talk (PTT) button integrating dynamic, animated audio level bars.
- Deafen and Video toggle states.

## 7. AI Assistant Integration (Smart Floating Widget)
- Glowing fixed-position floating action button (FAB).
- Slide-up, animated side-drawer with glass backdrop.
- "Thinking" loading states.
- 5 mock interactions: Summarize, Context ("What just happened?"), Recommend next content, Translate subtitles, and Show highlights.

## 8. Notifications & UX Details
- Toast notification system with animated ingress/egress.
- "Waiting for others" semi-transparent overlay indicating buffering users.
- Reconnecting overlay with forced blur.
- Live, styled multi-user cursor presence overlays moving across the video space.
- Beautiful modal design for Session Recaps highlighting AI-summarized watched events, group vibes, and peak highlights.

## Design Aesthetic
- Custom-built design token system entirely using CSS variables (no Tailwind necessary per request to ensure max flexibility, or easily mappable to Tailwind config).
- "Neon" minimal styling primarily focusing on Indigo/Purple and Sky Blue gradients over slate-dark backgrounds.
- High-fidelity shadows, smooth cubic-bezier transitions, and backdrop-filters (glassmorphism) throughout.
