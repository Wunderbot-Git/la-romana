const https = require('https');

https.get('https://ryder-cup-api-537649498894.us-central1.run.app/events/75acb87f-accd-4382-b75d-389f4b9f2d1e/leaderboard', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try { 
       const json = JSON.parse(data);
       console.log('Matches count:', json.matches?.length);
       if (json.matches) {
           console.log('Sample match:', json.matches[0]);
       }
       if (json.statusCode) {
           console.log('Error:', json);
       }
    } catch(e) { console.log('Parse error:', e, data.substring(0, 100)); }
  });
});
