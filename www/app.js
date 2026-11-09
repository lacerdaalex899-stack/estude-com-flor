/* =========================================================
   Estude com Flor — IA de estudos universitários
   Funciona no Android (Capacitor) e no navegador.
   ========================================================= */
'use strict';

const API_URL = 'https://api.anthropic.com/v1/messages';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isTouch = () => matchMedia('(pointer:coarse)').matches;

/* ---------------- Ícones ---------------- */
const IC = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.38.37.72.68.98.3.26.7.42 1.1.42H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
const FLOWER = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor" opacity=".95">${[0, 72, 144, 216, 288].map(r => `<ellipse cx="32" cy="17" rx="9.5" ry="14" transform="rotate(${r} 32 32)"/>`).join('')}</g><circle cx="32" cy="32" r="8" fill="#ffd166"/><circle cx="32" cy="32" r="8" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/></svg>`;
const LEAF = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor">${[0, 60, 120, 180, 240, 300].map(r => `<ellipse cx="32" cy="16" rx="7.5" ry="13" transform="rotate(${r} 32 32)"/>`).join('')}</g><circle cx="32" cy="32" r="9" fill="#7a4b1f"/><circle cx="29" cy="29" r="2" fill="#a8743f"/></svg>`;
const aiIcon = p => (p && p.aiGender === 'm' ? LEAF : FLOWER);

/* ---------------- Banco local (IndexedDB) ---------------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('estude-com-flor', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('chats', { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  _tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  get(store, key) { return this._tx(store, 'readonly', s => s.get(key)); },
  put(store, val, key) { return this._tx(store, 'readwrite', s => (key === undefined ? s.put(val) : s.put(val, key))); },
  del(store, key) { return this._tx(store, 'readwrite', s => s.delete(key)); },
  all(store) { return this._tx(store, 'readonly', s => s.getAll()); },
  clear(store) { return this._tx(store, 'readwrite', s => s.clear()); },
};

/* ---------------- Estado ---------------- */
const MODELS = [
  ['claude-sonnet-5-5', 'Sonnet 5.5 — equilibrado (recomendado)'],
  ['claude-opus-5-5', 'Opus 5.5 — o mais inteligente (mais caro)'],
  ['claude-haiku-5-5', 'Haiku 5.5 — rápido e econômico'],
];
const DEFAULT_SETTINGS = { apiKey: '', model: 'claude-sonnet-5-5', humanize: true, webSearch: true, activeProfileId: null };
const S = { settings: { ...DEFAULT_SETTINGS }, profiles: [], profile: null, chats: [], chat: null, pending: [], mode: null, busy: false, abort: null, noFetch: false };

const PRESETS = {
  flor: { name: 'Flor', a: '#e75480', b: '#f9a8c9' },
  lavanda: { name: 'Lavanda', a: '#8b5cf6', b: '#c4b5fd' },
  oceano: { name: 'Oceano', a: '#0284c7', b: '#5ee0f0' },
  floresta: { name: 'Floresta', a: '#15803d', b: '#86d9a2' },
  sol: { name: 'Pôr do sol', a: '#f97316', b: '#f43f5e' },
  cafe: { name: 'Café', a: '#92400e', b: '#d6a77a' },
  cereja: { name: 'Cereja', a: '#be123c', b: '#fb7185' },
  noite: { name: 'Meia-noite', a: '#4f46e5', b: '#22d3ee' },
  menta: { name: 'Menta', a: '#0d9488', b: '#8ee6c9' },
  girassol: { name: 'Girassol', a: '#ca8a04', b: '#f8d84a' },
};
const DEFAULT_THEME = { preset: 'flor', a: '#e75480', b: '#f9a8c9', mode: 'light', tone: 'medio', font: 'normal' };

/* ---------------- Tema ---------------- */
function hexToHsl(hex) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let hh = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min);
    hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60;
  }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
}
function luminance(hex) { const [, , l] = hexToHsl(hex); return l; }
function applyTheme(t) {
  t = { ...DEFAULT_THEME, ...(t || {}) };
  const root = document.documentElement.style;
  const [h, s] = hexToHsl(t.a);
  let dark = t.mode === 'dark' || (t.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const tone = { suave: 0.45, medio: 0.8, vibrante: 1.25 }[t.tone] || 0.8;
  const sat = x => Math.min(100, Math.round(x * tone));
  root.setProperty('--a', t.a); root.setProperty('--b', t.b);
  root.setProperty('--on-a', luminance(t.a) > 70 ? '#2b2230' : '#ffffff');
  if (dark) {
    root.setProperty('--bg', `hsl(${h} ${sat(18)}% 8%)`);
    root.setProperty('--surface', `hsl(${h} ${sat(16)}% 12%)`);
    root.setProperty('--surface2', `hsl(${h} ${sat(18)}% 17%)`);
    root.setProperty('--ai-bubble', `hsl(${h} ${sat(16)}% 13%)`);
    root.setProperty('--border', `hsl(${h} ${sat(14)}% 22%)`);
    root.setProperty('--text', '#f3eef4'); root.setProperty('--muted', `hsl(${h} 10% 68%)`);
    root.setProperty('--a-soft', `hsl(${h} ${sat(35)}% 20%)`);
    root.setProperty('--shadow', '0 2px 10px rgba(0,0,0,.35)');
  } else {
    const L = { suave: 98.5, medio: 97, vibrante: 94.5 }[t.tone] || 97;
    root.setProperty('--bg', `hsl(${h} ${sat(Math.max(40, s))}% ${L}%)`);
    root.setProperty('--surface', '#ffffff');
    root.setProperty('--surface2', `hsl(${h} ${sat(60)}% 96%)`);
    root.setProperty('--ai-bubble', '#ffffff');
    root.setProperty('--border', `hsl(${h} ${sat(45)}% 90%)`);
    root.setProperty('--text', `hsl(${h} 15% 16%)`); root.setProperty('--muted', `hsl(${h} 8% 45%)`);
    root.setProperty('--a-soft', `hsl(${h} ${sat(80)}% 94%)`);
    root.setProperty('--shadow', `0 2px 10px hsl(${h} 40% 30% / .08)`);
  }
  root.setProperty('--fs', { pequena: '14.5px', normal: '16px', grande: '17.5px' }[t.font] || '16px');
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = t.a;
}

/* ---------------- Utilidades de UI ---------------- */
let toastTimer;
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}
function openModal({ title, body, foot = '', onMount, tabs }) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close>${IC.close}</button></div>${tabs || ''}<div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
  m.classList.remove('hidden'); $('#modalShade').classList.remove('hidden');
  $('[data-close]', m).onclick = closeModal;
  onMount && onMount(m);
  return m;
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modalShade').classList.add('hidden'); $('#modal').innerHTML = ''; }
function askText(title, { placeholder = '', value = '', type = 'text', ok = 'OK' } = {}) {
  return new Promise(res => {
    openModal({
      title, body: `<div class="field"><input id="askInput" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}"></div>`,
      foot: `<button class="btn ghost" data-c>Cancelar</button><button class="btn primary" data-ok>${esc(ok)}</button>`,
      onMount: m => {
        const i = $('#askInput', m); setTimeout(() => i.focus(), 50);
        const done = v => { closeModal(); res(v); };
        $('[data-c]', m).onclick = () => done(null); $('[data-close]', m).onclick = () => done(null);
        $('[data-ok]', m).onclick = () => done(i.value.trim());
        i.onkeydown = e => { if (e.key === 'Enter') done(i.value.trim()); };
      }
    });
  });
}
function confirmBox(title, text, okLabel = 'Confirmar', danger = true) {
  return new Promise(res => {
    openModal({
      title, body: `<p style="margin:0;line-height:1.5">${text}</p>`,
      foot: `<button class="btn ghost" data-c>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button>`,
      onMount: m => {
        $('[data-c]', m).onclick = () => { closeModal(); res(false); };
        $('[data-close]', m).onclick = () => { closeModal(); res(false); };
        $('[data-ok]', m).onclick = () => { closeModal(); res(true); };
      }
    });
  });
}
function md(text) {
  const html = marked.parse(text || '', { breaks: true, gfm: true });
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener" ');
}
const fmtDate = ts => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/* ---------------- Persistência ---------------- */
async function saveSettings() { await DB.put('kv', S.settings, 'settings'); }
async function saveProfiles() { await DB.put('kv', S.profiles, 'profiles'); }
let saveChatTimer;
function saveChat(chat = S.chat, now = false) {
  if (!chat) return;
  chat.updatedAt = Date.now();
  clearTimeout(saveChatTimer);
  const doSave = () => DB.put('chats', JSON.parse(JSON.stringify(chat))).catch(e => toast('Erro ao salvar: ' + e.message));
  if (now) return doSave();
  saveChatTimer = setTimeout(doSave, 400);
}

/* =========================================================
   CONFIGURAÇÃO INICIAL (perfil)
   ========================================================= */
function profileFormHTML(p = {}) {
  const g = p.aiGender || 'f';
  return `
  <div class="field"><label>Seu nome</label><input type="text" id="pf_user" value="${esc(p.userName || '')}" placeholder="Como você quer ser chamado(a)?"></div>
  <div class="field"><label>Qual faculdade/universidade você faz?</label><input type="text" id="pf_fac" value="${esc(p.faculdade || '')}" placeholder="Ex.: USP, UFPE, Unip, PUC-Rio…"></div>
  <div class="field"><label>Qual curso?</label><input type="text" id="pf_curso" value="${esc(p.curso || '')}" placeholder="Ex.: Direito, Enfermagem, Engenharia Civil…"></div>
  <div class="field"><label>Período / semestre <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><input type="text" id="pf_per" value="${esc(p.periodo || '')}" placeholder="Ex.: 3º período"></div>
  <div class="field"><label>Sua IA vai agir como</label>
    <div class="seg" id="pf_gender">
      <button type="button" data-g="f" class="${g === 'f' ? 'on' : ''}">🌸 IA mulher</button>
      <button type="button" data-g="m" class="${g === 'm' ? 'on' : ''}">🌻 IA homem</button>
    </div></div>
  <div class="field"><label>Nome da sua IA</label><input type="text" id="pf_ai" value="${esc(p.aiName || '')}" placeholder="${g === 'f' ? 'Ex.: Flor, Luna, Sofia…' : 'Ex.: Theo, Davi, Gael…'}"><small>Ela(e) vai usar esse nome e falar de si no gênero que você escolheu.</small></div>`;
}
function bindProfileForm(root) {
  $$('#pf_gender button', root).forEach(b => b.onclick = () => {
    $$('#pf_gender button', root).forEach(x => x.classList.toggle('on', x === b));
    $('#pf_ai', root).placeholder = b.dataset.g === 'f' ? 'Ex.: Flor, Luna, Sofia…' : 'Ex.: Theo, Davi, Gael…';
  });
}
function readProfileForm(root) {
  const g = $('#pf_gender button.on', root)?.dataset.g || 'f';
  return {
    userName: $('#pf_user', root).value.trim(),
    faculdade: $('#pf_fac', root).value.trim(),
    curso: $('#pf_curso', root).value.trim(),
    periodo: $('#pf_per', root).value.trim(),
    aiGender: g,
    aiName: $('#pf_ai', root).value.trim() || (g === 'f' ? 'Flor' : 'Theo'),
  };
}

