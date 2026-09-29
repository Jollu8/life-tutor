const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const content = require('../assets/advice.ru.json');
const url = process.env.TEST_URL || 'http://127.0.0.1:4173';
const store = 'life-in-bloom:plan:v1', bookmark = 'life-in-bloom:reading:v1';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForSelector('.card');
    assert.equal(await page.locator('.card').count(), 18);
    assert.equal(await page.locator('#result-count').textContent(), `Найдено: ${content.entries.length}`);
    assert.equal(await page.locator('.archived').count(), 0);
    assert.ok(!(await page.locator('#cards').textContent()).includes('В Китае'));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
      await page.screenshot({ path: `/tmp/life-bloom-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok((await page.locator('.card').first().boundingBox()).y < 620, 'compact mobile layout');
    // Rotate with expanded content: both cards and their contents must stay apart.
    await page.locator('.card details').first().evaluate(el => { el.open = true; });
    for (const [width, height] of [[844, 390], [390, 844], [667, 375], [375, 667], [1024, 768], [320, 568]]) {
      await page.setViewportSize({ width, height });
      const overlaps = await page.locator('.card').evaluateAll(cards => {
        const issues = [];
        const rects = cards.map(card => card.getBoundingClientRect());
        rects.forEach((a, i) => {
          rects.slice(i + 1).forEach(b => {
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push(cards[i].dataset.id);
          });
          const parts = [...cards[i].children].map(el => el.getBoundingClientRect());
          if (parts.some((part, j) => j && part.top < parts[j - 1].bottom - 1)) issues.push(`contents: ${cards[i].dataset.id}`);
          if (parts.some(part => part.bottom > a.bottom + 1)) issues.push(`height: ${cards[i].dataset.id}`);
        });
        return issues;
      });
      assert.deepEqual(overlaps, [], `overlapping cards after rotation to ${width}x${height}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `rotation overflow at ${width}`);
    }
    await page.locator('.card details').first().evaluate(el => { el.open = false; });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#region').selectOption('moscow');
    assert.equal(await page.locator('.card').count(), Math.min(18, content.entries.filter(e => e.region === 'moscow').length));
    assert.ok((await page.locator('.region-badge').allTextContents()).every(t => t === 'Москва'));
    await page.locator('.card').first().locator('summary').click();
    assert.ok(await page.locator('.source-list a').first().getAttribute('href'));
    assert.ok((await page.locator('.review-meta').first().textContent()).includes('27.09.2026'));
    await page.locator('#region').selectOption('russia');
    assert.ok(!(await page.locator('.region-badge').allTextContents()).includes('Москва'));
    await page.locator('#evidence').selectOption('editorial');
    assert.ok(await page.locator('.card').count() > 0);
    for (const id of await page.locator('.card').evaluateAll(nodes => nodes.map(n => n.dataset.id))) assert.equal(content.entries.find(e => e.id === id).basis, 'editorial');
    await page.locator('[data-view=all]').click();
    await page.locator('.card[data-id="1-1"] .save-button').click();
    await page.locator('[data-view=plan]').click(); await page.locator('.done-label input').check();
    await page.reload(); await page.waitForSelector('.card'); await page.locator('[data-view=plan]').click();
    assert.equal(await page.locator('.done-label input').isChecked(), true);
    await page.locator('#custom-title').fill('Погулять в парке'); await page.locator('#custom-form button').click();
    assert.equal(await page.locator('#plan-count').textContent(), '2');
    await page.locator('.calendar-button').first().click(); await page.locator('#calendar-date').fill('2026-12-31');
    const downloaded = page.waitForEvent('download'); await page.locator('#calendar-form button[type=submit]').click();
    const ics = await fs.readFile(await (await downloaded).path(), 'utf8');
    assert.match(ics, /DTSTART;VALUE=DATE:20261231/); assert.match(ics, /DTEND;VALUE=DATE:20270101/); assert.match(ics, /SUMMARY:Погулять в парке/);
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    const exported = page.waitForEvent('download'); await page.locator('#export').click();
    const backup = await fs.readFile(await (await exported).path(), 'utf8'); assert.equal(Object.keys(JSON.parse(backup).saved).length, 2);
    await page.locator('#import').setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    assert.equal(await page.locator('#plan-count').textContent(), '2');
    await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"saved":{"__proto__":false},"custom":[]}') });
    await page.waitForTimeout(100); assert.equal(await page.locator('#plan-count').textContent(), '2');
    await page.locator('[data-view=all]').click(); await page.locator('#search').fill('несуществующая-фраза-000'); await page.waitForTimeout(250);
    assert.equal(await page.locator('.card').count(), 0); await page.locator('#reset').click();
    await page.locator('#region').selectOption('russia'); await page.locator('#load-more').click();
    assert.equal(await page.locator('.card').count(), 36);
    const target = page.locator('.card').nth(22), targetID = await target.getAttribute('data-id');
    await target.locator('summary').click(); await target.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.waitForTimeout(500);
    const reading = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), bookmark);
    assert.equal(reading.id, targetID); assert.equal(reading.region, 'russia'); assert.ok(reading.open.includes(targetID));
    await page.reload(); await page.waitForSelector('.card'); await page.locator('#resume-button').click();
    assert.equal(await page.locator('#region').inputValue(), 'russia'); assert.equal(await page.locator('.card').count(), 36);
    assert.equal(await page.locator(`.card[data-id="${targetID}"] details`).getAttribute('open'), '');
    const rect = await page.locator(`.card[data-id="${targetID}"]`).boundingBox(); assert.ok(rect.y >= -10 && rect.y < 844);
    assert.equal(await page.locator('a[href="https://jollu8.github.io"]').count(), 1);
    assert.equal(await page.locator('a[href="https://t.me/jollu8"]').count(), 1);
    // Exercise the complete collection, not just its first page.
    await page.locator('[data-view=all]').click();
    assert.equal(await page.locator('#section option').count(), 34);
    for (const topic of content.sections) {
      await page.locator('#section').selectOption(topic.id);
      const expected = content.entries.filter(e => e.section === topic.id).length;
      assert.equal(await page.locator('#result-count').textContent(), `Найдено: ${expected}`);
      assert.ok(await page.locator('.card').count() > 0, `empty topic ${topic.id}`);
    }
    await page.locator('[data-view=all]').click();
    while (await page.locator('#load-more').isVisible()) await page.locator('#load-more').click();
    const allIDs = await page.locator('.card').evaluateAll(nodes => nodes.map(n => n.dataset.id));
    assert.equal(allIDs.length, 619);
    assert.equal(new Set(allIDs).size, 619);
    assert.deepEqual(new Set(allIDs), new Set(content.entries.map(e => e.id)));
    assert.equal(await page.locator('.card').last().locator('h3').textContent(), content.entries.at(-1).title);
    assert.deepEqual(errors, []);
    // All original IDs now resolve to full cards without losing old checks or bookmarks.
    const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await legacyContext.addInitScript(({store,bookmark}) => {
      if (!localStorage.getItem('migration-test-seeded')) {
        localStorage.setItem(store, JSON.stringify({saved:{'1-1':true,'1-35':false,'custom-legacy':true},custom:[{id:'custom-legacy',title:'Моё старое дело'}]}));
        localStorage.setItem(bookmark, JSON.stringify({id:'1-35',view:'all',category:'health',evidence:'A',section:'1',limit:54,open:['1-35'],offset:20}));
        localStorage.setItem('migration-test-seeded','1');
      }
    }, {store,bookmark});
    const oldPage = await legacyContext.newPage(); await oldPage.goto(url); await oldPage.waitForSelector('.card');
    assert.equal(await oldPage.locator('#plan-count').textContent(), '3');
    assert.ok(!(await oldPage.locator('#resume-title').textContent()).includes('В архиве'));
    assert.ok((await oldPage.locator('#resume-title').textContent()).includes('органа'));
    await oldPage.locator('#resume-button').click();
    assert.equal(await oldPage.locator('.archived').count(), 0);
    assert.equal(await oldPage.locator('.card[data-id="1-35"] details').getAttribute('open'), '');
    assert.equal(await oldPage.locator('#evidence').inputValue(), '');
    await oldPage.locator('[data-view=plan]').click();
    assert.equal(await oldPage.locator('.card').count(), 3); assert.equal(await oldPage.locator('.archived').count(), 0);
    assert.equal(await oldPage.locator('.card[data-id="1-1"] input').isChecked(), true);
    assert.equal(await oldPage.locator('.card[data-id="custom-legacy"] input').isChecked(), true);
    assert.equal(await oldPage.locator('.card[data-id="1-35"] input').isChecked(), false);
    assert.equal(await oldPage.locator('.card[data-id="1-35"] .calendar-button').count(), 1);
    const value = await oldPage.evaluate(key => JSON.parse(localStorage.getItem(key)), store);
    assert.deepEqual(value.saved, {'1-1':true,'1-35':false,'custom-legacy':true});
    await oldPage.reload(); await oldPage.waitForSelector('.card'); assert.equal(await oldPage.locator('#plan-count').textContent(), '3');
    // An unrecognised legacy ID must still retain its completion state.
    await oldPage.evaluate(key => localStorage.setItem(key, JSON.stringify({saved:{'99-99':true},custom:[]})), store);
    await oldPage.reload(); await oldPage.waitForSelector('.card');
    await oldPage.locator('[data-view=plan]').click();
    assert.equal(await oldPage.locator('.archived').count(), 1);
    assert.equal(await oldPage.locator('.archived input').isChecked(), true);
    assert.equal(await oldPage.locator('.archived .calendar-button').count(), 0);
    console.log('PASS: localized feed, region/source filters, 4 widths, tasks, backup, ICS, reading resume, all 608 IDs restored, legacy bookmark and task migration; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
