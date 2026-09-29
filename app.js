'use strict';
const $ = selector => document.querySelector(selector);
// Keep these keys stable across editions to preserve existing tasks and bookmarks.
const STORE = 'life-in-bloom:plan:v1';
const READING_STORE = 'life-in-bloom:reading:v1';
const categories = {
  health: ['1', '2', '6', '16', '24', '28', '33'],
  balance: ['3', '4', '22', '23', '29'],
  money: ['5', '7', '8', '9', '11', '12', '15', '19', '26', '31', '32'],
  family: ['10', '17', '18', '20', '25', '27', '30'],
  safety: ['13', '14', '21'],
};
const regionNames = { general: 'Общее', russia: 'Россия', moscow: 'Москва' };
const basisNames = { official: 'Официальный источник', guidance: 'Рекомендации организаций', editorial: 'Практическая идея', adaptation: 'Редакционная адаптация' };
let data = { entries: [], sections: [], archive: [] };
let view = 'all', category = 'all', status = 'all', limit = 18;
const starters = {
  time: { title: 'Освободить время', ids: ['3-5', '3-7', '4-6'] },
  digital: { title: 'Защитить важное в телефоне', ids: ['14-1', '14-2', '14-10'] },
  momentum: { title: 'Сдвинуть дело с места', ids: ['4-1', '4-7', '4-8'] },
};
let starter = '', linkedID = '';
const expandedCards = new Set();
let calendarEntry, toastTimer, readingTimer, searchTimer;
let reading = null, restoring = false, archivedReading = null;
let plan = { saved: {}, custom: [] };
const validID = id => typeof id === 'string' && /^(\d+-\d+|custom-[a-zA-Z0-9-]+)$/.test(id);
function validPlan(value) {
  return value && value.saved && typeof value.saved === 'object' && !Array.isArray(value.saved)
    && Object.keys(value.saved).length <= 10000
    && Object.entries(value.saved).every(([id, done]) => validID(id) && typeof done === 'boolean')
    && Array.isArray(value.custom) && value.custom.length <= 5000
    && new Set(value.custom.map(e => e?.id)).size === value.custom.length
    && value.custom.every(e => e && typeof e.id === 'string' && /^custom-[a-zA-Z0-9-]+$/.test(e.id)
      && typeof e.title === 'string' && e.title.trim().length > 0 && e.title.length <= 200);
}
try {
  const raw = localStorage.getItem(STORE);
  if (raw) { const value = JSON.parse(raw); if (!validPlan(value)) throw Error('Invalid plan'); plan = value; }
} catch { setTimeout(() => toast('Не удалось прочитать план. Можно загрузить резервную копию.'), 500); }
try {
  const value = JSON.parse(localStorage.getItem(READING_STORE));
  if (value && validID(value.id) && ['all', 'plan'].includes(value.view)) reading = value;
} catch {}
function element(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function clean(text = '') { return text.replace(/\*\*/g, '').trim(); }
function toast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(plan)); }
  catch { toast('Браузер не сохранил изменения. Скачайте копию плана.'); }
  updateProgress();
}
function originalURL(entry) {
  const base = 'https://github.com/eternity4719/HowToLiveBetter';
  return entry.path ? base + '/blob/main/' + entry.path.split('/').map(encodeURIComponent).join('/') : base;
}
function link(title, url) {
  const a = element('a', '', title);
  // Only curated https URLs are rendered as outgoing links.
  if (typeof url === 'string' && url.startsWith('https://')) a.href = url;
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function archivedEntry(id) {
  return data.archive.find(e => e.id === id) || {
    id, section: id.split('-')[0], title: `Сохранённая задача № ${id}`,
    status: 'archived', reason: 'Этой записи больше нет в текущей подборке. Отметка выполнения сохранена.',
  };
}
function findEntry(id) { return plan.custom.find(e => e.id === id) || data.entries.find(e => e.id === id) || archivedEntry(id); }
function dateLabel(value) { return new Date(value + 'T12:00:00').toLocaleDateString('ru-RU'); }
const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m2 0h2m-6 3h2"/></svg>';
function card(entry) {
  const saved = Object.hasOwn(plan.saved, entry.id), done = plan.saved[entry.id] === true;
  const archived = entry.status === 'archived';
  const article = element('article', 'card' + (done ? ' done' : '') + (archived ? ' archived' : ''));
  article.dataset.id = entry.id; article.tabIndex = -1;
  const head = element('div', 'card-head'), meta = element('div', 'card-meta');
  meta.append(element('span', '', data.sections.find(s => s.id === entry.section)?.title || (archived ? 'Сохранённый совет' : 'Мой маленький шаг')));
  if (entry.region || archived) meta.append(element('span', 'region-badge', archived ? 'Архив' : regionNames[entry.region]));
  head.append(meta, element('h3', '', clean(entry.title))); article.append(head);
  const body = element('div', 'card-body');
  if (archived) {
    body.append(element('p', 'archive-notice', entry.reason || 'Совет исключён из основной подборки: применимость для России не подтверждена.'));
    body.append(element('p', 'archive-notice', 'Это сохранённая запись из прежней версии, а не действующая рекомендация.'));
    if (entry.path) body.append(link('Открыть исходный совет ↗', originalURL(entry)));
  } else if (entry.summary) {
    body.append(element('p', 'card-summary', entry.summary));
    const details = element('details'); details.append(element('summary', '', 'Как сделать и источники'));
    for (const [key, label] of [['steps', 'Первый шаг'], ['notes', 'Что учесть']]) {
      if (entry[key]) { const block = element('div', 'detail-item'); block.append(element('strong', '', label), document.createTextNode(entry[key])); details.append(block); }
    }
    details.append(element('p', 'review-meta', `${basisNames[entry.basis]} · Обновлено ${dateLabel(entry.reviewedAt)}`));
    if (entry.basis === 'editorial') details.append(element('p', 'review-meta', 'Авторская практическая идея. Научная оценка эффективности не заявляется.'));
    if (entry.referenceContext && entry.references?.length) details.append(element('p', 'review-meta', entry.referenceContext));
    if (entry.references?.length) {
      const list = element('ul', 'source-list');
      for (const reference of entry.references) { const li = element('li'); li.append(link(reference.title + ' ↗', reference.url)); list.append(li); }
      details.append(list);
    }
    if (entry.path) details.append(link('Тема в китайском оригинале ↗', originalURL(entry)));
    body.append(details);
  }
  article.append(body);
  const foot = element('div', 'card-footer');
  if (view === 'plan') {
    const label = element('label', 'done-label'), checkbox = element('input');
    checkbox.type = 'checkbox'; checkbox.checked = done; checkbox.setAttribute('aria-label', 'Выполнено: ' + entry.title);
    checkbox.addEventListener('change', () => { plan.saved[entry.id] = checkbox.checked; save(); render(); });
    label.append(checkbox, document.createTextNode(done ? 'Готово!' : 'Сделано')); foot.append(label);
    const remove = element('button', 'icon-button', '×'); remove.type = 'button'; remove.title = 'Убрать из плана';
    remove.setAttribute('aria-label', 'Убрать из плана: ' + entry.title);
    remove.addEventListener('click', () => { delete plan.saved[entry.id]; plan.custom = plan.custom.filter(e => e.id !== entry.id); save(); render(); }); foot.append(remove);
  } else if (!archived) {
    const add = element('button', 'save-button' + (saved ? ' saved' : ''), saved ? '✓ В моём плане' : '+ В мой план');
    add.type = 'button'; add.setAttribute('aria-pressed', String(saved));
    add.addEventListener('click', () => {
      if (Object.hasOwn(plan.saved, entry.id)) {
        delete plan.saved[entry.id]; add.textContent = '+ В мой план'; add.classList.remove('saved'); article.classList.remove('done'); add.setAttribute('aria-pressed', 'false');
      } else {
        plan.saved[entry.id] = false; add.textContent = '✓ В моём плане'; add.classList.add('saved'); add.setAttribute('aria-pressed', 'true'); toast('Добавлено в ваш план. Начните, когда будете готовы.');
      }
      save();
    }); foot.append(add);
  }
  if (!archived) {
    const calendar = element('button', 'icon-button calendar-button'); calendar.type = 'button'; calendar.innerHTML = calendarIcon;
    calendar.title = 'В календарь'; calendar.setAttribute('aria-label', 'В календарь: ' + entry.title);
    calendar.addEventListener('click', () => openCalendar(entry)); foot.append(calendar);
  }
  if (archived && view !== 'plan') {
    const back = element('button', 'subtle', 'К актуальным советам'); back.addEventListener('click', () => { archivedReading = null; resetFilters(); render(); }); foot.append(back);
  }
  if (entry.status === 'published') {
    const share = element('button', 'subtle share-button', 'Поделиться'); share.type = 'button';
    share.setAttribute('aria-label', 'Поделиться: ' + entry.title);
    share.addEventListener('click', async () => {
      const url = new URL(location.href); url.hash = 'advice=' + entry.id;
      try { await navigator.clipboard.writeText(url.href); toast('Ссылка на совет скопирована.'); }
      catch { window.prompt('Скопируйте ссылку на совет:', url.href); }
    }); foot.append(share);
  }
  article.append(foot); return article;
}
function updateProgress() {
  const ids = Object.keys(plan.saved), done = ids.filter(id => plan.saved[id]).length;
  $('#plan-count').textContent = ids.length;
  $('#progress-text').textContent = ids.length ? `${done} из ${ids.length} шагов сделано. Всё в своём темпе.` : 'Начните с одного маленького шага';
  $('#progress').max = ids.length || 1; $('#progress').value = done;
}
function render() {
  const oldCards = [...$('#cards').children];
  for (const node of oldCards) {
    if (node.querySelector('details')?.open) expandedCards.add(node.dataset.id);
    else expandedCards.delete(node.dataset.id);
  }
  const active = document.activeElement, activeCard = active?.closest('.card');
  const focusables = 'button, input, summary, a';
  const focusIndex = activeCard ? [...activeCard.querySelectorAll(focusables)].indexOf(active) : -1;
  const oldIndex = oldCards.indexOf(activeCard);

  const query = $('#search').value.trim().toLocaleLowerCase('ru'), section = $('#section').value;
  const basis = $('#evidence').value, region = $('#region').value;
  const pool = linkedID ? data.entries.filter(e => e.id === linkedID) : starter ? starters[starter].ids.map(findEntry) : view === 'plan' ? Object.keys(plan.saved).map(findEntry).sort((a, b) => Number(b.id.startsWith('custom-')) - Number(a.id.startsWith('custom-'))) : data.entries;
  const entries = archivedReading && view === 'all' ? [archivedReading] : pool.filter(e =>
    (!section || e.section === section) && (category === 'all' || categories[category]?.includes(e.section))
    && (!basis || e.basis === basis)
    && (region === 'all' || (region === 'moscow' ? e.region === 'moscow' : e.region !== 'moscow'))
    && (!query || [e.title, e.summary, e.steps, e.notes].join(' ').toLocaleLowerCase('ru').includes(query))
    && (view !== 'plan' || status === 'all' || (status === 'done' ? plan.saved[e.id] : !plan.saved[e.id])));
  $('#cards').replaceChildren(...entries.slice(0, limit).map(card));
  for (const node of $('#cards').children) {
    const details = node.querySelector('details');
    if (details && expandedCards.has(node.dataset.id)) details.open = true;
  }
  if (activeCard) {
    const replacement = [...$('#cards').children].find(node => node.dataset.id === activeCard.dataset.id);
    const target = replacement ? (replacement.querySelectorAll(focusables)[focusIndex] || replacement)
      : $('#cards').children[Math.min(oldIndex, $('#cards').children.length - 1)] || $('#search');
    target.focus({ preventScroll: true });
  }
  $('#selection-bar').hidden = !starter && !linkedID;
  $('#selection-title').textContent = starter ? starters[starter].title + ' · 3 шага' : 'Совет по ссылке';
  $('#result-count').textContent = `Найдено: ${entries.length}`;
  $('#load-more').hidden = entries.length <= limit; $('#empty').hidden = entries.length > 0;
  $('#empty-message').textContent = view === 'plan' && !Object.keys(plan.saved).length ? 'Добавляйте советы в план или запишите своё дело выше.' : 'Попробуйте другой запрос, регион или сбросьте фильтры.';
  updateProgress();
}
function syncControls() {
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
  for (const [key, value] of [['category', category], ['status', status]]) document.querySelectorAll(`[data-${key}]`).forEach(b => b.classList.toggle('active', b.dataset[key] === value));
  $('#starter-guide').hidden = view !== 'all';
  $('#plan-tools').hidden = view !== 'plan'; $('#view-title').textContent = view === 'plan' ? 'Маленькие шаги, ваш ритм.' : 'Что сделаем для себя?';
}
function clearSelection() {
  starter = ''; linkedID = '';
  if (location.hash.startsWith('#advice=')) history.replaceState(null, '', location.pathname + location.search);
}
function resetFilters() {
  clearSelection();
  category = 'all'; status = 'all'; limit = 18; archivedReading = null;
  for (const selector of ['#search', '#section', '#evidence']) $(selector).value = '';
  $('#region').value = 'all'; syncControls();
}
function setView(next) { view = next; resetFilters(); render(); if (view === 'plan') $('#explore').scrollIntoView({ behavior: 'smooth' }); }
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })), a = element('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function openCalendar(entry) {
  calendarEntry = entry; $('#calendar-title').textContent = clean(entry.title); $('#calendar-date').value = localDate(new Date()); $('#calendar-dialog').showModal();
}
function calendarDates() {
  const value = $('#calendar-date').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !$('#calendar-form').reportValidity()) return null;
  const next = new Date(value + 'T12:00:00'); next.setDate(next.getDate() + 1);
  return [value.replaceAll('-', ''), localDate(next).replaceAll('-', '')];
}
function escapeICS(text) { return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
function foldICS(line) {
  const encoder = new TextEncoder(); let result = '', part = '', size = 0;
  for (const char of line) { const bytes = encoder.encode(char).length; if (size + bytes > 75) { result += part + '\r\n'; part = ' '; size = 1; } part += char; size += bytes; }
  return result + part;
}
function eventDescription() {
  return [calendarEntry.summary || 'Маленький шаг для себя.', calendarEntry.steps, calendarEntry.notes,
    'Life in Bloom · ' + (regionNames[calendarEntry.region] || 'Личный план'), ...(calendarEntry.references || []).map(s => s.url)].filter(Boolean).join('\n\n');
}
$('#calendar-form').addEventListener('submit', event => {
  event.preventDefault(); const dates = calendarDates(); if (!dates) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life in Bloom//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${calendarEntry.id}-${dates[0]}@life-in-bloom`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${dates[0]}`, `DTEND;VALUE=DATE:${dates[1]}`,
    `SUMMARY:${escapeICS(clean(calendarEntry.title))}`, `DESCRIPTION:${escapeICS(eventDescription())}`, 'END:VEVENT', 'END:VCALENDAR'];
  download(`life-in-bloom-${calendarEntry.id}.ics`, lines.map(foldICS).join('\r\n') + '\r\n', 'text/calendar;charset=utf-8');
  $('#calendar-dialog').close(); toast('Откройте скачанный файл в своём календаре.');
});
$('#google-calendar').addEventListener('click', () => {
  const dates = calendarDates(); if (!dates) return;
  const query = new URLSearchParams({ action: 'TEMPLATE', text: clean(calendarEntry.title), dates: dates.join('/'), details: eventDescription() });
  window.open('https://calendar.google.com/calendar/render?' + query, '_blank', 'noopener,noreferrer');
});
$('#calendar-dialog').addEventListener('click', event => {
  if (event.target === $('#calendar-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); }
});
$('#custom-form').addEventListener('submit', event => {
  event.preventDefault(); const title = $('#custom-title').value.trim(); if (!title) return;
  const id = 'custom-' + crypto.randomUUID(); plan.custom.unshift({ id, title }); plan.saved[id] = false;
  $('#custom-title').value = ''; resetFilters(); save(); render();
});
$('#export').addEventListener('click', () => download('life-in-bloom-plan.json', JSON.stringify({ version: 1, ...plan }, null, 2), 'application/json'));
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2000000) throw Error('large'); const value = JSON.parse(await file.text()); if (!validPlan(value)) throw Error('invalid');
    const known = new Set(plan.custom.map(e => e.id));
    const merged = { saved: { ...plan.saved, ...value.saved }, custom: [...plan.custom, ...value.custom.filter(e => !known.has(e.id)).map(e => ({ id: e.id, title: e.title }))] };
    if (!validPlan(merged)) throw Error('too large'); plan = merged; save(); render(); toast('План загружен и объединён с текущим.');
  } catch { toast('Не удалось загрузить файл. Выберите сохранённый JSON-план.'); }
  event.target.value = '';
});
for (const type of ['category', 'status']) document.querySelectorAll(`[data-${type}]`).forEach(button => button.addEventListener('click', () => {
  clearSelection();
  if (type === 'category') category = button.dataset.category; else status = button.dataset.status;
  archivedReading = null; limit = 18; syncControls(); render();
}));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { clearSelection(); archivedReading = null; limit = 18; render(); }, 150); });
for (const selector of ['#section', '#evidence', '#region']) $(selector).addEventListener('change', () => { clearSelection(); archivedReading = null; limit = 18; render(); });
$('#reset').addEventListener('click', () => { resetFilters(); render(); });
$('#load-more').addEventListener('click', () => {
  const count = $('#cards').children.length; limit += 18; render(); const next = $('#cards').children[count];
  if (next) { next.tabIndex = -1; next.focus({ preventScroll: true }); }
});
window.addEventListener('storage', event => {
  if (event.key === STORE) { try { const value = event.newValue ? JSON.parse(event.newValue) : { saved: {}, custom: [] }; if (validPlan(value)) { plan = value; render(); } } catch {} }
});
function rememberReading() {
  if (restoring || !data.entries.length) return;
  const visible = [...document.querySelectorAll('.card')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight * .7; });
  if (!visible.length) return;
  const anchor = visible.find(c => c.getBoundingClientRect().top >= 0) || visible[0];
  const snapshot = { starter, linkedID, id: anchor.dataset.id, view, category, status, query: $('#search').value, section: $('#section').value,
    evidence: $('#evidence').value, region: $('#region').value, limit,
    open: [...document.querySelectorAll('.card details[open]')].map(d => d.closest('.card').dataset.id),
    offset: Math.round(anchor.getBoundingClientRect().top), updatedAt: new Date().toISOString() };
  try { localStorage.setItem(READING_STORE, JSON.stringify(snapshot)); } catch {}
}
function showReading() {
  if (!reading || (reading.view === 'plan' && !Object.hasOwn(plan.saved, reading.id))) return;
  const entry = findEntry(reading.id);
  $('#resume-title').textContent = (entry.status === 'archived' ? 'В архиве прежней версии: ' : '') + clean(entry.title);
  $('#resume-reading').hidden = false;
}
$('#resume-button').addEventListener('click', () => {
  if (!reading) return; restoring = true; archivedReading = null;
  clearSelection();
  starter = Object.hasOwn(starters, reading.starter) ? reading.starter : '';
  linkedID = data.entries.some(e => e.id === reading.linkedID) ? reading.linkedID : '';
  view = reading.view; category = Object.hasOwn(categories, reading.category) ? reading.category : 'all';
  status = ['all', 'pending', 'done'].includes(reading.status) ? reading.status : 'all';
  $('#search').value = typeof reading.query === 'string' ? reading.query : '';
  $('#section').value = data.sections.some(s => s.id === reading.section) ? reading.section : '';
  // Old scientific grades are deliberately not inherited by the localized edition.
  $('#evidence').value = Object.hasOwn(basisNames, reading.evidence) ? reading.evidence : '';
  $('#region').value = ['all', 'russia', 'moscow'].includes(reading.region) ? reading.region : 'all';
  limit = Math.min(Math.max(Number(reading.limit) || 18, 18), data.entries.length + Object.keys(plan.saved).length);
  const entry = findEntry(reading.id);
  if (entry.status === 'archived' && view === 'all') { resetFilters(); archivedReading = entry; }
  syncControls(); render();
  let anchor = [...document.querySelectorAll('.card')].find(c => c.dataset.id === reading.id);
  if (!anchor) { resetFilters(); limit = data.entries.length + Object.keys(plan.saved).length; render(); anchor = [...document.querySelectorAll('.card')].find(c => c.dataset.id === reading.id); }
  for (const card of document.querySelectorAll('.card')) {
    if (Array.isArray(reading.open) && reading.open.includes(card.dataset.id)) { const details = card.querySelector('details'); if (details) details.open = true; }
  }
  $('#resume-reading').hidden = true;
  requestAnimationFrame(() => {
    if (anchor) {
      anchor.tabIndex = -1; anchor.focus({ preventScroll: true });
      const offset = Number.isFinite(reading.offset) && entry.status !== 'archived' ? Math.max(-anchor.offsetHeight + 100, Math.min(reading.offset, innerHeight / 2)) : 24;
      window.scrollTo({ top: scrollY + anchor.getBoundingClientRect().top - offset, behavior: 'instant' });
    }
    restoring = false; rememberReading();
  });
});
addEventListener('scroll', () => { clearTimeout(readingTimer); readingTimer = setTimeout(rememberReading, 250); }, { passive: true });
document.addEventListener('toggle', event => { if (event.target.matches('.card details')) { clearTimeout(readingTimer); readingTimer = setTimeout(rememberReading, 250); } }, true);
addEventListener('pagehide', rememberReading);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') rememberReading(); });
function openLinkedCard() {
  if (!data.entries.length) return;
  const match = /^#advice=(\d+-\d+)$/.exec(location.hash);
  if (!location.hash.startsWith('#advice=')) {
    if (linkedID) { resetFilters(); render(); }
    return false;
  }
  const entry = match && data.entries.find(e => e.id === match[1]);
  // Reset controls without removing the incoming URL.
  const hash = location.hash;
  view = 'all'; resetFilters();
  history.replaceState(null, '', location.pathname + location.search + hash);
  if (!entry) { render(); toast('Совет по этой ссылке не найден. Выберите другой из каталога.'); return true; }
  linkedID = entry.id; render();
  const node = $('#cards').firstElementChild;
  node.querySelector('details').open = true;
  $('#resume-reading').hidden = true;
  node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'start', behavior: 'instant' });
  return true;
}
addEventListener('hashchange', openLinkedCard);
$('#show-all').addEventListener('click', () => { resetFilters(); render(); $('#search').focus({ preventScroll: true }); });
for (const [key, selection] of Object.entries(starters)) {
  const button = element('button', 'subtle', selection.title); button.type = 'button'; button.dataset.starter = key;
  button.addEventListener('click', () => {
    view = 'all'; resetFilters(); starter = key; $('#starter-guide').open = false; render();
    $('#show-all').focus({ preventScroll: true });
  });
  $('#starter-options').append(button);
}
async function init() {
  try {
    const response = await fetch('assets/advice.ru.json?v=ru-full-608-1'); if (!response.ok) throw Error('HTTP ' + response.status);
    const loaded = await response.json(); if (loaded.edition !== 'russia-moscow' || !loaded.entries.length) throw Error('Wrong content edition');
    data = loaded;
    for (const section of data.sections) { const option = element('option', '', section.title); option.value = section.id; $('#section').append(option); }
    $('#edition-count').textContent = data.entries.length; $('#topic-count').textContent = data.sections.length;
    $('#archive-summary').textContent = `Все ${data.sourceCount} исходных советов адаптированы и доступны. Ещё ${data.entries.length - data.sourceCount} карточек добавлены для России и Москвы — всего ${data.entries.length} в ${data.sections.length} темах. Обновлено: ${dateLabel(data.reviewedAt)}.`;
    render(); if (!openLinkedCard()) showReading();
  } catch (error) {
    $('#result-count').textContent = 'Не удалось загрузить советы'; $('#empty').hidden = false;
    $('#empty-message').textContent = 'Проверьте подключение и обновите страницу. Личный план остаётся в вашем браузере.';
    $('#reset').textContent = 'Попробовать снова'; $('#reset').onclick = () => location.reload(); console.error(error);
  }
}
updateProgress(); init();
