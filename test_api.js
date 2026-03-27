// Test movies-api.accel.li
async function testAPI() {
  const url = 'https://movies-api.accel.li/api/v2/list_movies.json?limit=5';
  console.log('Fetching', url);
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('Status:', res.status, res.ok);
    console.log('Movies count:', json.data.movies.length);
    console.log('First Title:', json.data.movies[0].title);
    
    // Check if CORS exists
    console.log('CORS Header:', res.headers.get('access-control-allow-origin'));
  } catch(e) {
    console.log('Error:', e.message);
  }
}
testAPI();