function themeEditorHTML(t) {
  t = { ...DEFAULT_THEME, ...t };
  const sw = Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="sw ${t.preset === k ? 'on' : ''}" data-p="${k}"><i style="background:linear-gradient(135deg,${v.a},${v.b})"></i>${v.name}</button>`).join('');
  const seg = (id, val, opts) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${val === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return `
  <div class="field"><label>Paleta</label><div class="swatches" id="th_presets">${sw}</div></div>
  <div class="field"><label>Cores personalizadas</label><div class="colors">
    <label><input type="color" id="th_a" value="${t.a}">Principal</label>
    <label><input type="color" id="th_b" value="${t.b}">Secundária</label></div>
    <small>Misture as duas para criar o seu próprio degradê.</small></div>
  <div class="field"><label>Modo</label>${seg('th_mode', t.mode, [['light', '☀️ Claro'], ['dark', '🌙 Escuro'], ['auto', '📱 Do sistema']])}</div>
  <div class="field"><label>Tom das cores</label>${seg('th_tone', t.tone, [['suave', 'Suave'], ['medio', 'Médio'], ['vibrante', 'Vibrante']])}</div>
  <div class="field"><label>Tamanho da letra</label>${seg('th_font', t.font, [['pequena', 'Pequena'], ['normal', 'Normal'], ['grande', 'Grande']])}</div>`;
}
function bindThemeEditor(root, t, onChange) {
  const cur = { ...DEFAULT_THEME, ...t };
  const emit = () => { applyTheme(cur); onChange && onChange({ ...cur }); };
  $$('#th_presets .sw', root).forEach(b => b.onclick = () => {
    const p = PRESETS[b.dataset.p]; Object.assign(cur, { preset: b.dataset.p, a: p.a, b: p.b });
    $$('#th_presets .sw', root).forEach(x => x.classList.toggle('on', x === b));
    $('#th_a', root).value = p.a; $('#th_b', root).value = p.b; emit();
  });
  $('#th_a', root).oninput = e => { cur.a = e.target.value; cur.preset = 'custom'; $$('#th_presets .sw', root).forEach(x => x.classList.remove('on')); emit(); };
  $('#th_b', root).oninput = e => { cur.b = e.target.value; cur.preset = 'custom'; $$('#th_presets .sw', root).forEach(x => x.classList.remove('on')); emit(); };
  [['th_mode', 'mode'], ['th_tone', 'tone'], ['th_font', 'font']].forEach(([id, key]) => {
    $$(`#${id} button`, root).forEach(b => b.onclick = () => { cur[key] = b.dataset.v; $$(`#${id} button`, root).forEach(x => x.classList.toggle('on', x === b)); emit(); });
  });
  return cur;
}

function showSetup({ editing = false } = {}) {
  $('#main').classList.add('hidden');
  const el = $('#setup'); el.classList.remove('hidden');
  let theme = { ...DEFAULT_THEME };
  applyTheme(theme);
  const needKey = !S.settings.apiKey;
  el.innerHTML = `<div class="setup-card">
    <div class="setup-hero"><div class="avatar">${FLOWER}</div><h1>Estude com Flor</h1><p>${editing ? 'Vamos criar um novo perfil 🌷' : 'Oi! Antes de começar, me conta um pouco sobre você 🌷'}</p></div>
    <div class="step"><h3><span>1</span>Sobre você e sua IA</h3>${profileFormHTML()}</div>
    <div class="step"><h3><span>2</span>Deixe com a sua cara</h3>${themeEditorHTML(theme)}</div>
    ${needKey ? `<div class="step"><h3><span>3</span>Chave da IA</h3>${apiKeyFieldHTML()}</div>` : ''}
    <button class="btn primary" id="setupGo" style="width:100%;padding:14px;font-size:1rem">Começar a estudar 🌸</button>
    ${editing ? '<button class="btn ghost" id="setupCancel" style="width:100%;margin-top:8px">Cancelar</button>' : ''}
  </div>`;
  bindProfileForm(el);
  bindThemeEditor(el, theme, t => theme = t);
  if (editing) $('#setupCancel').onclick = () => { applyTheme(S.profile.theme); showMain(); };
  $('#setupGo').onclick = async () => {
    const p = readProfileForm(el);
    if (!p.userName) return toast('Me diz seu nome 🙂');
    if (!p.curso) return toast('Qual curso você faz? Isso me ajuda a falar a sua língua.');
    if (needKey) {
      const k = $('#set_key', el).value.trim();
      if (!k) return toast('Cole a sua chave da API para eu funcionar');
      S.settings.apiKey = k;
    }
    const prof = { id: uid(), ...p, theme, createdAt: Date.now() };
    S.profiles.push(prof); S.settings.activeProfileId = prof.id;
    await saveProfiles(); await saveSettings();
    await activateProfile(prof.id);
  };
}
function apiKeyFieldHTML() {
  return `<div class="field"><label>Chave da API da Anthropic (Claude)</label>
  <input type="password" id="set_key" value="${esc(S.settings.apiKey)}" placeholder="sk-ant-..." autocomplete="off">
  <small>É o “cérebro” do app. Crie em <b>console.anthropic.com</b> → API Keys, adicione créditos e cole aqui. Fica salva só neste celular. Vocês dois podem usar a mesma chave.</small></div>`;
}

/* =========================================================
   TELA PRINCIPAL
   ========================================================= */
async function activateProfile(id) {
  S.profile = S.profiles.find(p => p.id === id) || S.profiles[0];
  S.settings.activeProfileId = S.profile.id; await saveSettings();
  applyTheme(S.profile.theme);
  const all = await DB.all('chats');
  S.chats = all.filter(c => c.profileId === S.profile.id).sort((a, b) => b.updatedAt - a.updatedAt);
  // remove chats vazios antigos e reabre a última conversa
  for (const c of S.chats.filter((c, i) => i > 0 && !c.messages.length)) await DB.del('chats', c.id);
  S.chats = S.chats.filter((c, i) => i === 0 || c.messages.length);
  S.chat = S.chats[0] || null; S.pending = []; S.mode = null;
  if (!S.chat) await newChat(false);
  showMain();
}
function showMain() {
  $('#setup').classList.add('hidden'); $('#setup').innerHTML = ''; $('#main').classList.remove('hidden');
  const p = S.profile;
  $('#aiAvatar').innerHTML = aiIcon(p);
  $('#aiName').textContent = p.aiName;
  $('#aiSub').textContent = [p.curso, p.faculdade].filter(Boolean).join(' · ') || 'Estude com Flor';
  renderChips(); renderPending(); renderModePill(); renderMessages(); renderDrawer(); updateSendBtn();
}
async function newChat(render = true) {
  if (render && S.chat && !S.chat.messages.length) { closeDrawer(); $('#input').focus(); return; }
  const c = { id: uid(), profileId: S.profile.id, title: 'Novo chat', createdAt: Date.now(), updatedAt: Date.now(), contextStart: 0, messages: [] };
  S.chats.unshift(c); S.chat = c; S.pending = []; S.mode = null;
  await saveChat(c, true);
  if (render) { renderMessages(); renderDrawer(); renderPending(); renderModePill(); renderChips(); closeDrawer(); $('#input').focus(); }
}
async function openChat(id) {
  if (S.busy) return toast('Espere eu terminar de responder 🙂');
  S.chat = S.chats.find(c => c.id === id); S.pending = []; S.mode = null;
  renderMessages(); renderDrawer(); renderPending(); renderModePill(); renderChips(); closeDrawer();
}
async function deleteChat(id) {
  if (!(await confirmBox('Apagar chat?', 'Essa conversa será apagada deste aparelho.', 'Apagar'))) return;
  await DB.del('chats', id);
  S.chats = S.chats.filter(c => c.id !== id);
  if (S.chat && S.chat.id === id) { S.chat = S.chats[0]; if (!S.chat) await newChat(false); renderMessages(); }
  renderDrawer();
}

