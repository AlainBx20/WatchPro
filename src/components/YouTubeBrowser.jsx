import { useState, useEffect } from 'react';
import { 
  Search, X, Play, Youtube, Activity, Flame, Music, 
  Gamepad2, Film, Star, Monitor, Tv, Clapperboard 
} from 'lucide-react';
import { generateYoutubeSearch } from '../services/gemini';

const YOUTUBE_CATEGORIES = ['Trending', 'Music', 'Gaming', 'Animation', 'Movies'];

export default function ContentBrowser({ onSelect, onClose }) {
  const [browserMode, setBrowserMode] = useState('youtube'); // 'youtube' or 'movies'
  const [activeTab, setActiveTab] = useState('Trending');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [moviesCache, setMoviesCache] = useState({});

  // LIVE YouTube Fetcher (Non-AI)
  const fetchYoutubeFeed = async (category = 'Trending') => {
    setIsSearching(true);
    setResults(null);
    try {
      const type = category === 'Trending' ? 'trending' : 'search';
      const q = category === 'Trending' ? '' : `&q=${encodeURIComponent(category)}`;
      const url = `https://inv.riverside.rocks/api/v1/${type}${q ? q : ''}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      const formatted = (Array.isArray(data) ? data : data.videos || []).slice(0, 24).map(v => ({
        type: 'youtube',
        title: v.title,
        channel: v.author,
        thumbnail: v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: v.durationText || "0:00",
        views: (v.viewCount || 0).toLocaleString()
      }));
      setResults(formatted);
    } catch (err) {
      console.error("YouTube feed failed", err);
      setResults([]);
    }
    setIsSearching(false);
  };

  // Fetch movies helper with Bulletproof Failover (Direct Mirrors -> Proxies)
  const fetchMovies = async (genre = 'popular', searchQuery = '') => {
    setIsSearching(true);
    setResults(null); 
    
    // Cloudflare 1016 fix: try multiple mirrors
    const domains = ['yts.mx', 'yts.pm', 'yts.rs', 'yts.lt'];
    const proxies = [
      (url) => url, // Try direct first
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    let success = false;
    for (const domain of domains) {
      if (success) break;
      
      const target = `https://${domain}/api/v2/list_movies.json?limit=24&sort_by=${searchQuery ? 'title' : 'download_count'}${searchQuery ? `&query_term=${encodeURIComponent(searchQuery)}` : ''}${genre && genre !== 'popular' ? `&genre=${genre}` : ''}`;

      for (const proxyFn of proxies) {
        if (success) break;
        try {
          const res = await fetch(proxyFn(target));
          if (!res.ok) continue;
          
          let data = await res.json();
          if (data.contents) data = JSON.parse(data.contents);

          if (data.status === 'ok' && data.data.movies) {
            setResults(data.data.movies.map(m => ({
              type: 'movie', id: m.id, title: m.title, year: m.year, rating: m.rating,
              thumbnail: m.medium_cover_image, summary: m.summary, torrents: m.torrents, url: m.url
            })));
            success = true;
          }
        } catch (err) { continue; }
      }
    }
    if (!success) setResults([]);
    setIsSearching(false);
  };

  useEffect(() => {
    if (!query) {
      if (browserMode === 'movies') {
        fetchMovies(activeTab.toLowerCase());
      } else {
        fetchYoutubeFeed(activeTab);
      }
    }
  }, [browserMode, activeTab]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults(null);

    if (browserMode === 'youtube') {
      try {
        // High-speed Invidious Search (Non-AI)
        const res = await fetch(`https://inv.riverside.rocks/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        const data = await res.json();
        const formatted = data.slice(0, 24).map(v => ({
          type: 'youtube',
          title: v.title,
          channel: v.author,
          thumbnail: v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          duration: v.durationText || "0:00",
          views: (v.viewCount || 0).toLocaleString()
        }));
        setResults(formatted);
      } catch (err) {
        console.error("YouTube search failed", err);
        setResults([]);
      }
    } else {
      await fetchMovies('popular', query);
    }
    setIsSearching(false);
  };

  const handleSelect = (item) => {
    if (item.type === 'movie' || (browserMode === 'movies' && item.torrents)) {
      const torrent = item.torrents.find(t => t.quality === '1080p') || item.torrents[0];
      const trackers = [
        'udp://open.demonii.com:1337/announce',
        'udp://tracker.openbittorrent.com:80',
        'udp://tracker.coppersurfer.tk:6969'
      ].map(t => `&tr=${encodeURIComponent(t)}`).join('');
      const magnet = `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(item.title)}${trackers}`;
      onSelect(magnet);
    } else {
      onSelect(item.url);
    }
    onClose();
  };

  return (
    <div className="modal-overlay animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
      <div className="modal-content animate-slideUp" style={{ width: '92%', maxWidth: 1100, height: '88vh', background: 'var(--bg-card)', borderRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8)' }}>
        
        {/* Top Navbar: Mode Switch */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => { setBrowserMode('youtube'); setActiveTab('Trending'); setResults(null); }}
            style={{ 
              flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: '0.9rem', fontWeight: 700, color: browserMode === 'youtube' ? 'var(--accent-bright)' : 'var(--text-muted)',
              background: browserMode === 'youtube' ? 'rgba(124,58,237,0.1)' : 'transparent',
              borderBottom: `2px solid ${browserMode === 'youtube' ? 'var(--accent-bright)' : 'transparent'}`,
              transition: 'all 0.2s'
            }}
          >
            <Youtube size={18} /> YouTube
          </button>
          <button 
            onClick={() => { setBrowserMode('movies'); setActiveTab('Popular'); setResults(null); }}
            style={{ 
              flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: '0.9rem', fontWeight: 700, color: browserMode === 'movies' ? '#10b981' : 'var(--text-muted)',
              background: browserMode === 'movies' ? 'rgba(16,185,129,0.1)' : 'transparent',
              borderBottom: `2px solid ${browserMode === 'movies' ? '#10b981' : 'transparent'}`,
              transition: 'all 0.2s'
            }}
          >
            <Clapperboard size={18} /> Movies & TV
          </button>
        </div>

        {/* Header Options */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, color: 'var(--text-muted)' }} />
            <input 
              autoFocus
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder={browserMode === 'youtube' ? "Search YouTube..." : "Search Movies & Series..."}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', padding: '12px 16px 12px 46px', borderRadius: '100px', fontSize: '0.95rem', color: '#fff', outline: 'none' }}
            />
            {query && <X size={16} style={{ position: 'absolute', right: 16, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => {setQuery(''); setResults(null);}} />}
          </form>

          <button className="icon-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)' }}><X size={20} /></button>
        </div>

        {/* Sub-Tabs */}
        {!results && (
          <div className="hide-scroll" style={{ padding: '0 32px', display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
            {(browserMode === 'youtube' ? YOUTUBE_CATEGORIES : ['popular', 'action', 'sci-fi', 'horror', 'romance', 'animation']).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setResults(null); }}
                style={{
                  padding: '16px 0', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: activeTab === tab ? (browserMode === 'youtube' ? 'var(--accent-bright)' : '#10b981') : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab ? (browserMode === 'youtube' ? 'var(--accent-bright)' : '#10b981') : 'transparent'}`,
                  background: 'transparent', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }} className="custom-scroll">
          {isSearching ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 15 }}>
               <div className="loader-ring" style={{ borderTopColor: browserMode === 'youtube' ? 'var(--accent-bright)' : '#10b981' }}></div>
               <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fetching live {browserMode}...</div>
             </div>
          ) : (results && results.length > 0) ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${browserMode === 'movies' ? '180px' : '280px'}, 1fr))`, gap: '24px' }}>
              {results.map((item, i) => (
                <div 
                  key={i} 
                  className="media-card group animate-fadeIn"
                  onClick={() => handleSelect(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ 
                    position: 'relative', width: '100%', 
                    aspectRatio: browserMode === 'movies' && !results?.some(r=>r.type==='youtube') ? '2/3' : '16/9', 
                    borderRadius: 16, overflow: 'hidden', background: '#111' 
                  }}>
                    <img src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hq720.jpg`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="group-hover:opacity-100">
                       <Play fill="#fff" size={32} />
                    </div>
                    {item.rating && (
                       <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 6, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
                         <Star size={10} fill="currentColor" /> {item.rating}
                       </div>
                    )}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#fff' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{item.channel || item.year}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 100, color: 'var(--text-muted)' }}>
              No content found. Please try a different category or search query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
