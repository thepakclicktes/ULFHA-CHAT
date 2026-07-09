fetch("https://archive.org/download/SahihAlBukhariUrduComplete8Volumes/Sahih-Al-Bukhari-Volume-1-Urdu.pdf")
.then(r => r.text())
.then(t => console.log(t.substring(0, 500)))
.catch(console.error);