/* ---------- gaveta ---------- */
function renderDrawer() {
  const d = $('#drawer'); const p = S.profile;
  const profs = S.profiles.map(x => `<button class="prof ${x.id === p.id ? 'active' : ''}" data-prof="${x.id}"><span class="dot" style="background:linear-gradient(135deg,${x.theme?.a || '#e75480'},${x.theme?.b || '#f9a8c9'})"></span>${esc(x.userName)}</button>`).join('');
  const chats = S.chats.map(c => `<div class="chat-item ${S.chat && c.id === S.chat.id ? 'active' : ''}">
      <button class="t" data-open="${c.id}"><div>${esc(c.title)}</div><small>${fmtDate(c.updatedAt)} · ${c.messages.filter(m => !m.divider).length} msgs</small></button>
      <button class="x" data-del="${c.id}" aria-label="Apagar">🗑</button></div>`).join('');
  d.innerHTML = `
    <div class="drawer-head"><div class="avatar sm">${FLOWER}</div><div class="brand">Estude com Flor</div></div>
    <div class="drawer-sec"><h4>Perfis</h4><div class="profiles">${profs}<button class="prof" id="addProf">＋ Novo</button></div></div>
    <div class="drawer-sec" style="padding-bottom:4px"><button class="btn primary" id="drawerNew" style="width:100%">＋ Novo chat</button></div>
    <div class="drawer-sec" style="padding-bottom:0"><h4>Seus chats</h4></div>
    <div class="chat-list">${chats || '<p style="color:var(--muted);padding:8px">Nenhum chat ainda.</p>'}</div>`;
  $$('[data-open]', d).forEach(b => b.onclick = () => openChat(b.dataset.open));
  $$('[data-del]', d).forEach(b => b.onclick = () => deleteChat(b.dataset.del));
  $$('[data-prof]', d).forEach(b => b.onclick = async () => { if (S.busy) return; closeDrawer(); await activateProfile(b.dataset.prof); });
  $('#addProf').onclick = () => { closeDrawer(); showSetup({ editing: true }); };
  $('#drawerNew').onclick = () => newChat();
}
function openDrawer() { renderDrawer(); $('#drawer').classList.add('open'); $('#drawerShade').classList.remove('hidden'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawerShade').classList.add('hidden'); }

/* ---------- atalhos (chips) ---------- */
const CHIPS = [
  { id: 'trabalho', label: '📄 Montar trabalho', mode: true },
  { id: 'slides', label: '📊 Montar slides', mode: true },
  { id: 'pesquisa', label: '🔎 Pesquisar', mode: true },
  { id: 'resumo', label: '📝 Resumo', fill: 'Faça um resumo esquematizado, com os pontos que mais caem em prova, sobre: ' },
  { id: 'questoes', label: '🧠 Questões', fill: 'Crie 5 questões estilo prova (com gabarito comentado) sobre: ' },
  { id: 'explicar', label: '💡 Explicar fácil', fill: 'Me explica de um jeito simples, com exemplo da minha área: ' },
  { id: 'cronograma', label: '🗓️ Cronograma', fill: 'Monte um cronograma de estudos para minha prova. Matérias/conteúdos e data: ' },
  { id: 'esquecer', label: '🧹 Esquecer', action: 'forget' },
];
const MODE_INFO = {
  trabalho: { title: 'Montar trabalho', hint: 'Diga o tema, o tipo (resumo, resenha, artigo, relatório…) e o tamanho. Arquivos anexados viram base do trabalho.' },
  slides: { title: 'Montar slides', hint: 'Diga o tema, quantos slides e o tempo da apresentação, se souber.' },
  pesquisa: { title: 'Pesquisar', hint: 'Vou buscar na internet em fontes confiáveis e citar os links.' },
};
function renderChips() {
  const el = $('#chips');
  el.innerHTML = CHIPS.map(c => `<button class="chip ${S.mode === c.id ? 'on' : ''}" data-chip="${c.id}">${c.label}</button>`).join('');
  $$('[data-chip]', el).forEach(b => b.onclick = () => {
    const c = CHIPS.find(x => x.id === b.dataset.chip);
    if (c.action === 'forget') return forgetContext();
    if (c.mode) { S.mode = S.mode === c.id ? null : c.id; renderChips(); renderModePill(); $('#input').focus(); return; }
    const i = $('#input'); i.value = c.fill + i.value; autoGrow(); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  });
}
function renderModePill() {
  const el = $('#modePill');
  if (!S.mode) { el.classList.add('hidden'); return; }
  const info = MODE_INFO[S.mode];
  el.innerHTML = `<div><b>${info.title}</b> · ${info.hint}</div><button aria-label="Cancelar">✕</button>`;
  el.classList.remove('hidden');
  $('button', el).onclick = () => { S.mode = null; renderChips(); renderModePill(); };
}

/* ---------- mensagens ---------- */
function welcomeHTML() {
  const p = S.profile; const curso = p.curso || 'seu curso';
  const sugs = [
    ['Explicar um conceito', `Me explica um conceito importante de ${curso} que costuma confundir quem está no ${p.periodo || 'início do curso'}.`],
    ['Revisar para prova', 'Quero revisar para uma prova. Vou te mandar o conteúdo e você me faz perguntas, uma de cada vez.'],
    ['Analisar material', 'Vou te enviar um PDF/foto do meu material. Leia e me ajude a entender os pontos principais.'],
    ['Montar um trabalho', null],
  ];
  return `<div class="welcome"><div class="avatar big-avatar">${aiIcon(p)}</div>
    <h2>Oi, ${esc(p.userName)}! Eu sou ${p.aiGender === 'm' ? 'o' : 'a'} ${esc(p.aiName)} ${p.aiGender === 'm' ? '🌻' : '🌸'}</h2>
    <p>O que vamos estudar hoje em ${esc(curso)}?</p>
    <div class="sugs">${sugs.map(([t, q], i) => `<button class="sug" data-sug="${i}"><b>${t}</b>${q ? esc(q.slice(0, 70)) + '…' : 'Trabalho completo com normas ABNT, pronto em Word.'}</button>`).join('')}</div></div>`;
}
function renderMessages() {
  const box = $('#messages');
  if (!S.chat || !S.chat.messages.length) {
    box.innerHTML = welcomeHTML();
    $$('[data-sug]', box).forEach(b => b.onclick = () => {
      const i = +b.dataset.sug;
      if (i === 3) { S.mode = 'trabalho'; renderChips(); renderModePill(); $('#input').focus(); return; }
      const texts = [
        `Me explica um conceito importante de ${S.profile.curso} que costuma confundir quem está no ${S.profile.periodo || 'início do curso'}.`,
        'Quero revisar para uma prova. Vou te mandar o conteúdo e você me faz perguntas, uma de cada vez.',
        'Vou te enviar um material (PDF ou foto). Leia e me ajude a entender os pontos principais.',
      ];
      $('#input').value = texts[i]; autoGrow(); $('#input').focus();
    });
    return;
  }
  box.innerHTML = '';
  S.chat.messages.forEach(m => box.appendChild(renderMsg(m)));
  scrollBottom(true);
}
function attsHTML(atts) {
  if (!atts || !atts.length) return '';
  return `<div class="atts">${atts.map(a => a.kind === 'image'
    ? `<img class="att-thumb" src="${a.thumb || `data:${a.mediaType};base64,${a.data}`}" alt="">`
    : `<div class="att-file">${fileEmoji(a)}<span>${esc(a.name)}</span></div>`).join('')}</div>`;
}
function fileEmoji(a) {
  const n = (a.name || '').toLowerCase();
  if (a.kind === 'pdf') return '📕';
  if (/\.(docx?|odt|rtf)$/.test(n)) return '📘';
  if (/\.(xlsx?|ods|csv)$/.test(n)) return '📗';
  if (/\.(pptx?|odp)$/.test(n)) return '📙';
  if (a.kind === 'image') return '🖼️';
  return '📄';
}
function renderMsg(m) {
  const el = document.createElement('div');
  el.dataset.id = m.id;
  if (m.divider) { el.className = 'divider'; el.textContent = m.text; return el; }
  if (m.role === 'user') {
    el.className = 'msg user';
    const tag = m.mode && MODE_INFO[m.mode] ? `<div class="mode-tag">${MODE_INFO[m.mode].title}</div><br>` : '';
    el.innerHTML = `<div class="bubble">${tag}${attsHTML(m.attachments)}${esc(m.text)}</div>`;
    return el;
  }
  el.className = 'msg ai';
  const isLast = S.chat && S.chat.messages[S.chat.messages.length - 1] === m;
  let inner = '';
  if (m.text) inner += `<div class="md">${md(m.text)}</div>`;
  if (m.status) inner += `<div class="status" style="${m.text ? 'margin-top:8px' : ''}"><span class="dots"><i></i><i></i><i></i></span>${esc(m.status)}</div>`;
  if (m.error) inner += `<div class="err">⚠️ ${esc(m.error)}</div>`;
  if (m.artifact) inner += artifactHTML(m);
  if (m.sources && m.sources.length && !m.status) inner += `<div class="sources">${m.sources.slice(0, 8).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">🔗 ${esc(s.title || hostOf(s.url))}</a>`).join('')}</div>`;
  if (!m.status) {
    const btns = [];
    if (m.text) btns.push('<button data-a="copy">Copiar</button>');
    if (m.text && !m.artifact) btns.push('<button data-a="human">✍️ Humanizar</button>');
    if (m.original) btns.push('<button data-a="undo">↩️ Ver original</button>');
    if (isLast) btns.push('<button data-a="retry">🔄 Refazer</button>');
    if (btns.length) inner += `<div class="actions">${btns.join('')}</div>`;
  }
  el.innerHTML = `<div class="avatar sm">${aiIcon(S.profile)}</div><div class="bubble ${m.artifact ? 'wide' : ''}">${inner || '<span class="status">…</span>'}</div>`;
  $$('[data-a]', el).forEach(b => b.onclick = () => msgAction(m, b.dataset.a));
  $$('[data-art]', el).forEach(b => b.onclick = () => artifactAction(m, b.dataset.art));
  return el;
}
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
function updateMsg(m) {
  const box = $('#messages'); const old = $(`[data-id="${m.id}"]`, box);
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
  const el = renderMsg(m);
  if (old) old.replaceWith(el); else box.appendChild(el);
  if (near) scrollBottom();
}
let rafPending = null;
function updateMsgThrottled(m) {
  if (rafPending) return;
  rafPending = requestAnimationFrame(() => { rafPending = null; updateMsg(m); });
}
function scrollBottom(instant) {
  const box = $('#messages');
  if (instant) { box.style.scrollBehavior = 'auto'; box.scrollTop = box.scrollHeight; box.style.scrollBehavior = ''; }
  else box.scrollTop = box.scrollHeight;
}
function pushMsg(m) {
  if (!S.chat.messages.length) $('#messages').innerHTML = '';
  S.chat.messages.push(m);
  // atualiza o botão "refazer" da mensagem anterior
  const prev = S.chat.messages[S.chat.messages.length - 2];
  if (prev && prev.role === 'assistant') updateMsg(prev);
  $('#messages').appendChild(renderMsg(m)); scrollBottom();
}

/* =========================================================
   ANEXOS — aceita imagens, PDF, Word, Excel, PowerPoint, textos…
   ========================================================= */
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|css|js|ts|jsx|tsx|py|java|c|cpp|h|cs|php|rb|go|rs|kt|swift|sql|r|m|tex|bib|yaml|yml|ini|log|srt|vtt|rtf)$/i;
const MAX_TEXT = 180000;
function readAsArrayBuffer(f) { return f.arrayBuffer(); }
function readAsBase64(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
}
async function imageToJpeg(file, max = 1568) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Não consegui abrir essa imagem (formato não suportado).')); img.src = url; });
    const draw = (lim, q) => {
      const sc = Math.min(1, lim / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', q);
    };
    return { data: draw(max, 0.86).split(',')[1], thumb: draw(200, 0.7) };
  } finally { URL.revokeObjectURL(url); }
}
const clip = t => (t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) + '\n\n[…arquivo muito longo, o restante foi cortado]' : t);
async function zipText(file, pattern, sortKey) {
  const zip = await JSZip.loadAsync(await readAsArrayBuffer(file));
  const names = Object.keys(zip.files).filter(n => pattern.test(n)).sort(sortKey);
  const out = [];
  for (const n of names) {
    const xml = await zip.files[n].async('string');
    out.push({ name: n, text: xml.replace(/<\/a:p>|<\/text:p>|<\/w:p>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim() });
  }
  return out;
}
async function fileToAttachment(file) {
  const name = file.name || 'arquivo';
  const type = (file.type || '').toLowerCase();
  const low = name.toLowerCase();
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(low)) {
    const { data, thumb } = await imageToJpeg(file);
    return { id: uid(), name, kind: 'image', mediaType: 'image/jpeg', data, thumb };
  }
  if (type === 'application/pdf' || low.endsWith('.pdf')) {
    if (file.size > 30 * 1024 * 1024) throw new Error('PDF muito grande (máx. 30 MB).');
    return { id: uid(), name, kind: 'pdf', mediaType: 'application/pdf', data: await readAsBase64(file) };
  }
  if (low.endsWith('.docx')) {
    const r = await mammoth.extractRawText({ arrayBuffer: await readAsArrayBuffer(file) });
    return { id: uid(), name, kind: 'text', text: clip(r.value) };
  }
  if (/\.(xlsx|xlsm|xls|ods)$/.test(low)) {
    const wb = XLSX.read(await readAsArrayBuffer(file), { type: 'array' });
    const text = wb.SheetNames.map(n => `### Planilha: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
    return { id: uid(), name, kind: 'text', text: clip(text) };
  }
  if (low.endsWith('.pptx')) {
    const num = n => +(n.match(/(\d+)\.xml$/) || [0, 0])[1];
    const slides = await zipText(file, /^ppt\/slides\/slide\d+\.xml$/, (a, b) => num(a) - num(b));
    const notes = await zipText(file, /^ppt\/notesSlides\/notesSlide\d+\.xml$/, (a, b) => num(a) - num(b));
    let text = slides.map((s, i) => `--- Slide ${i + 1} ---\n${s.text}`).join('\n\n');
    if (notes.length) text += '\n\n=== Anotações ===\n' + notes.map((s, i) => `(${i + 1}) ${s.text}`).join('\n');
    return { id: uid(), name, kind: 'text', text: clip(text) };
  }
  if (/\.(odt|odp)$/.test(low)) {
    const parts = await zipText(file, /^content\.xml$/);
    return { id: uid(), name, kind: 'text', text: clip(parts.map(p => p.text).join('\n')) };
  }
  if (low.endsWith('.doc') || low.endsWith('.ppt')) throw new Error(`"${name}" está num formato antigo do Office. Salve como .docx/.pptx ou PDF e envie de novo.`);
  if (type.startsWith('audio/') || type.startsWith('video/')) throw new Error('Ainda não consigo ouvir áudios ou assistir vídeos. Envie a transcrição, prints ou o PDF da aula.');
  if (type.startsWith('text/') || TEXT_EXT.test(low) || type.includes('json') || type.includes('xml')) {
    let text = await file.text();
    if (low.endsWith('.rtf')) text = text.replace(/\\par[d]?/g, '\n').replace(/\{\*?\\[^{}]+}|[{}]|\\[a-z]+\d* ?/gi, '');
    return { id: uid(), name, kind: 'text', text: clip(text) };
  }
  // tentativa final: se parecer texto, aceita
  const sample = await file.slice(0, 4000).text();
  if (!/[\x00-\x08\x0E-\x1F]/.test(sample)) return { id: uid(), name, kind: 'text', text: clip(await file.text()) };
  throw new Error(`Ainda não sei ler o formato de "${name}". Tente enviar em PDF, imagem ou Word.`);
}
async function addFiles(files) {
  for (const f of files) {
    const tmp = { id: uid(), name: f.name, loading: true };
    S.pending.push(tmp); renderPending();
    try {
      const att = await fileToAttachment(f);
      Object.assign(tmp, att, { loading: false });
    } catch (e) {
      S.pending = S.pending.filter(x => x !== tmp); toast(e.message, 4500);
    }
    renderPending();
  }
}
function renderPending() {
  const el = $('#pending');
  el.innerHTML = S.pending.map(a => `<div class="pend ${a.loading ? 'loading' : ''}">${a.kind === 'image' ? `<img src="${a.thumb}">` : `<div class="ic">${a.loading ? '⏳' : fileEmoji(a)}</div>`}<span>${esc(a.name)}</span><button data-rm="${a.id}">✕</button></div>`).join('');
  $$('[data-rm]', el).forEach(b => b.onclick = () => { S.pending = S.pending.filter(a => a.id !== b.dataset.rm); renderPending(); });
}

