const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', response => {
    if (!response.ok()) {
      console.log('NETWORK ERROR:', response.status(), response.url());
    }
  });
  
  try {
    await page.goto('http://localhost:3012/leaderboard', { waitUntil: 'networkidle0' });
    const content = await page.content();
    console.log("HTML length:", content.length);
    if (content.includes('Application error: a client-side exception has occurred')) {
      console.log("CLIENT SIDE EXCEPTION FOUND IN HTML");
    }
  } catch (err) {
    console.log('Nav error:', err);
  }
  
  await browser.close();
})();
