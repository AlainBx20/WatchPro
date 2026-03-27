import { useEffect, useRef, useState } from 'react';

// Singleton client to avoid creating multiple webtorrent clients
let wtClient = null;

export default function WebTorrentPlayer({ 
  url, volume, isMuted, isHost,
  onReady, onStateChange, onProgressUpdate, onDurationUpdate
}) {
  const videoRef = useRef(null);
  const playTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  
  const [loadingMsg, setLoadingMsg] = useState('Initializing P2P Engine...');
  const [downloadSpeed, setDownloadSpeed] = useState('0 KB/s');
  const [peers, setPeers] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    if (!url || !url.startsWith('magnet:')) return;
    
    // Fallback if WebTorrent didn't load
    if (!window.WebTorrent) {
      setLoadingMsg("WebTorrent library failed to load.");
      return;
    }

    if (!wtClient) {
      wtClient = new window.WebTorrent({
        tracker: {
          rtcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
            ]
          }
        }
      });
    }
    
    // Cleanup any existing torrents before adding new
    wtClient.torrents.forEach(t => t.destroy());

    // Aggressive & modern high-performance tracker list to ensure connectivity
    const announce = [
      'wss://tracker.openwebtorrent.com',
      'wss://tracker.btorrent.xyz',
      'wss://tracker.files.fm:7073/announce',
      'wss://tracker.gbitt.info',
      'wss://tracker.webtorrent.dev',
      'wss://tracker.polyane.ovh',
      'wss://tracker.fastcast.nz',
      'wss://tracker.swateam.org.uk:443/announce',
      'wss://tracker.archive.org:443/announce',
      'wss://tracker.novage.com.ua:443/announce',
      'wss://tracker.lineageos.org:443/announce'
    ];

    setLoadingMsg('Resolving Magnet Metadata...');
    setIsReady(false);
    setErrorStatus(null);
    
    // Auto-append trackers to the magnet URL if they aren't there
    let refinedUrl = url;
    announce.forEach(tr => {
      if (!refinedUrl.includes(encodeURIComponent(tr))) {
        refinedUrl += `&tr=${encodeURIComponent(tr)}`;
      }
    });

    // Timeout if we can't find any peers to get metadata from
    const resolutionTimeout = setTimeout(() => {
      if (!isReady && peers === 0) {
        setLoadingMsg('Resolution Timeout');
        setErrorStatus('Unable to find WebTorrent peers for this movie. The swarm might be BitTorrent-only or dead.');
      }
    }, 25000);

    const torrent = wtClient.add(refinedUrl, (torrent) => {
      clearTimeout(resolutionTimeout);
      // Torrent is ready to be streamed
      setLoadingMsg('Mounting Stream...');
      
      // Find the biggest video file
      const file = torrent.files.find(function (file) {
        return file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mkv');
      });
      
      if (!file) {
        setLoadingMsg('Error: No supported video format found in payload.');
        return;
      }
      
      // Render to hidden video tag or attach directly
      if (videoRef.current) {
        file.renderTo(videoRef.current, { autoplay: false, muted: true });
        
        // Wait for video element to get standard metadata
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
          onDurationUpdate(videoRef.current.duration || 0);
          onReady(videoRef.current);
          setLoadingMsg('');
        };

        // Notify parent state changes (Host needs to broadcast these)
        videoRef.current.onplay = () => { if(isHost) onStateChange('playing'); };
        videoRef.current.onpause = () => { if(isHost) onStateChange('paused'); };
      }
    });

    torrent.on('download', (bytes) => {
      setDownloadSpeed(formatSpeed(wtClient.downloadSpeed));
      setPeers(torrent.numPeers);
    });

    torrent.on('error', (err) => {
      console.warn("Torrent Error:", err);
      setLoadingMsg(`Error: ${err.message}`);
    });

    heartbeatTimer.current = setInterval(() => {
      if (isReady && videoRef.current && isHost) {
        onProgressUpdate(videoRef.current.currentTime);
      }
    }, 1000);

    return () => {
      clearInterval(heartbeatTimer.current);
      if (torrent) torrent.destroy();
    };
  }, [url]);

  // Sync Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : (volume / 100);
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, isReady]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <video 
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: isReady ? 'block' : 'none' }}
        controls={false}
        playsInline
      />
      
      {!isReady && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {errorStatus ? (
            <div style={{ maxWidth: 450, textAlign: 'center', padding: 20 }}>
              <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>⚠️ {loadingMsg}</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6 }}>{errorStatus}</p>
            </div>
          ) : (
            <>
              <div className="loader-ring" style={{ width: 50, height: 50, borderTopColor: '#10b981' }}></div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{loadingMsg}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 16px', borderRadius: 20 }}>
                <span>↓ {downloadSpeed}</span>
                <span>•</span>
                <span>👥 {peers} Peers</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Persistent Speed Overlay when Playing (Optional subtle UI) */}
      {isReady && peers > 0 && (
        <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 6, fontSize: '0.65rem', color: '#10b981', display: 'flex', gap: 8, backdropFilter: 'blur(4px)', pointerEvents: 'none', zIndex: 10 }}>
          <span>{downloadSpeed}</span>
          <span>{peers} Peers</span>
        </div>
      )}

    </div>
  );
}

function formatSpeed(bytes) {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