/* =========================================================
   PROMPTS (personalidade, dialeto da área, continuidade)
   ========================================================= */
function systemPrompt(p = S.profile) {
  const f = p.aiGender !== 'm';
  const curso = p.curso || 'o curso da pessoa';
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `Você é ${p.aiName}, ${f ? 'a assistente' : 'o assistente'} de estudos do aplicativo "Estude com Flor". Sua identidade é ${f ? 'feminina' : 'masculina'}: quando falar de si, use a concordância no ${f ? 'feminino ("fico feliz", "estou pronta", "obrigada")' : 'masculino ("estou pronto", "obrigado")'}. Não fique repetindo seu nome nem se reapresentando.
Hoje é ${hoje}.

# Quem você está ajudando
- Nome: ${p.userName}
- Instituição: ${p.faculdade || '(não informada)'}
- Curso: ${p.curso || '(não informado)'}${p.periodo ? ` — ${p.periodo}` : ''}
${p.curso ? '' : '- Antes de tudo, pergunte com simpatia qual faculdade e qual curso a pessoa faz, porque isso muda o jeito de explicar.\n'}
# Jeito de falar
- Português do Brasil, tom próximo, acolhedor e confiante, como ${f ? 'uma veterana/monitora' : 'um veterano/monitor'} de ${curso} que domina o conteúdo e gosta de ensinar.
- Adapte o vocabulário à área de ${curso}: use os termos técnicos e o jeito de raciocinar da área com naturalidade e precisão (ex.: Direito pensa em lei, doutrina e jurisprudência; Enfermagem em processo de enfermagem e cuidado; Engenharia em cálculo, normas e dimensionamento; Psicologia em abordagens teóricas).
- Sem exageros: não force jargão, não faça caricatura da profissão, não encha de gírias ou emojis. Quando usar um termo avançado para o período da pessoa, explique em uma frase.
- Tamanho certo: direto em perguntas simples; mais completo quando a pessoa estiver estudando um tema.

# Continuidade da conversa (muito importante)
- Este chat é um único fio de raciocínio. Tudo que já foi dito, enviado ou combinado aqui continua valendo até o fim.
- Quando chegarem novos arquivos, imagens ou links neste mesmo chat, trate-os como continuação do mesmo assunto: conecte com o que já foi discutido, mantenha as mesmas premissas, nomes e decisões. Não recomece do zero e não troque de tema por conta própria.
- Só mude de assunto se a pessoa pedir claramente.

# Estudos universitários
- Em conteúdo difícil, explique passo a passo, com exemplos da área de ${curso}, analogias e, quando ajudar, tabelas ou esquemas em markdown.
- Você pode propor exercícios, questões estilo prova com gabarito comentado, flashcards, mapas mentais em texto, cronogramas e técnicas como revisão espaçada e autoexplicação.
- Ao analisar imagens (fotos de caderno, lousa, livro, exercícios), leia com atenção, transcreva o que for relevante e resolva/explique.
- Em trabalhos acadêmicos, siga as normas da ABNT quando fizer sentido.
- Fórmulas em texto legível (ex.: x² + 3x − 4 = 0, √2, Δ = b² − 4ac, ∫ f(x) dx), sem LaTeX.

# Pesquisa e fontes
- Use a busca na web quando precisar de informação atual, dados, legislação vigente, artigos científicos, ou quando a pessoa pedir pesquisa. Se houver link na mensagem, leia o conteúdo dele.
- Nunca invente autores, livros, artigos, leis, jurisprudência ou números. Se não tiver certeza, diga e indique onde verificar.
- Quando usar fontes da web, termine com "Fontes:" e os links.

# Formatação
- Markdown leve: títulos curtos, **negrito** nos conceitos-chave, listas quando ajudarem. Evite paredões de texto.`;
}
function humanizeSystem(p = S.profile) {
  return `Você é ${p.aiGender === 'm' ? 'um revisor' : 'uma revisora'} de textos acadêmicos em português do Brasil. Reescreva o conteúdo para que soe como escrito por ${p.aiGender === 'm' ? 'um estudante' : 'uma estudante'} universitário(a) de ${p.curso || 'graduação'} caprichoso(a), com voz natural e humana:
- varie o tamanho e a estrutura das frases e dos parágrafos; alterne frases curtas e longas, com ritmo irregular e natural;
- use conectivos variados; corte fórmulas repetitivas e clichês típicos de texto automático ("Em suma", "É importante ressaltar", "Vale destacar", "Nesse sentido" repetido, "No mundo atual", "desempenha um papel crucial", "Além disso" em excesso, enumerações sempre em trios, travessões em excesso, frases de efeito vazias);
- prefira exemplos concretos e afirmações diretas a generalidades;
- mantenha toda a precisão técnica, todas as informações, a estrutura (títulos, seções, slides), as citações e as referências;
- mantenha a norma culta e o registro do original (acadêmico continua acadêmico; conversa continua conversa);
- não acrescente fatos novos e não comente o que fez — entregue só o texto reescrito.`;
}

/* =========================================================
   CHAMADA À IA (streaming + pesquisa web + leitura de links)
   ========================================================= */
