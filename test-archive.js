import { Readable } from 'stream';

async function test() {
  const url = "https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf";
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/pdf, *;q=0.9',
    },
    redirect: 'follow'
  });
  console.log(response.status);
  console.log(response.headers);
}
test();
