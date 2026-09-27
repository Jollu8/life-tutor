const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.TEST_URL||'http://127.0.0.1:4173';
 await page.goto(url);await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),18);assert.match(await page.locator('#result-count').textContent(),/608/);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`horizontal overflow at ${width}`);
  await page.screenshot({path:`/tmp/life-bloom-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 assert.ok((await page.locator('.card').first().boundingBox()).y<540,'cards should appear near the top on mobile');
 await page.locator('.save-button').first().click();assert.equal(await page.locator('#plan-count').textContent(),'1');
 await page.locator('[data-view=plan]').click();await page.locator('.done-label input').check();
 await page.reload();await page.waitForSelector('.card');await page.locator('[data-view=plan]').click();assert.equal(await page.locator('.done-label input').isChecked(),true);
 await page.locator('#custom-title').fill('Погулять в парке');await page.locator('#custom-form button').click();assert.equal(await page.locator('#plan-count').textContent(),'2');
 await page.locator('.calendar-button').first().click();await page.locator('#calendar-date').fill('2026-12-31');
 const downloadPromise=page.waitForEvent('download');await page.locator('#calendar-form button[type=submit]').click();const download=await downloadPromise;
 const ics=await fs.readFile(await download.path(),'utf8');assert.match(ics,/DTSTART;VALUE=DATE:20261231/);assert.match(ics,/DTEND;VALUE=DATE:20270101/);assert.match(ics,/SUMMARY:Погулять в парке/);for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
 const exportPromise=page.waitForEvent('download');await page.locator('#export').click();const exported=await exportPromise;const backup=await fs.readFile(await exported.path(),'utf8');assert.equal(Object.keys(JSON.parse(backup).saved).length,2);
 await page.locator('#import').setInputFiles({name:'plan.json',mimeType:'application/json',buffer:Buffer.from(backup)});assert.equal(await page.locator('#plan-count').textContent(),'2');
 await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"saved":{"__proto__":false},"custom":[]}')});await page.waitForTimeout(100);assert.equal(await page.locator('#plan-count').textContent(),'2');
 await page.locator('[data-view=all]').click();await page.locator('#search').fill('несуществующая-фраза-000');await page.waitForTimeout(250);assert.equal(await page.locator('.card').count(),0);assert.equal(await page.locator('#empty').isVisible(),true);await page.locator('#reset').click();
 await page.locator('#section').selectOption('2');assert.match(await page.locator('#result-count').textContent(),/40/);
 await page.locator('#load-more').click();assert.equal(await page.locator('.card').count(),36);
 const target=page.locator('.card').nth(22);const targetID=await target.getAttribute('data-id');await target.locator('summary').click();await target.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(500);
 const reading=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-in-bloom:reading:v1')));assert.equal(reading.id,targetID);assert.ok(reading.open.includes(targetID));
 await page.reload();await page.waitForSelector('.card');assert.equal(await page.locator('#resume-reading').isVisible(),true);await page.locator('#resume-button').click();
 assert.equal(await page.locator('#section').inputValue(),'2');assert.equal(await page.locator('.card').count(),36);assert.equal(await page.locator(`.card[data-id="${targetID}"] details`).getAttribute('open'),'');
 const rect=await page.locator(`.card[data-id="${targetID}"]`).boundingBox();assert.ok(rect.y>=-10&&rect.y<innerHeightForTest(),'restored reading position');
 await page.locator('[data-view=all]').click();await page.locator('[data-category=family]').click();assert.ok(await page.locator('.card').count()>0);await page.locator('#evidence').selectOption('A');for(const badge of await page.locator('.evidence').allTextContents())assert.equal(badge,'A');
 assert.equal(await page.locator('a[href="https://jollu8.github.io"]').count(),1);assert.equal(await page.locator('a[href="https://t.me/jollu8"]').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS: 608 entries; 4 responsive widths; search and filters; plan persistence; custom tasks; backup import/export; valid calendar download; restored reading position and expanded details; no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
function innerHeightForTest(){return 844;}