function webTools() {
  if (!S.settings.webSearch) return [];
  const t = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  if (!S.noFetch) t.push({ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 5 });
  return t;
}
function friendlyError(status, msg) {
  if (status === 401) return 'Chave da API inválida. Confira em Configurações → IA.';
  if (status === 403) return 'Sua chave não tem permissão para isso. ' + msg;
  if (status === 429) return 'Muitas mensagens seguidas (limite da API). Espere um pouquinho e tente de novo.';
  if (status === 529 || status === 503) return 'Os servidores da IA estão sobrecarregados agora. Tente de novo em instantes.';
  if (/credit|balance/i.test(msg)) return 'Sem créditos na conta da API. Adicione créditos em console.anthropic.com.';
  if (/model/i.test(msg) && status === 404) return 'Modelo não encontrado. Escolha outro em Configurações → IA.';
  if (/too large|too long|prompt is too long/i.test(msg)) return 'A conversa ficou grande demais para a IA. Toque em 🧹 Esquecer ou abra um novo chat.';
  return `Erro ${status}: ${msg}`;
}
async function callClaude({ system, messages, tools = [], toolChoice, maxTokens = 8000, onText, onStatus, onToolChars, signal }) {
  const st = S.settings;
  let useTools = tools.slice();
  let convo = messages.slice();
  let full = '', toolInput = null, stop = null; const sources = [];
  for (let round = 0, guard = 0; round < 4 && guard < 8; round++, guard++) {
    const body = { model: st.model, max_tokens: maxTokens, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages: convo, stream: true };
    if (useTools.length) body.tools = useTools;
    if (toolChoice) body.tool_choice = toolChoice;
    const headers = { 'content-type': 'application/json', 'x-api-key': st.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    if (useTools.some(t => t.name === 'web_fetch')) headers['anthropic-beta'] = 'web-fetch-2025-09-10';
    let res;
    try { res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body), signal }); }
    catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Sem conexão com a internet (ou o servidor não respondeu).'); }
    if (!res.ok) {
      const raw = await res.text(); let msg = raw; try { msg = JSON.parse(raw).error.message; } catch { }
      if (res.status === 400 && /web_fetch|beta/i.test(msg) && useTools.some(t => t.name === 'web_fetch')) { S.noFetch = true; useTools = useTools.filter(t => t.name !== 'web_fetch'); round--; continue; }
      if (res.status === 400 && /web_search|server tool/i.test(msg) && useTools.some(t => t.name === 'web_search')) { useTools = useTools.filter(t => !String(t.type || '').startsWith('web_')); round--; toast('Pesquisa na web indisponível nesta conta — respondendo sem ela.'); continue; }
      if ((res.status === 529 || res.status === 503) && guard < 3) { onStatus && onStatus('Servidor ocupado, tentando de novo…'); await sleep(2500 * (guard + 1)); round--; continue; }
      throw new Error(friendlyError(res.status, msg));
    }
    const r = await readStream(res, {
      onText: t => { full += t; onText && onText(full); },
      onStatus, onToolChars,
    });
    sources.push(...r.sources); stop = r.stop;
    if (r.toolInput) toolInput = r.toolInput;
    if (stop === 'pause_turn') {
      const blocks = r.blocks.filter(b => !(b.type === 'text' && !b.text));
      convo = [...convo, { role: 'assistant', content: blocks }];
      continue;
    }
    break;
  }
  const seen = new Set();
  return { text: full, toolInput, stop, sources: sources.filter(s => s.url && !seen.has(s.url) && seen.add(s.url)) };
}
async function readStream(res, cb) {
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
  const blocks = []; const jsonBuf = {}; const sources = []; let stop = null, toolInput = null;
  const handle = ev => {
    switch (ev.type) {
      case 'content_block_start': {
        const b = ev.content_block;
        if (b.type === 'text') blocks[ev.index] = { type: 'text', text: '' };
        else if (b.type === 'tool_use' || b.type === 'server_tool_use') {
          blocks[ev.index] = { type: b.type, id: b.id, name: b.name, input: {} }; jsonBuf[ev.index] = '';
          if (b.type === 'server_tool_use') cb.onStatus && cb.onStatus(b.name === 'web_fetch' ? 'Lendo o link…' : 'Pesquisando na web…');
        } else {
          blocks[ev.index] = b;
          if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach(x => x.url && sources.push({ url: x.url, title: x.title }));
          if (b.type === 'web_fetch_tool_result' && b.content && b.content.url) sources.push({ url: b.content.url, title: (b.content.content && b.content.content.title) || hostOf(b.content.url) });
          cb.onStatus && cb.onStatus('Analisando o que encontrei…');
        }
        break;
      }
      case 'content_block_delta': {
        const d = ev.delta, blk = blocks[ev.index];
        if (d.type === 'text_delta' && blk) { blk.text += d.text; cb.onText(d.text); }
        else if (d.type === 'input_json_delta') { jsonBuf[ev.index] = (jsonBuf[ev.index] || '') + d.partial_json; cb.onToolChars && cb.onToolChars(jsonBuf[ev.index].length); }
        else if (d.type === 'citations_delta' && d.citation && d.citation.url) sources.push({ url: d.citation.url, title: d.citation.title });
        break;
      }
      case 'content_block_stop': {
        const blk = blocks[ev.index];
        if (blk && (blk.type === 'tool_use' || blk.type === 'server_tool_use')) {
          const raw = jsonBuf[ev.index] || '';
          blk.input = parseJsonLenient(raw) || {};
          if (blk.type === 'tool_use') toolInput = blk.input;
        }
        break;
      }
      case 'message_delta': if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason; break;
      case 'error': throw new Error((ev.error && ev.error.message) || 'Erro no servidor da IA');
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
      if (!data) continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      handle(ev);
    }
  }
  // se o JSON da ferramenta foi cortado (max_tokens), tenta recuperar
  if (!toolInput) {
    const idx = blocks.findIndex(b => b && b.type === 'tool_use');
    if (idx >= 0) toolInput = parseJsonLenient(jsonBuf[idx] || '');
  }
  return { blocks: blocks.filter(Boolean), stop, sources, toolInput };
}
function parseJsonLenient(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { }
  // fecha strings/colchetes abertos de um JSON truncado
  let out = '', stack = [], inStr = false, escp = false;
  for (const ch of s) {
    out += ch;
    if (inStr) { if (escp) escp = false; else if (ch === '\\') escp = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{' || ch === '[') stack.push(ch); else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inStr) out += '"';
  out = out.replace(/[,:]\s*$/, '');
  while (stack.length) out += stack.pop() === '{' ? '}' : ']';
  try { return JSON.parse(out); } catch { return null; }
}

/* ---------- monta o histórico enviado à IA (mantém o raciocínio do chat) ---------- */
function buildApiMessages(chat, endIdx = chat.messages.length) {
  const list = chat.messages.slice(chat.contextStart || 0, endIdx)
    .filter(m => !m.divider && !m.error && !m.status && (m.role === 'user' || m.apiText || m.text));
  // orçamento de arquivos binários (imagens/PDF): mantém os mais recentes
  let budget = 18 * 1024 * 1024, images = 0; const keep = new Set();
  for (let i = list.length - 1; i >= 0; i--) for (const a of (list[i].attachments || [])) {
    if (!a.data) continue;
    if (a.kind === 'image' && images >= 90) continue;
    if (budget - a.data.length > 0) { budget -= a.data.length; keep.add(a.id); if (a.kind === 'image') images++; }
  }
  const out = [];
  for (const m of list) {
    let content;
    if (m.role === 'user') {
      content = [];
      for (const a of (m.attachments || [])) {
        if (a.kind === 'image' && keep.has(a.id)) content.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } });
        else if (a.kind === 'pdf' && keep.has(a.id)) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data }, title: a.name });
        else if (a.kind === 'text') content.push({ type: 'text', text: `📎 Arquivo enviado: "${a.name}"\n\n${a.text}` });
        else content.push({ type: 'text', text: `[O arquivo "${a.name}" foi enviado antes nesta conversa e já foi analisado acima.]` });
      }
      let t = m.text || '';
      if (m.mode === 'pesquisa') t = `[Modo pesquisa: pesquise na web em fontes confiáveis e atuais antes de responder, compare as fontes e cite os links.]\n${t}`;
      if (m.mode === 'trabalho') t = `[Pedido de trabalho acadêmico] ${t}`;
      if (m.mode === 'slides') t = `[Pedido de apresentação de slides] ${t}`;
      if (!t.trim()) t = 'Analise o que acabei de enviar, conectando com o que estamos estudando neste chat.';
      content.push({ type: 'text', text: t });
    } else {
      content = (m.apiText || m.text || '').trim() || '(sem texto)';
    }
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      const toArr = c => (typeof c === 'string' ? [{ type: 'text', text: c }] : c);
      last.content = [...toArr(last.content), ...toArr(content)];
    } else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  const lu = out[out.length - 1];
  if (lu && lu.role === 'user' && Array.isArray(lu.content)) lu.content[lu.content.length - 1] = { ...lu.content[lu.content.length - 1], cache_control: { type: 'ephemeral' } };
  return out;
}

/* =========================================================
   ENVIO
   ========================================================= */
const FORGET_RE = /^\s*(por favor[, ]*)?(esque[çc]a|esquece|esquecer|pode esquecer|apaga|apague|zera|zere|reinicia|reinicie)\b.{0,40}\b(tudo|isso|conversa|assunto|contexto|mem[óo]ria|anterior|o que (eu )?(falei|disse|mandei))/i;
async function forgetContext(silentText) {
  if (S.busy) return;
  if (!S.chat.messages.length) return toast('O chat já está vazio 🙂');
  S.chat.messages.push({ id: uid(), divider: true, text: '🧹 Memória apagada — daqui pra frente começo do zero', ts: Date.now() });
  S.chat.contextStart = S.chat.messages.length;
  const f = S.profile.aiGender !== 'm';
  S.chat.messages.push({ id: uid(), role: 'assistant', text: `Pronto, esqueci tudo o que conversamos antes${silentText ? '' : ''}. Sobre o que vamos estudar agora? ${f ? '🌸' : '🌻'}`, ts: Date.now(), local: true });
  saveChat(); renderMessages(); renderDrawer();
}
function updateSendBtn() {
  const b = $('#btnSend'); b.innerHTML = S.busy ? IC.stop : IC.send; b.setAttribute('aria-label', S.busy ? 'Parar' : 'Enviar');
}
function setBusy(v) { S.busy = v; updateSendBtn(); }

async function send() {
  if (S.busy) { S.abort && S.abort.abort(); return; }
  if (S.pending.some(a => a.loading)) return toast('Espere os arquivos terminarem de carregar…');
  const input = $('#input');
  const text = input.value.trim();
  const atts = S.pending.slice();
  if (!text && !atts.length) return;
  if (!S.settings.apiKey) { openSettings('ia'); return toast('Coloque sua chave da API primeiro'); }
  if (!atts.length && FORGET_RE.test(text)) {
    input.value = ''; autoGrow();
    S.chat.messages.push({ id: uid(), role: 'user', text, ts: Date.now() });
    return forgetContext(true);
  }
  const mode = S.mode;
  input.value = ''; autoGrow(); S.pending = []; renderPending();
  if (mode) { S.mode = null; renderChips(); renderModePill(); }
  const um = { id: uid(), role: 'user', text, attachments: atts, mode, ts: Date.now() };
  if (S.chat.title === 'Novo chat') S.chat.title = (text || atts[0]?.name || 'Chat').replace(/\s+/g, ' ').slice(0, 48);
  pushMsg(um); saveChat(); renderDrawer();
  await respond(mode);
}

async function respond(mode) {
  if (mode === 'trabalho' || mode === 'slides') return runDocument(mode);
  return runChat();
}

async function runChat() {
  const chat = S.chat;
  const am = { id: uid(), role: 'assistant', text: '', status: 'Pensando…', sources: [], ts: Date.now() };
  const apiMsgs = buildApiMessages(chat);
  pushMsg(am); setBusy(true);
  S.abort = new AbortController();
  try {
    const r = await callClaude({
      system: systemPrompt(), messages: apiMsgs, tools: webTools(), maxTokens: 8000, signal: S.abort.signal,
      onText: full => { am.text = full; am.status = 'Escrevendo…'; updateMsgThrottled(am); },
      onStatus: s => { am.status = s; updateMsgThrottled(am); },
    });
    am.text = r.text || (r.stop === 'max_tokens' ? '' : 'Hmm, não consegui gerar uma resposta. Tenta de novo?');
    am.sources = r.sources;
    if (r.stop === 'max_tokens') am.text += '\n\n*(A resposta ficou longa e foi cortada — peça "continue" que eu sigo daqui.)*';
  } catch (e) {
    if (e.name === 'AbortError') { am.text = am.text || '*(interrompido)*'; }
    else { am.error = e.message; }
  } finally {
    am.status = null; setBusy(false); S.abort = null;
    if (S.chat === chat) updateMsg(am);
    saveChat(chat);
  }
}

