fetch("https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf", { method: 'HEAD', headers: { Origin: 'http://localhost:3000' } })
  .then(res => {
    console.log("Status:", res.status);
    console.log("A-C-A-O:", res.headers.get('Access-Control-Allow-Origin'));
  })
  .catch(console.error);
