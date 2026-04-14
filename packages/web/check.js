const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to http://localhost:3002/signup...');
    await page.goto('http://localhost:3002/signup', { waitUntil: 'networkidle0' });

    await page.type('input[type="text"]', 'Test User');
    await page.type('input[type="email"]', 'test_debug_' + Date.now() + '@test.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 3000));

    console.log('Navigating to http://localhost:3002/leaderboard...');
    await page.goto('http://localhost:3002/leaderboard', { waitUntil: 'networkidle0' });

    console.log('Current URL:', page.url());
    const mainContent = await page.$eval('body', el => el.innerText).catch(e => 'No body tag found');
    console.log('Body text:', mainContent);

    await browser.close();
})();