/* ---------- trabalhos e slides ---------- */
const TRABALHO_TOOL = {
  name: 'entregar_trabalho',
  description: 'Entrega o trabalho acadêmico completo, estruturado, para ser exportado em Word no padrão ABNT.',
  input_schema: {
    type: 'object', properties: {
      titulo: { type: 'string' },
      subtitulo: { type: 'string', description: 'Opcional' },
      tipo: { type: 'string', description: 'Ex.: Trabalho acadêmico, Resenha crítica, Artigo, Relatório, Fichamento, Estudo de caso, Resumo' },
      resumo: { type: 'string', description: 'Resumo de 150 a 250 palavras. Deixe vazio se não fizer sentido para o tipo.' },
      palavras_chave: { type: 'array', items: { type: 'string' } },
      secoes: {
        type: 'array', items: {
          type: 'object', properties: {
            titulo: { type: 'string', description: 'Título da seção, sem numeração (o app numera).' },
            conteudo: { type: 'string', description: 'Texto da seção em parágrafos separados por uma linha em branco. Use "### " no início da linha para subtítulos e "- " para itens de lista. Citações no padrão ABNT, ex.: (SILVA, 2020, p. 15).' },
          }, required: ['titulo', 'conteudo'],
        },
      },
      referencias: { type: 'array', items: { type: 'string' }, description: 'Referências em ABNT, apenas obras reais e verificáveis, em ordem alfabética.' },
    }, required: ['titulo', 'secoes'],
  },
};
const SLIDES_TOOL = {
  name: 'entregar_slides',
  description: 'Entrega a apresentação de slides completa, para ser exportada em PowerPoint.',
  input_schema: {
    type: 'object', properties: {
      titulo: { type: 'string' },
      subtitulo: { type: 'string' },
      slides: {
        type: 'array', items: {
          type: 'object', properties: {
            titulo: { type: 'string' },
            topicos: { type: 'array', items: { type: 'string' }, description: 'De 2 a 6 tópicos curtos (até ~15 palavras cada).' },
            destaque: { type: 'string', description: 'Opcional: um número, frase-chave ou conceito para aparecer em destaque.' },
            notas: { type: 'string', description: 'Fala do apresentador para este slide (o que dizer, em 3 a 6 frases).' },
          }, required: ['titulo', 'topicos'],
        },
      },
      referencias: { type: 'array', items: { type: 'string' } },
    }, required: ['titulo', 'slides'],
  },
};

async function runDocument(kind) {
  const chat = S.chat; const p = S.profile;
  const isT = kind === 'trabalho';
  const am = { id: uid(), role: 'assistant', text: '', status: 'Planejando…', sources: [], ts: Date.now() };
  const base = buildApiMessages(chat);
  pushMsg(am); setBusy(true);
  S.abort = new AbortController(); const signal = S.abort.signal;
  const setStatus = s => { am.status = s; updateMsgThrottled(am); };
  const withNote = (msgs, note) => {
    const copy = msgs.map(m => ({ ...m, content: Array.isArray(m.content) ? m.content.map(c => { const { cache_control, ...rest } = c; return rest; }) : m.content }));
    const last = copy[copy.length - 1];
    last.content = [...(Array.isArray(last.content) ? last.content : [{ type: 'text', text: last.content }]), { type: 'text', text: note }];
    return copy;
  };
  try {
    // 1) pesquisa de fontes
    let notes = '';
    if (S.settings.webSearch) {
      setStatus('Pesquisando fontes confiáveis…');
      const r1 = await callClaude({
        system: systemPrompt(), signal, tools: webTools(), maxTokens: 4000, onStatus: setStatus,
        messages: withNote(base, `Antes de montar ${isT ? 'o trabalho' : 'os slides'}, pesquise na web fontes confiáveis (artigos científicos, livros, sites oficiais, legislação, dados atualizados) sobre o tema pedido acima. Responda SOMENTE com notas de pesquisa: (1) principais pontos, conceitos e dados, cada um com sua fonte; (2) lista de referências reais no padrão ABNT, com links. Ainda não escreva ${isT ? 'o trabalho' : 'os slides'}.`),
      });
      notes = r1.text; am.sources = r1.sources;
    }
    // 2) escrita
    setStatus(isT ? 'Escrevendo o trabalho…' : 'Montando os slides…');
    const instr = isT
      ? `Agora monte o trabalho completo usando a ferramenta entregar_trabalho. Conteúdo aprofundado, de nível universitário, para ${p.curso || 'a graduação'}, com introdução, desenvolvimento dividido em seções e conclusão (adapte a estrutura ao tipo pedido). Se não foi pedido um tamanho, escreva entre 1800 e 3000 palavras. Leve em conta tudo o que já foi conversado e todos os arquivos enviados neste chat. Use só referências reais (de preferência as das notas de pesquisa) e cite no texto em ABNT.`
      : `Agora monte a apresentação usando a ferramenta entregar_slides. Se não foi pedido um número, faça de 10 a 14 slides: abertura com objetivos, desenvolvimento lógico e conclusão. Tópicos curtos e claros, e notas do apresentador com a fala completa de cada slide. Leve em conta tudo o que já foi conversado e todos os arquivos enviados neste chat.`;
    const tool = isT ? TRABALHO_TOOL : SLIDES_TOOL;
    const r2 = await callClaude({
      system: systemPrompt(), signal, tools: [tool], toolChoice: { type: 'tool', name: tool.name }, maxTokens: 16000,
      messages: withNote(base, (notes ? `NOTAS DE PESQUISA:\n${notes}\n\n` : '') + instr),
      onToolChars: n => setStatus(`${isT ? 'Escrevendo o trabalho' : 'Montando os slides'}… (${Math.round(n / 5)} palavras)`),
    });
    let data = r2.toolInput;
    if (!data || !(isT ? data.secoes?.length : data.slides?.length)) throw new Error('Não consegui montar o conteúdo dessa vez. Toque em Refazer ou explique melhor o tema.');
    // 3) humanização
    let humanized = false;
    if (S.settings.humanize) {
      setStatus('Revisando o texto para ficar mais natural…');
      try {
        const r3 = await callClaude({
          system: humanizeSystem(), signal, tools: [tool], toolChoice: { type: 'tool', name: tool.name }, maxTokens: 16000,
          messages: [{ role: 'user', content: `Reescreva o conteúdo abaixo seguindo suas instruções e entregue pela ferramenta ${tool.name}, mantendo exatamente a mesma estrutura${isT ? ', seções, citações e referências' : ', quantidade de slides e referências (nos slides, mantenha os tópicos curtos e capriche na naturalidade das notas do apresentador)'}.\n\n${JSON.stringify(data)}` }],
          onToolChars: n => setStatus(`Revisando o texto para ficar mais natural… (${Math.min(99, Math.round(n / JSON.stringify(data).length * 100))}%)`),
        });
        const d2 = r3.toolInput;
        if (d2 && (isT ? d2.secoes?.length >= data.secoes.length * 0.8 : d2.slides?.length >= data.slides.length * 0.8)) { data = d2; humanized = true; }
      } catch (e) { if (e.name === 'AbortError') throw e; }
    }
    am.artifact = { kind, data, humanized };
    const f = p.aiGender !== 'm';
    am.text = isT
      ? `Prontinho! Montei ${data.tipo ? `${/^(a |o )/i.test(data.tipo) ? '' : 'o '}${data.tipo.toLowerCase()}` : 'o trabalho'} **“${data.titulo}”** com ${data.secoes.length} seções${data.referencias?.length ? ` e ${data.referencias.length} referências` : ''}${humanized ? ', já revisado para uma escrita mais natural' : ''}. Baixe abaixo em Word (formatado em ABNT) ou me peça ajustes.`
      : `Prontinho! Montei a apresentação **“${data.titulo}”** com ${data.slides.length} slides e notas do apresentador${humanized ? ', já com o texto revisado para soar natural' : ''}. Baixe em PowerPoint abaixo ou me peça ajustes.`;
    am.apiText = `${am.text}\n\n[Conteúdo entregue ao usuário]\n${docToMarkdown(kind, data)}`;
    if (!f) am.text = am.text.replace('Prontinho', 'Pronto');
  } catch (e) {
    if (e.name === 'AbortError') am.text = '*(interrompido)*'; else am.error = e.message;
  } finally {
    am.status = null; setBusy(false); S.abort = null;
    if (S.chat === chat) updateMsg(am);
    saveChat(chat);
  }
}

