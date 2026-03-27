const { onCall, HttpsError } = require('firebase-functions/v2/https');

// A secure, server-side proxy for Ollama to avoid browser CORS issues.
// React Client -> Firebase Cloud Function -> Ollama (Ngrok/Local)
exports.proxyOllama = onCall(async (request) => {
  const { auth, data } = request;

  // 1. Potential security check: ensure user is logged in
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to access AI features.');
  }

  const { prompt, model, jsonMode } = data;

  // URL of the Ollama instance (can be ngrok or local if functions running locally)
  // We use the user's current ngrok as the target.
  const OLLAMA_URL = "https://rosanna-nerveless-juicily.ngrok-free.dev/api/generate";

  try {
    console.log(`🤖 Backend Proxy: Requesting ${model} from Ollama...`);

    // We use the built-in fetch of Node 18
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420"
      },
      body: JSON.stringify({
        model: model || "qwen2.5:14b",
        prompt: prompt,
        stream: false,
        format: jsonMode ? "json" : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ollama Proxy Error (${response.status}):`, errorText);
      throw new HttpsError('internal', `Ollama Proxy Error: ${response.status}`);
    }

    const result = await response.json();
    return { response: result.response };

  } catch (error) {
    console.error('❌ AI Proxy Failure:', error);
    throw new HttpsError('internal', error.message || 'AI Proxy failed to reach Ollama.');
  }
});

// A secure, server-side proxy for RapidAPI Movie Recommendations
// Bypasses CORS and hides the API key from the client
exports.proxyMovieRecommendations = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to get AI recommendations.');
  }

  const { movieTitle } = data;
  if (!movieTitle) {
    throw new HttpsError('invalid-argument', 'movieTitle is required');
  }

  // Use environment variable for the API key in production, fallback to hardcoded for testing
  const RAPIDAPI_KEY = process.env.VITE_RAPIDAPI_KEY || '7d578dc37emsh7dadcf838a93c33p19e3d5jsn4cf978dfdc85';

  const URL = 'https://ai-movie-recommendations-reviews-suggestions-api.p.rapidapi.com/analyzeSimilarMovies?noqueue=1';

  try {
    console.log(`🎬 AI Proxy: Fetching recommendations for "${movieTitle}"...`);
    
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'ai-movie-recommendations-reviews-suggestions-api.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        movieTitle: movieTitle,
        lang: 'en'
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ RapidAPI Proxy Error (${response.status}):`, errorText);
        throw new HttpsError('internal', `RapidAPI Error: ${response.status}`);
    }

    const json = await response.json();
    return json;

  } catch (error) {
    console.error('❌ RapidAPI Proxy Failure:', error);
    throw new HttpsError('internal', error.message || 'Failed to reach RapidAPI.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Proxy — uses yt-api.p.rapidapi.com (confirmed working with our key)
// ─────────────────────────────────────────────────────────────────────────────
exports.proxyYoutube = onCall(async (request) => {
  const { data } = request;
  const RAPIDAPI_KEY = process.env.VITE_RAPIDAPI_KEY || '7d578dc37emsh7dadcf838a93c33p19e3d5jsn4cf978dfdc85';

  const { type, query, geo = 'US', hl = 'en' } = data;
  // type: 'trending' | 'search'
  let url;
  if (type === 'search') {
    url = `https://yt-api.p.rapidapi.com/search?query=${encodeURIComponent(query)}&hl=${hl}&gl=${geo}`;
  } else {
    url = `https://yt-api.p.rapidapi.com/trending?geo=${geo}&hl=${hl}${query ? `&type=${query}` : ''}`;
  }

  console.log(`📺 YouTube Proxy: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'yt-api.p.rapidapi.com'
      }
    });
    if (!res.ok) throw new HttpsError('internal', `yt-api returned ${res.status}`);
    const json = await res.json();

    // Normalize into a consistent format for the frontend
    const videos = (json.data || []).filter(v => v.type === 'video').map(v => ({
      type: 'youtube',
      videoId: v.videoId,
      title: v.title,
      channel: v.channelTitle,
      thumbnail: v.thumbnail?.find(t => t.width >= 320)?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      duration: v.lengthText || '',
      views: v.viewCount ? Number(v.viewCount).toLocaleString() : '',
      publishedAt: v.publishedTimeText || ''
    }));

    return { videos };
  } catch (error) {
    console.error('❌ YouTube Proxy Error:', error);
    throw new HttpsError('internal', error.message || 'YouTube proxy failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Movies Proxy — calls YTS from server-side (no browser DNS issues)
// ─────────────────────────────────────────────────────────────────────────────
exports.proxyMovies = onCall(async (request) => {
  const { data } = request;
  const { genre = '', searchQuery = '', limit = 24 } = data;

  const params = new URLSearchParams({
    limit: String(limit),
    sort_by: searchQuery ? 'title' : 'download_count'
  });
  if (searchQuery) params.set('query_term', searchQuery);
  if (genre && genre !== 'popular') params.set('genre', genre);

  // Try multiple YTS mirrors — server-side DNS can resolve these fine
  const mirrors = [
    'https://yts.mx',
    'https://yts.torrentbay.st',
    'https://yts.pm',
    'https://yts.rs'
  ];

  for (const mirror of mirrors) {
    try {
      const url = `${mirror}/api/v2/list_movies.json?${params}`;
      console.log(`🎬 Movies Proxy: ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status === 'ok' && json.data.movies) {
        return { movies: json.data.movies };
      }
    } catch (e) {
      console.warn(`Mirror ${mirror} failed: ${e.message}`);
      continue;
    }
  }

  console.error('❌ All YTS mirrors failed');
  throw new HttpsError('internal', 'All movie sources are currently unavailable');
});
