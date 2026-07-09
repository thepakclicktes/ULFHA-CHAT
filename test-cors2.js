fetch("https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf", { method: 'HEAD', headers: { Origin: 'http://localhost:3000', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } })
  .then(res => {
    console.log("Status:", res.status);
    console.log("A-C-A-O:", res.headers.get('Access-Control-Allow-Origin'));
  })
  .catch(console.error);
