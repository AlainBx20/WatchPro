import { useState, useEffect } from 'react';
import { 
  Search, X, Play, Youtube, Activity, Flame, Music, 
  Gamepad2, Film, Star, Monitor, Tv, Clapperboard, Sparkles, MoveLeft,
  Maximize2, Minimize2
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

// ─── RapidAPI key (yt-api is subscribed, supports browser CORS) ───────────────
const RAPIDAPI_KEY = '7d578dc37emsh7dadcf838a93c33p19e3d5jsn4cf978dfdc85';

const YOUTUBE_CATEGORIES = ['Trending', 'Music', 'Gaming', 'Animation', 'Movies'];

export default function ContentBrowser({ onSelect, onClose }) {
  const [browserMode, setBrowserMode] = useState('youtube'); // 'youtube' or 'movies'
  const [activeTab, setActiveTab] = useState('Trending');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // AI Detail View States
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moviesCache, setMoviesCache] = useState({});
  const [isMaximized, setIsMaximized] = useState(false);

  // ─── YouTube: call yt-api directly (RapidAPI has CORS, no emulator needed) ──
  const fetchYoutubeFeed = async (category = 'Trending') => {
    setIsSearching(true);
    setResults(null);
    try {
      const isSearch = category !== 'Trending';
      const url = isSearch
        ? `https://yt-api.p.rapidapi.com/search?query=${encodeURIComponent(category)}&hl=en&gl=US`
        : 'https://yt-api.p.rapidapi.com/trending?geo=US&hl=en';

      const res = await fetch(url, {
        headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': 'yt-api.p.rapidapi.com' }
      });
      if (!res.ok) throw new Error(`yt-api ${res.status}`);
      const json = await res.json();

      const videos = (json.data || []).filter(v => v.type === 'video').slice(0, 24).map(v => ({
        type: 'youtube',
        videoId: v.videoId,
        title: v.title,
        channel: v.channelTitle,
        thumbnail: (Array.isArray(v.thumbnail) ? v.thumbnail : []).find(t => t.width >= 320)?.url
                   || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: v.lengthText || '',
        views: v.viewCount ? Number(v.viewCount).toLocaleString() : ''
      }));
      setResults(videos);
    } catch (err) {
      console.error('YouTube feed failed:', err);
      setResults([]);
    }
    setIsSearching(false);
  };

  // ─── Movies: Highly Resilient Fetching via Direct Unblocked Mirrors ──────────
  const fetchMovies = async (genre = 'popular', searchQuery = '') => {
    setIsSearching(true);
    setResults(null);
    const params = new URLSearchParams({ limit: '24', sort_by: searchQuery ? 'title' : 'download_count' });
    if (searchQuery) params.set('query_term', searchQuery);
    if (genre && genre !== 'popular') params.set('genre', genre);
    const qs = params.toString();

    // These mirrors have been verified to allow direct browser CORS and are currently unblocked by Cloudflare
    const unblockedMirrors = [
      'https://movies-api.accel.li', 
      'https://yts.am',
      'https://yify.is'
    ];

    let found = false;
    for (const mirror of unblockedMirrors) {
      if (found) break;
      const url = `${mirror}/api/v2/list_movies.json?${qs}`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        
        const rawText = await res.text();
        if (rawText.startsWith('<')) continue; // Caught by Cloudflare HTML interstitial
        
        const json = JSON.parse(rawText);
        
        if (json?.status === 'ok' && json.data?.movies) {
          setResults(json.data.movies.map(m => {
            // Find the best torrent (prioritize 1080p with most seeds)
            const bestTorrent = m.torrents?.sort((a, b) => b.seeds - a.seeds).find(t => t.quality === '1080p') || m.torrents?.[0];
            
            return {
              type: 'movie', 
              id: m.id, 
              title: m.title, 
              year: m.year, 
              rating: m.rating,
              thumbnail: m.medium_cover_image, 
              summary: m.summary, 
              torrents: m.torrents, 
              seeds: bestTorrent?.seeds || 0,
              peers: bestTorrent?.peers || 0,
              url: m.url
            };
          }));
          found = true;
          break;
        }
      } catch (e) {
        console.warn(`Movie fetch failed for ${mirror}:`, e);
      }
    }
    
    if (!found) setResults([]);
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
        const url = `https://yt-api.p.rapidapi.com/search?query=${encodeURIComponent(query)}&hl=en&gl=US`;
        const res = await fetch(url, {
          headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': 'yt-api.p.rapidapi.com' }
        });
        const json = await res.json();
        const videos = (json.data || []).filter(v => v.type === 'video').slice(0, 24).map(v => ({
          type: 'youtube',
          videoId: v.videoId,
          title: v.title,
          channel: v.channelTitle,
          thumbnail: (Array.isArray(v.thumbnail) ? v.thumbnail : []).find(t => t.width >= 320)?.url
                     || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          duration: v.lengthText || '',
          views: v.viewCount ? Number(v.viewCount).toLocaleString() : ''
        }));
        setResults(videos);
      } catch (err) {
        console.error('YouTube search failed:', err);
        setResults([]);
      }
    } else {
      await fetchMovies('popular', query);
    }
    setIsSearching(false);
  };

  const handleSelect = async (item) => {
    // If it's a YouTube video, play immediately
    if (item.type === 'youtube') {
      onSelect(item.url);
      onClose();
      return;
    }

    // If it's a Movie, enter AI Detail View
    if (item.type === 'movie' || (browserMode === 'movies' && item.torrents)) {
      setSelectedMovie(item);
      setAiAnalysis(null);
      setIsAnalyzing(true);

      try {
        console.log(`🧠 Requesting AI Analysis for: ${item.title}`);
        const proxyMovieRecommendations = httpsCallable(functions, 'proxyMovieRecommendations');
        const res = await proxyMovieRecommendations({ movieTitle: item.title });
        
        if (res.data?.result?.movieAnalysis) {
          setAiAnalysis(res.data.result.movieAnalysis);
        } else {
          console.warn("AI returned no analysis data.");
        }
      } catch (err) {
        console.error("Failed to load AI recommendations:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const playMovie = (movieInfo) => {
    // Prioritize 1080p, then fall back
    const torrent = movieInfo.torrents?.sort((a,b) => b.seeds - a.seeds).find(t => t.quality === '1080p') || movieInfo.torrents?.[0];
    if (!torrent) return;
    
    // Crucial: Use WebSocket trackers for WebTorrent browser compatibility
    const wssTrackers = [
      'wss://tracker.openwebtorrent.com',
      'wss://tracker.btorrent.xyz',
      'wss://tracker.files.fm:7073/announce',
      'wss://tracker.gbitt.info',
      'wss://tracker.webtorrent.dev'
    ];
    
    // Include some high-traffic UDP trackers as well (for DHT/Desktop bridge fallback)
    const udpTrackers = [
      'udp://open.demonii.com:1337/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.coppersurfer.tk:6969',
      'udp://glotorrents.pw:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce'
    ];
    
    const allTrackers = [...wssTrackers, ...udpTrackers]
      .map(t => `&tr=${encodeURIComponent(t)}`).join('');
    
    // Prioritize direct .torrent URL (faster resolution) over magnet link
    const playUrl = torrent.url || `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(movieInfo.title)}${allTrackers}`;
    
    onSelect(playUrl);
    onClose();
  };

  const searchSimilarMovie = async (title) => {
    setSelectedMovie(null);
    setAiAnalysis(null);
    setQuery(title);
    
    // Trigger a fresh search for this specific title
    setIsSearching(true);
    setResults(null);
    await fetchMovies('popular', title);
    setIsSearching(false);
  };

  return (
    <div className="modal-overlay animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: isMaximized ? 0 : '20px' }}>
      <div className="modal-content animate-slideUp" style={{ 
        width: isMaximized ? '100%' : '92%', 
        maxWidth: isMaximized ? '100%' : 1100, 
        height: isMaximized ? '100%' : '88vh', 
        background: 'var(--bg-card)', 
        borderRadius: isMaximized ? '0' : '28px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        border: isMaximized ? 'none' : '1px solid var(--border)', 
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
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

          <button className="icon-btn" onClick={() => setIsMaximized(!isMaximized)} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
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

        {/* Grid or AI Detail View */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="custom-scroll">
          
          {selectedMovie ? (
            <div className="animate-fadeIn" style={{ padding: '0', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              {/* Back Button & Hero Backdrop */}
              <div style={{ position: 'relative', height: 280, width: '100%', overflow: 'hidden', background: '#000' }}>
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  backgroundImage: `url(${selectedMovie.thumbnail})`, 
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'blur(20px) brightness(0.4)', transform: 'scale(1.1)' 
                }} />
                
                <button 
                  onClick={() => { setSelectedMovie(null); setAiAnalysis(null); }}
                  style={{ 
                    position: 'absolute', top: 32, left: 32, zIndex: 20, 
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', 
                    padding: '10px 20px', borderRadius: 100, color: '#fff', 
                    fontSize: '0.9rem', fontWeight: 600, display: 'flex', 
                    alignItems: 'center', gap: 10, cursor: 'pointer', 
                    backdropFilter: 'blur(15px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s'
                  }}
                  className="hover-bright"
                >
                  <MoveLeft size={18} /> Back to Results
                </button>

                <div style={{ position: 'absolute', bottom: 30, left: 40, right: 40, display: 'flex', gap: 30, zIndex: 10, alignItems: 'flex-end' }}>
                  <img src={selectedMovie.thumbnail} alt="Poster" style={{ width: 140, borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ flex: 1, paddingBottom: 10 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{selectedMovie.title}</h1>
                    <div style={{ display: 'flex', gap: 15, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: 20 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Star size={14} fill="#fbbf24" color="#fbbf24" /> {selectedMovie.rating}/10</span>
                      <span>•</span>
                      <span>{selectedMovie.year}</span>
                      <span>•</span>
                      <span style={{ color: selectedMovie.seeds > 5 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{selectedMovie.seeds} Seeds</span>
                    </div>
                    <button 
                      onClick={() => playMovie(selectedMovie)}
                      style={{ background: '#10b981', color: '#000', padding: '12px 30px', borderRadius: 100, fontSize: '1rem', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
                      className="hover-scale"
                    >
                      <Play size={18} fill="#000" /> Watch Movie Now
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Analysis Area */}
              <div style={{ padding: '40px', background: 'var(--bg-card)', flex: 1 }}>
                {isAnalyzing ? (
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 20 }}>
                     <Sparkles className="animate-pulse" size={40} color="#10b981" />
                     <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 600 }}>AI is analyzing this movie...</div>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, textAlign: 'center' }}>Connecting to the intelligence network to extract themes, cultural impact, and hidden gems.</p>
                   </div>
                ) : aiAnalysis ? (
                   <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                     
                     {/* Themes & Style */}
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: 25, borderRadius: 20 }}>
                          <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} color="#10b981" /> Thematic Core</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {aiAnalysis.analysis?.themes?.map(theme => (
                              <span key={theme} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px 12px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600 }}>{theme}</span>
                            ))}
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginTop: 20 }}>{aiAnalysis.analysis?.style}</p>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: 25, borderRadius: 20 }}>
                          <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Flame size={18} color="#f59e0b" /> Cultural Impact</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{aiAnalysis.analysis?.impact}</p>
                        </div>
                     </div>

                     {/* Similar Movies */}
                     {aiAnalysis.similarMovies && aiAnalysis.similarMovies.length > 0 && (
                       <div>
                         <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={20} color="#8b5cf6" /> If you like this, you'll love...</h3>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                           {aiAnalysis.similarMovies.map((sim, idx) => (
                             <div 
                               key={idx}
                               onClick={() => searchSimilarMovie(sim.title)}
                               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '20px', borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                               className="hover-scale"
                             >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{sim.title}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sim.year} • {sim.director}</span>
                                  </div>
                                  <Search size={16} color="var(--text-muted)" />
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: 0 }}>{sim.similarityReason}</p>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                   </div>
                ) : (
                   <div style={{ padding: 40, color: 'var(--text-muted)' }}>
                     {selectedMovie.summary}
                   </div>
                )}
              </div>

            </div>
          ) : isSearching ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 15, padding: 100 }}>
               <div className="loader-ring" style={{ borderTopColor: browserMode === 'youtube' ? 'var(--accent-bright)' : '#10b981' }}></div>
               <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fetching live catalogs...</div>
             </div>
          ) : (results && results.length > 0) ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${browserMode === 'movies' ? '180px' : '280px'}, 1fr))`, gap: '24px', padding: '32px' }}>
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
                       {browserMode === 'youtube' ? <Play fill="#fff" size={32} /> : <Sparkles fill="#10b981" color="#10b981" size={32} />}
                    </div>
                    {item.rating && (
                       <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 6, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
                         <Star size={10} fill="currentColor" /> {item.rating}
                       </div>
                    )}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#fff' }}>{item.title}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{item.channel || item.year}</p>
                      {item.seeds !== undefined && (
                        <span style={{ fontSize: '0.65rem', color: item.seeds > 10 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          ↑ {item.seeds}
                        </span>
                      )}
                    </div>
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
