// Testing alternative torrent APIs that aren't YTS
import { writeFileSync } from 'fs';

const results = [];
const log = str => { console.log(str); results.push(str); };

async function testApi(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      log(`❌ ${name}: HTTP ${res.status}`);
      return;
    }
    const text = await res.text();
    if (text.startsWith('<')) {
      log(`❌ ${name}: HTML response (cloudflare?)`);
      return;
    }
    const json = JSON.parse(text);
    log(`✅ ${name}: SUCCESS!`);
    log(`Sample: ${JSON.stringify(json).slice(0, 300)}\n`);
  } catch (e) {
    log(`❌ ${name}: ${e.message}`);
  }
}

(async () => {
  log('Testing APIs...\n');
  
  await testApi('PopcornTime Movies', 'https://tv-v2.api-fetch.website/movies/1?sort=trending');
  await testApi('PopcornTime Alternate', 'https://popcorn-ru.tk/movies/1');
  await testApi('APIBay Search', 'https://apibay.org/q.php?q=Inception&cat=200');
  await testApi('YTS Clone 1', 'https://yts.do/api/v2/list_movies.json?limit=1');
  await testApi('YTS Clone 2', 'https://yify.is/api/v2/list_movies.json?limit=1');
  await testApi('YTS Clone 3', 'https://yts.am/api/v2/list_movies.json?limit=1');
  await testApi('EZTV', 'https://eztvx.to/api/get-torrents?limit=1');
  
  writeFileSync('./api_alternatives_results.txt', results.join('\n'));
})();
