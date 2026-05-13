const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.goto('http://localhost:5173/Ultimate/');
  
  try {
    await page.waitForSelector('input[type="text"]', { timeout: 2000 });
    await page.type('input[type="text"]', 'John');
    
    // Quick evaluate to click through setup
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Next Step'));
      if (nextBtn) nextBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Next Step'));
      if (nextBtn) nextBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const finishBtn = buttons.find(b => b.textContent.includes('Finish Setup'));
      if (finishBtn) finishBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    console.log('Setup skip err:', e.message);
  }
  
  await browser.close();
})();
