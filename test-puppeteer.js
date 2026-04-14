const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:3012/leaderboard', { waitUntil: 'networkidle0' });
  } catch (err) {
    console.log('Nav error:', err);
  }
  
  await browser.close();
})();