function docToMarkdown(kind, d) {
  if (kind === 'trabalho') {
    let s = `# ${d.titulo}${d.subtitulo ? `: ${d.subtitulo}` : ''}\n`;
    if (d.resumo) s += `\n**Resumo:** ${d.resumo}\n`;
    if (d.palavras_chave?.length) s += `\n**Palavras-chave:** ${d.palavras_chave.join('; ')}.\n`;
    d.secoes.forEach((x, i) => { s += `\n## ${i + 1} ${x.titulo}\n\n${x.conteudo}\n`; });
    if (d.referencias?.length) s += `\n## Referências\n\n${d.referencias.join('\n\n')}\n`;
    return s;
  }
  let s = `# ${d.titulo}${d.subtitulo ? ` — ${d.subtitulo}` : ''}\n`;
  d.slides.forEach((x, i) => {
    s += `\n### Slide ${i + 1}: ${x.titulo}\n${(x.topicos || []).map(t => `- ${t}`).join('\n')}\n`;
    if (x.destaque) s += `> ${x.destaque}\n`;
    if (x.notas) s += `\n*Notas do apresentador:* ${x.notas}\n`;
  });
  if (d.referencias?.length) s += `\n### Referências\n${d.referencias.map(r => `- ${r}`).join('\n')}\n`;
  return s;
}
function artifactHTML(m) {
  const { kind, data: d, humanized } = m.artifact; const isT = kind === 'trabalho';
  const words = isT ? docToMarkdown(kind, d).split(/\s+/).length : 0;
  return `<div class="art"><div class="art-head"><div class="art-icon">${isT ? '📄' : '📊'}</div><div><div class="art-title">${esc(d.titulo)}</div>
    <div class="art-meta">${isT ? `${d.secoes.length} seções · ~${words} palavras · ABNT` : `${d.slides.length + 1 + (d.referencias?.length ? 1 : 0)} slides · com notas`}${humanized ? ' · ✍️ humanizado' : ''}</div></div></div>
    <div class="art-btns">
      <button class="btn primary sm" data-art="${isT ? 'docx' : 'pptx'}">⬇️ ${isT ? 'Baixar Word' : 'Baixar PowerPoint'}</button>
      <button class="btn sm" data-art="view">👁️ Ver</button>
      <button class="btn sm" data-art="copy">Copiar texto</button>
      <button class="btn sm" data-art="edit">✏️ Ajustar</button>
    </div></div>`;
}
async function artifactAction(m, act) {
  const { kind, data } = m.artifact;
  if (act === 'copy') return copyText(docToMarkdown(kind, data).replace(/^#+ /gm, '').replace(/\*\*/g, ''));
  if (act === 'edit') { S.mode = kind; renderChips(); renderModePill(); const i = $('#input'); i.placeholder = 'O que você quer mudar? (ex.: aumentar a conclusão, trocar o tema do slide 3…)'; i.focus(); return; }
  if (act === 'view') {
    const body = kind === 'trabalho'
      ? `<div class="doc-view md">${md(docToMarkdown(kind, data))}</div>`
      : `<div class="doc-view"><h1>${esc(data.titulo)}</h1>${data.slides.map((s, i) => `<div class="slide-card"><h4>${i + 1}. ${esc(s.titulo)}</h4><ul>${(s.topicos || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>${s.destaque ? `<b>${esc(s.destaque)}</b>` : ''}${s.notas ? `<div class="notes">🎤 ${esc(s.notas)}</div>` : ''}</div>`).join('')}</div>`;
    return openModal({ title: data.titulo, body });
  }
  try {
    toast('Gerando arquivo…');
    if (act === 'docx') { const b64 = await buildDocx(data); await saveFile(`${slug(data.titulo)}.docx`, b64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); }
    if (act === 'pptx') { const b64 = await buildPptx(data); await saveFile(`${slug(data.titulo)}.pptx`, b64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'); }
  } catch (e) { toast('Erro ao gerar arquivo: ' + e.message, 5000); }
}
const slug = s => (s || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'arquivo';

/* ---------- Word (ABNT) ---------- */
function inlineRuns(text, base = {}) {
  const D = window.docx; const runs = [];
  String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).forEach(part => {
    if (!part) return;
    if (/^\*\*[^*]+\*\*$/.test(part)) runs.push(new D.TextRun({ text: part.slice(2, -2), bold: true, ...base }));
    else if (/^\*[^*]+\*$/.test(part)) runs.push(new D.TextRun({ text: part.slice(1, -1), italics: true, ...base }));
    else runs.push(new D.TextRun({ text: part, ...base }));
  });
  return runs;
}
async function buildDocx(d) {
  const D = window.docx; const p = S.profile;
  const J = D.AlignmentType.JUSTIFIED, C = D.AlignmentType.CENTER;
  const body = (t, opt = {}) => new D.Paragraph({ children: inlineRuns(t), alignment: J, spacing: { line: 360, after: 0 }, indent: { firstLine: 709 }, ...opt });
  const center = (t, opt = {}, run = {}) => new D.Paragraph({ alignment: C, children: [new D.TextRun({ text: t, ...run })], ...opt });
  const blank = (n = 1) => Array.from({ length: n }, () => new D.Paragraph({ children: [] }));
  const ano = String(new Date().getFullYear());

  const cover = [
    center((p.faculdade || 'INSTITUIÇÃO').toUpperCase(), {}, { bold: true }),
    center((p.curso || 'CURSO').toUpperCase(), {}, { bold: true }),
    ...blank(5),
    center(p.userName.toUpperCase(), {}, {}),
    ...blank(6),
    center(d.titulo.toUpperCase() + (d.subtitulo ? ':' : ''), {}, { bold: true }),
    ...(d.subtitulo ? [center(d.subtitulo, {}, {})] : []),
    ...blank(10),
    center(ano),
  ];
  const content = [];
  if (d.resumo) {
    content.push(center('RESUMO', { spacing: { after: 360 } }, { bold: true }));
    content.push(new D.Paragraph({ children: inlineRuns(d.resumo), alignment: J, spacing: { line: 240, after: 240 } }));
    if (d.palavras_chave?.length) content.push(new D.Paragraph({ alignment: J, children: [new D.TextRun({ text: 'Palavras-chave: ', bold: true }), new D.TextRun(d.palavras_chave.join('; ') + '.')] }));
    content.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }
  // sumário simples
  content.push(center('SUMÁRIO', { spacing: { after: 360 } }, { bold: true }));
  d.secoes.forEach((s, i) => content.push(new D.Paragraph({ children: [new D.TextRun({ text: `${i + 1}  ${s.titulo.toUpperCase()}`, bold: true })], spacing: { line: 360 } })));
  if (d.referencias?.length) content.push(new D.Paragraph({ children: [new D.TextRun({ text: 'REFERÊNCIAS', bold: true })], spacing: { line: 360 } }));
  content.push(new D.Paragraph({ children: [new D.PageBreak()] }));

  d.secoes.forEach((s, i) => {
    content.push(new D.Paragraph({ children: [new D.TextRun({ text: `${i + 1} ${s.titulo.toUpperCase()}`, bold: true })], spacing: { before: i ? 480 : 0, after: 360, line: 360 }, keepNext: true }));
    let sub = 0;
    String(s.conteudo || '').split(/\n\s*\n|\n(?=### |- )/).map(x => x.trim()).filter(Boolean).forEach(par => {
      if (par.startsWith('### ')) {
        sub++;
        const [head, ...rest] = par.split('\n');
        content.push(new D.Paragraph({ children: [new D.TextRun({ text: `${i + 1}.${sub} ${head.replace(/^###\s*/, '').replace(/\*\*/g, '')}`, bold: true })], spacing: { before: 240, after: 240, line: 360 }, keepNext: true }));
        if (rest.join(' ').trim()) content.push(body(rest.join(' ').trim()));
      } else if (/^[-•]\s/.test(par)) {
        par.split('\n').forEach(li => content.push(new D.Paragraph({ children: inlineRuns(li.replace(/^[-•]\s*/, '')), bullet: { level: 0 }, alignment: J, spacing: { line: 360 } })));
      } else content.push(body(par.replace(/\n/g, ' ')));
    });
  });
  if (d.referencias?.length) {
    content.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    content.push(center('REFERÊNCIAS', { spacing: { after: 360 } }, { bold: true }));
    d.referencias.forEach(r => content.push(new D.Paragraph({ children: inlineRuns(r), spacing: { line: 240, after: 240 } })));
  }
  const margin = { top: 1701, left: 1701, bottom: 1134, right: 1134 };
  const doc = new D.Document({
    creator: p.userName, title: d.titulo,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [
      { properties: { page: { margin } }, children: cover },
      {
        properties: { page: { margin } },
        headers: { default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], size: 20 })] })] }) },
        children: content,
      },
    ],
  });
  return await D.Packer.toBase64String(doc);
}

/* ---------- PowerPoint ---------- */
async function buildPptx(d) {
  const t = { ...DEFAULT_THEME, ...S.profile.theme };
  const A = t.a.replace('#', ''), B = t.b.replace('#', '');
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = d.titulo; pptx.author = S.profile.userName;
  const W = 13.33, H = 7.5, font = 'Calibri';
  // capa
  let s = pptx.addSlide(); s.background = { color: A };
  s.addShape(pptx.ShapeType.ellipse, { x: 9.6, y: -1.6, w: 5.5, h: 5.5, fill: { color: B, transparency: 55 }, line: { color: B, transparency: 100 } });
  s.addShape(pptx.ShapeType.ellipse, { x: -1.4, y: 5.2, w: 3.6, h: 3.6, fill: { color: 'FFFFFF', transparency: 85 }, line: { color: 'FFFFFF', transparency: 100 } });
  s.addText(d.titulo, { x: 0.8, y: 2.0, w: 10.5, h: 1.9, fontFace: font, fontSize: 40, bold: true, color: 'FFFFFF', valign: 'bottom', fit: 'shrink' });
  if (d.subtitulo) s.addText(d.subtitulo, { x: 0.8, y: 3.95, w: 10.5, h: 0.8, fontFace: font, fontSize: 20, color: 'FFFFFF' });
  s.addText([S.profile.userName, S.profile.curso, S.profile.faculdade].filter(Boolean).join('  ·  '), { x: 0.8, y: 6.2, w: 11, h: 0.5, fontFace: font, fontSize: 14, color: 'FFFFFF' });
  // conteúdo
  d.slides.forEach((sl, i) => {
    const x = pptx.addSlide(); x.background = { color: 'FFFFFF' };
    x.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: H, fill: { color: A }, line: { color: A } });
    x.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0, w: 0.08, h: H, fill: { color: B }, line: { color: B } });
    x.addText(sl.titulo, { x: 0.75, y: 0.4, w: W - 1.5, h: 1.0, fontFace: font, fontSize: 30, bold: true, color: A, fit: 'shrink' });
    x.addShape(pptx.ShapeType.line, { x: 0.78, y: 1.42, w: 1.4, h: 0, line: { color: B, width: 3 } });
    const hasD = !!sl.destaque;
    const items = (sl.topicos || []).map(tp => ({ text: tp, options: { bullet: { code: '25CF' }, paraSpaceAfter: 10 } }));
    x.addText(items.length ? items : [{ text: ' ' }], { x: 0.8, y: 1.7, w: hasD ? 7.6 : W - 1.6, h: H - 2.5, fontFace: font, fontSize: 20, color: '333333', valign: 'top', fit: 'shrink' });
    if (hasD) {
      x.addShape(pptx.ShapeType.roundRect, { x: 8.9, y: 2.0, w: 3.8, h: 3.4, fill: { color: A, transparency: 88 }, line: { color: A, width: 1.5 }, rectRadius: 0.2 });
      x.addText(sl.destaque, { x: 9.1, y: 2.15, w: 3.4, h: 3.1, fontFace: font, fontSize: 22, bold: true, color: A, align: 'center', valign: 'middle', fit: 'shrink' });
    }
    x.addText(String(i + 2), { x: W - 1.0, y: H - 0.6, w: 0.6, h: 0.4, fontFace: font, fontSize: 11, color: '999999', align: 'right' });
    if (sl.notas) x.addNotes(sl.notas);
  });
  if (d.referencias?.length) {
    const r = pptx.addSlide(); r.background = { color: 'FFFFFF' };
    r.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: H, fill: { color: A }, line: { color: A } });
    r.addText('Referências', { x: 0.75, y: 0.4, w: 11, h: 1.0, fontFace: font, fontSize: 30, bold: true, color: A });
    r.addText(d.referencias.map(t => ({ text: t, options: { paraSpaceAfter: 8 } })), { x: 0.8, y: 1.6, w: W - 1.6, h: H - 2.2, fontFace: font, fontSize: 13, color: '444444', valign: 'top', fit: 'shrink' });
  }
  return await pptx.write({ outputType: 'base64' });
}

/* ---------- salvar / compartilhar arquivos ---------- */
async function saveFile(name, base64, mime) {
  if (isNative() && window.Capacitor.Plugins.Filesystem) {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    const res = await Filesystem.writeFile({ path: name, data: base64, directory: 'CACHE' });
    try { await Filesystem.writeFile({ path: `Estude com Flor/${name}`, data: base64, directory: 'DOCUMENTS', recursive: true }); toast('Salvo em Documentos/Estude com Flor 📁', 3500); } catch { }
    if (Share) { try { await Share.share({ title: name, files: [res.uri], dialogTitle: 'Salvar ou enviar' }); } catch { } }
    return;
  }
  const bin = atob(base64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Arquivo baixado ✅');
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copiado ✅'); }
  catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copiado ✅'); }
}

/* ---------- ações das mensagens ---------- */
async function msgAction(m, act) {
  if (act === 'copy') return copyText(m.text);
  if (act === 'undo') { const t = m.text; m.text = m.original; m.original = t; updateMsg(m); saveChat(); return; }
  if (S.busy) return toast('Espere eu terminar 🙂');
  if (act === 'retry') {
    const idx = S.chat.messages.indexOf(m);
    const prevUser = [...S.chat.messages.slice(0, idx)].reverse().find(x => x.role === 'user');
    if (!prevUser) return;
    S.chat.messages.splice(idx, 1); $(`[data-id="${m.id}"]`)?.remove();
    return respond(m.artifact ? m.artifact.kind : prevUser.mode);
  }
  if (act === 'human') {
    if (!S.settings.apiKey) return openSettings('ia');
    const before = m.text; setBusy(true); m.status = 'Reescrevendo de forma mais humana…'; updateMsg(m);
    S.abort = new AbortController();
    try {
      const r = await callClaude({
        system: humanizeSystem(), signal: S.abort.signal, maxTokens: 8000,
        messages: [{ role: 'user', content: `Reescreva o texto a seguir seguindo suas instruções, mantendo a formatação markdown (títulos, listas, tabelas) e os links:\n\n${before}` }],
        onText: full => { m.text = full; updateMsgThrottled(m); },
      });
      if (r.text && r.text.length > before.length * 0.5) { m.original = before; m.text = r.text; } else m.text = before;
      if (!m.apiText) m.apiText = null;
    } catch (e) { m.text = before; if (e.name !== 'AbortError') toast(e.message, 4500); }
    finally { m.status = null; setBusy(false); S.abort = null; updateMsg(m); saveChat(); }
  }
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
function openSettings(tab = 'perfil') {
  const TABS = [['perfil', '👤 Perfil'], ['visual', '🎨 Aparência'], ['ia', '🤖 IA'], ['dados', '💾 Dados']];
  const p = S.profile;
  const draft = { profile: { ...p }, theme: { ...DEFAULT_THEME, ...p.theme }, settings: { ...S.settings } };
  const isKnown = v => MODELS.some(m => m[0] === v);
  const bodies = {
    perfil: () => profileFormHTML(draft.profile),
    visual: () => themeEditorHTML(draft.theme),
    ia: () => { const st = draft.settings; const saved = S.settings.apiKey; S.settings.apiKey = st.apiKey; const k = apiKeyFieldHTML(); S.settings.apiKey = saved; return `${k}
      <div class="field"><label>Modelo</label><select id="set_model">${MODELS.map(([v, l]) => `<option value="${v}" ${st.model === v ? 'selected' : ''}>${l}</option>`).join('')}<option value="__custom" ${isKnown(st.model) ? '' : 'selected'}>Outro (digitar)</option></select>
      <input type="text" id="set_model_custom" style="margin-top:8px" class="${isKnown(st.model) ? 'hidden' : ''}" value="${esc(st.model)}" placeholder="id do modelo"></div>
      <div class="switch"><div>Pesquisa na internet<small>Busca fontes atuais e lê os links que você enviar.</small></div><input type="checkbox" id="set_web" ${st.webSearch ? 'checked' : ''}></div>
      <div class="switch"><div>Humanizar trabalhos e slides<small>Depois de montar, reescreve o texto com uma escrita mais natural, de estudante.</small></div><input type="checkbox" id="set_hum" ${st.humanize ? 'checked' : ''}></div>`; },
    dados: () => `<p style="margin-top:0;color:var(--muted);line-height:1.5">Tudo fica salvo só neste aparelho. Faça um backup para levar seus chats para outro celular.</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn" id="d_export">⬆️ Exportar backup</button>
        <button class="btn" id="d_import">⬇️ Importar backup</button>
        <button class="btn danger" id="d_delprof">Excluir este perfil (${esc(p.userName)})</button>
      </div>`,
  };
  const collect = (t, m) => {
    if (t === 'perfil') { const f = readProfileForm(m); Object.assign(draft.profile, f); }
    if (t === 'ia') {
      const st = draft.settings;
      st.apiKey = $('#set_key', m).value.trim();
      const sel = $('#set_model', m).value;
      st.model = sel === '__custom' ? ($('#set_model_custom', m).value.trim() || 'claude-sonnet-5-5') : sel;
      st.webSearch = $('#set_web', m).checked; st.humanize = $('#set_hum', m).checked;
    }
  };
  const render = t => {
    const tabs = `<div class="tabs">${TABS.map(([k, l]) => `<button class="tab ${k === t ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>`;
    openModal({
      title: 'Configurações', tabs, body: bodies[t](), foot: `<button class="btn ghost" id="set_cancel">Cancelar</button><button class="btn primary" id="set_save">Salvar</button>`,
      onMount: m => {
        $$('[data-tab]', m).forEach(b => b.onclick = () => { collect(t, m); render(b.dataset.tab); });
        if (t === 'perfil') bindProfileForm(m);
        if (t === 'visual') bindThemeEditor(m, draft.theme, nt => draft.theme = nt);
        if (t === 'ia') $('#set_model', m).onchange = e => $('#set_model_custom', m).classList.toggle('hidden', e.target.value !== '__custom');
        if (t === 'dados') bindData(m);
        const cancel = () => { applyTheme(p.theme); closeModal(); };
        $('[data-close]', m).onclick = cancel; $('#set_cancel', m).onclick = cancel;
        $('#set_save', m).onclick = async () => {
          collect(t, m);
          if (!draft.profile.userName) return toast('O nome não pode ficar vazio');
          Object.assign(p, draft.profile, { theme: draft.theme });
          Object.assign(S.settings, draft.settings);
          await saveProfiles(); await saveSettings(); closeModal(); applyTheme(p.theme); showMain(); toast('Salvo ✅');
        };
      }
    });
  };
  render(tab);
}
function bindData(m) {
  $('#d_export', m).onclick = async () => {
    const chats = await DB.all('chats');
    const data = { app: 'estude-com-flor', version: 1, exportedAt: new Date().toISOString(), profiles: S.profiles, chats, settings: { ...S.settings, apiKey: '' } };
    const json = JSON.stringify(data);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    await saveFile(`backup-estude-com-flor-${new Date().toISOString().slice(0, 10)}.json`, b64, 'application/json');
  };
  $('#d_import', m).onclick = () => $('#fileImport').click();
  $('#d_delprof', m).onclick = async () => {
    if (S.profiles.length <= 1) return toast('Esse é o único perfil. Crie outro antes de excluir.');
    if (!(await confirmBox('Excluir perfil?', `O perfil de <b>${esc(S.profile.userName)}</b> e todos os chats dele serão apagados deste aparelho.`, 'Excluir'))) return;
    const id = S.profile.id;
    for (const c of (await DB.all('chats')).filter(c => c.profileId === id)) await DB.del('chats', c.id);
    S.profiles = S.profiles.filter(p => p.id !== id); await saveProfiles();
    await activateProfile(S.profiles[0].id);
  };
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'estude-com-flor') throw new Error('Esse arquivo não é um backup do Estude com Flor.');
    for (const p of data.profiles || []) if (!S.profiles.some(x => x.id === p.id)) S.profiles.push(p);
    for (const c of data.chats || []) await DB.put('chats', c);
    await saveProfiles(); closeModal(); toast('Backup importado ✅'); await activateProfile(S.profile ? S.profile.id : S.profiles[0].id);
  } catch (e) { toast('Erro: ' + e.message, 4500); }
}

/* =========================================================
   EVENTOS / INICIALIZAÇÃO
   ========================================================= */
function autoGrow() { const i = $('#input'); i.style.height = 'auto'; i.style.height = Math.min(160, i.scrollHeight) + 'px'; }
function bindEvents() {
  $('#btnMenu').innerHTML = IC.menu; $('#btnNew').innerHTML = IC.plus; $('#btnSettings').innerHTML = IC.gear; $('#btnAttach').innerHTML = IC.clip;
  $('#btnMenu').onclick = openDrawer; $('#drawerShade').onclick = closeDrawer;
  $('#btnNew').onclick = () => { if (S.busy) return toast('Espere eu terminar 🙂'); newChat(); };
  $('#btnSettings').onclick = () => openSettings();
  $('#btnSend').onclick = send;
  const input = $('#input');
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !isTouch()) { e.preventDefault(); send(); } });
  input.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])]; if (files.length) { e.preventDefault(); addFiles(files); }
  });
  const menu = $('#attachMenu');
  $('#btnAttach').onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };
  document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.classList.add('hidden'); });
  $$('button', menu).forEach(b => b.onclick = async () => {
    menu.classList.add('hidden');
    const act = b.dataset.act;
    if (act === 'camera') $('#fileCamera').click();
    if (act === 'images') $('#fileImages').click();
    if (act === 'files') $('#fileAny').click();
    if (act === 'link') {
      const url = await askText('Colar link', { placeholder: 'https://…', type: 'url', ok: 'Adicionar' });
      if (url) { input.value = (input.value ? input.value + '\n' : '') + url; autoGrow(); input.focus(); }
    }
  });
  ['fileCamera', 'fileImages', 'fileAny'].forEach(id => $('#' + id).onchange = e => { const f = [...e.target.files]; e.target.value = ''; addFiles(f); });
  $('#fileImport').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importBackup(f); };
  $('#modalShade').onclick = () => { const c = $('#modal [data-close]'); c ? c.click() : closeModal(); };
  // arrastar e soltar (computador)
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer?.files?.length && S.profile) addFiles([...e.dataTransfer.files]); });
  // botão voltar do Android
  if (isNative() && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      if (!$('#modal').classList.contains('hidden')) { const c = $('#modal [data-close]'); c ? c.click() : closeModal(); }
      else if ($('#drawer').classList.contains('open')) closeDrawer();
      else if (!$('#attachMenu').classList.contains('hidden')) $('#attachMenu').classList.add('hidden');
      else window.Capacitor.Plugins.App.minimizeApp();
    });
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => S.profile && applyTheme(S.profile.theme));
}

async function init() {
  bindEvents();
  try { await DB.open(); } catch (e) { document.body.innerHTML = '<p style="padding:20px">Não consegui abrir o armazenamento do aparelho.</p>'; return; }
  S.settings = { ...DEFAULT_SETTINGS, ...((await DB.get('kv', 'settings')) || {}) };
  S.profiles = (await DB.get('kv', 'profiles')) || [];
  if (!S.profiles.length) return showSetup();
  await activateProfile(S.settings.activeProfileId);
}
window.addEventListener('DOMContentLoaded', init);
