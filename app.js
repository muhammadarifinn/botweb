// ==CORE-START==
const T = { SHORT: 0, PARA: 1, CHOICE: 2, DROPDOWN: 3, CHECK: 4, SCALE: 5, GRID: 7, SECTION: 8, DATE: 9, TIME: 10, FILE: 13 };
const NAMA_TIPE = { 0: 'Isian singkat', 1: 'Paragraf', 2: 'Pilihan ganda', 3: 'Dropdown', 4: 'Kotak centang', 5: 'Skala', 7: 'Grid', 9: 'Tanggal', 10: 'Waktu', 13: 'Upload file' };

const rand = n => Math.floor(Math.random() * n);
const randInt = (a, b) => a + rand(b - a + 1);
const pick = arr => arr[rand(arr.length)];
const pad = n => String(n).padStart(2, '0');
function pickWeighted(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function sample(arr, k) {
  const c = arr.slice(), out = [];
  while (out.length < k && c.length) out.push(c.splice(rand(c.length), 1)[0]);
  return out;
}

const FIRST_M = ['Budi','Agus','Andi','Dedi','Eko','Fajar','Gilang','Hendra','Irfan','Joko','Rizky','Yoga','Bayu','Dimas','Rama','Tegar','Arif','Wahyu','Faisal','Ilham','Reza','Adi','Taufik','Galih'];
const FIRST_F = ['Siti','Rina','Dewi','Putri','Ayu','Intan','Maya','Sari','Fitri','Wulan','Ratna','Citra','Nadia','Aisyah','Dian','Rahma','Anisa','Tika','Lina','Yuni','Mega','Nanda','Cut Rina','Eka'];
const LAST = ['Santoso','Wijaya','Pratama','Saputra','Lestari','Hidayat','Kurniawan','Nugroho','Setiawan','Rahmawati','Permana','Utami','Firmansyah','Maulana','Ramadhan','Susanto','Wibowo','Puspita','Handayani','Siregar','Nasution','Harahap','Simanjuntak','Hakim','Gunawan','Prasetyo'];
const CITIES = ['Jakarta','Bandung','Surabaya','Medan','Semarang','Yogyakarta','Malang','Denpasar','Makassar','Palembang','Bogor','Depok','Bekasi','Tangerang','Pontianak','Balikpapan','Padang','Manado','Pekanbaru','Surakarta'];
const STREETS = ['Jl. Merdeka','Jl. Sudirman','Jl. Diponegoro','Jl. Melati','Jl. Kenanga','Jl. Mawar','Jl. Ahmad Yani','Jl. Gatot Subroto','Jl. Pahlawan','Jl. Veteran','Jl. Cendana','Jl. Anggrek'];
const PROVINCES = ['DKI Jakarta','Jawa Barat','Jawa Tengah','Jawa Timur','DI Yogyakarta','Banten','Sumatera Utara','Bali','Sulawesi Selatan','Kalimantan Timur'];
const JOBS = ['Mahasiswa','Karyawan swasta','Wiraswasta','Guru','Pelajar','Freelancer','PNS','Perawat','Desainer','Programmer'];
const PREFIX = ['0812','0813','0821','0822','0852','0857','0877','0878','0895','0896'];
const DOMAINS = ['gmail.com','yahoo.co.id','outlook.com','mail.com'];
const SENTENCES = ['Sudah sesuai dengan yang saya harapkan.','Prosesnya cukup mudah dan cepat.','Mohon dikonfirmasi lagi jika ada perubahan.','Tidak ada catatan tambahan.','Terima kasih atas informasinya.'];
const SHORTS = ['Baik','Setuju','Cukup','Tidak ada','Oke','Sangat membantu'];

function genName() { return pick(Math.random() < 0.5 ? FIRST_F : FIRST_M) + ' ' + pick(LAST); }
function genPhone() { let s = ''; const len = randInt(7, 8); for (let i = 0; i < len; i++) s += rand(10); return pick(PREFIX) + s; }
function slug(s) {
  const sep = pick(['.', '_', '']);
  return s.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).join(sep);
}
function genEmail(name) {
  const n = name || genName();
  return slug(n) + (Math.random() < 0.4 ? randInt(1, 99) : '') + '@' + pickWeighted(DOMAINS, [6, 2, 2, 1]);
}
function genDate(daysBack) {
  const d = new Date(Date.now() - rand((daysBack || 365) + 1) * 864e5);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function genAddress() { return pick(STREETS) + ' No. ' + randInt(1, 120) + ', ' + pick(CITIES); }
function genCompany() { return 'PT ' + pick(LAST) + ' ' + pick(['Abadi','Jaya','Mandiri','Sejahtera','Makmur','Teknologi']); }

/* ---------- Aturan jawaban (sama dengan aturan.json di skrip Python) ---------- */
function parseRules(text) {
  if (!text || !text.trim()) return {};
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error('Aturan bukan JSON yang valid: ' + e.message); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Aturan harus berupa satu objek JSON.');
  return o;
}
function findRule(title, rules) {
  const j = title.toLowerCase();
  let best, bestLen = -1;
  for (const k of Object.keys(rules)) {
    if (j.includes(k.toLowerCase()) && k.length > bestLen) { best = rules[k]; bestLen = k.length; }
  }
  return best; // kunci yang paling panjang (paling spesifik) menang
}
function pickByRule(rule, options) {
  if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
    if ('min' in rule && 'max' in rule) return String(randInt(+rule.min, +rule.max));
    const keys = Object.keys(rule);
    if (keys.length) return pickWeighted(keys, keys.map(k => +rule[k] || 0));
  }
  if (Array.isArray(rule) && rule.length) return String(pick(rule));
  return options.length ? pick(options) : '';
}

/* ---------- Membaca struktur Google Form ---------- */
function parseData(data) {
  const form = { title: '', pages: 1, questions: [], action: null };
  try { form.title = data[3] || (data[1] && data[1][8]) || ''; } catch (e) {}
  const items = (data[1] && data[1][1]) || [];
  for (const item of items) {
    const title = String(item[1] || '').trim();
    const type = item[3];
    if (type === T.SECTION) { form.pages++; continue; }
    if (!item[4]) continue;
    const entries = item[4].map(b => ({
      id: 'entry.' + b[0],
      options: (b[1] || []).map(o => o && o[0]).filter(x => x !== null && x !== undefined && x !== ''),
      required: !!b[2],
      row: (b[3] && b[3][0]) || null
    }));
    form.questions.push({ title, type, entries });
  }
  return form;
}
function parseSource(src) {
  const m = src.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!m) {
    if (/ServiceLogin|accounts\.google\.com\/(v3\/)?signin/.test(src)) throw new Error('Form ini meminta login Google. Hanya form publik yang bisa dibaca.');
    throw new Error('Struktur form tidak ditemukan. Pastikan Anda menyalin seluruh kode sumber (Ctrl+A lalu Ctrl+C) dari halaman form yang sudah terbuka.');
  }
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { throw new Error('Struktur form ditemukan tetapi tidak bisa dibaca. Salin ulang seluruh kode sumber, jangan sebagian.'); }
  const form = parseData(data);
  const a = src.match(/action="(https:\/\/docs\.google\.com\/forms\/[^"]*?\/formResponse)"/);
  form.action = a ? a[1] : null;
  return form;
}
function viewUrl(form) { return form.action ? form.action.replace(/\/formResponse.*$/, '/viewform') : 'LINK_FORM_ANDA'; }

/* ---------- Menebak isi dari judul pertanyaan ---------- */
function guessText(title, para, ctx) {
  const j = title.toLowerCase();
  if (/e-?mail|surel/.test(j)) return genEmail(ctx.name);
  if (/\bhp\b|telepon|telpon|phone|whatsapp|\bwa\b|no\.? ?tlp|kontak|nomor ponsel|nomer|nomor (hp|telepon|wa)/.test(j)) return genPhone();
  if (/instansi|perusahaan|kampus|universitas|sekolah|company|organisasi|institusi/.test(j)) return genCompany();
  if (/nama|name/.test(j)) { const n = genName(); if (!ctx.name) ctx.name = n; return n; }
  if (/alamat|address/.test(j)) return genAddress();
  if (/kota|city|kabupaten/.test(j)) return pick(CITIES);
  if (/provinsi|province/.test(j)) return pick(PROVINCES);
  if (/kode ?pos|zip/.test(j)) return String(randInt(10000, 99999));
  if (/umur|usia|\bage\b/.test(j)) return String(randInt(17, 30));
  if (/jumlah|qty|banyak|how many|number of|quantity|\bcount\b|berapa/.test(j)) return String(randInt(1, 5));
  if (/alergi|allerg|pantangan|dietary|restrict/.test(j)) return pickWeighted(['Tidak ada', 'Kacang', 'Seafood', 'Susu'], [6, 1, 1, 1]);
  if (/\bnik\b|ktp/.test(j)) { let s = ''; for (let i = 0; i < 16; i++) s += rand(10); return s; }
  if (/\bnim\b|\bnpm\b/.test(j)) { let s = ''; for (let i = 0; i < 10; i++) s += rand(10); return s; }
  if (/pekerjaan|profesi|\bjob\b/.test(j)) return pick(JOBS);
  if (/link|url|website/.test(j)) return 'https://contoh.id/' + slug(genName());
  return para ? pick(SENTENCES) : pick(SHORTS);
}

function answerFor(q, rules, ctx) {
  const rule = findRule(q.title, rules);
  const out = [];
  for (const e of q.entries) {
    const col = q.type === T.GRID && e.row ? q.title + ' [' + e.row + ']' : q.title;
    let v;
    switch (q.type) {
      case T.SHORT: case T.PARA:
        v = rule !== undefined ? pickByRule(rule, []) : guessText(q.title, q.type === T.PARA, ctx); break;
      case T.CHOICE: case T.DROPDOWN: case T.SCALE: case T.GRID:
        v = pickByRule(rule, e.options); break;
      case T.CHECK: {
        const pool = Array.isArray(rule) && rule.length ? rule.map(String) : e.options;
        v = sample(pool, randInt(1, Math.max(1, Math.min(3, pool.length)))).join(', '); break;
      }
      case T.DATE: v = genDate(365); break;
      case T.TIME: v = pad(rand(24)) + ':' + pad(pick([0, 15, 30, 45])); break;
      default: continue;
    }
    out.push({ col, val: v });
  }
  return out;
}
function buildFormRows(form, n, rules) {
  const rows = []; let headers = [];
  for (let i = 0; i < n; i++) {
    const ctx = {}; const cells = [];
    for (const q of form.questions) cells.push(...answerFor(q, rules, ctx));
    if (i === 0) headers = cells.map(c => c.col);
    rows.push(cells.map(c => c.val));
  }
  return { headers, rows };
}

function toCSV(headers, rows) {
  const q = s => { s = String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [headers, ...rows].map(r => r.map(q).join(',')).join('\n');
}

/* ---------- Dataset dummy: kolom buatan sendiri ---------- */
const COLTYPES = {
  nama: { label: 'Nama', hint: '' },
  hp: { label: 'Nomor HP', hint: '' },
  email: { label: 'Email', hint: '' },
  alamat: { label: 'Alamat', hint: '' },
  kota: { label: 'Kota', hint: '' },
  angka: { label: 'Angka (rentang)', hint: 'Rentang, mis. 17-25' },
  pilihan: { label: 'Pilihan (berbobot)', hint: 'Pisahkan koma, bobot opsional: Pendek:65, Panjang:35' },
  tanggal: { label: 'Tanggal', hint: 'Mundur berapa hari (default 365)' },
  urut: { label: 'Nomor urut', hint: '' },
  teks: { label: 'Kalimat bebas', hint: '' }
};
function compileCol(spec) {
  const name = spec.label || COLTYPES[spec.type].label;
  const p = (spec.param || '').trim();
  const fail = msg => { throw new Error('Kolom "' + name + '": ' + msg); };
  switch (spec.type) {
    case 'angka': {
      const m = p.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (!m) fail('isi rentang seperti 17-25.');
      const a = +m[1], b = +m[2];
      return { name, gen: () => String(randInt(Math.min(a, b), Math.max(a, b))) };
    }
    case 'pilihan': {
      const items = p.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const m = s.match(/^(.*?)(?::\s*(\d+(?:\.\d+)?))?$/);
        return { label: m[1].trim(), w: m[2] ? +m[2] : 1 };
      }).filter(x => x.label);
      if (!items.length) fail('isi minimal satu pilihan, pisahkan dengan koma.');
      return { name, gen: () => pickWeighted(items.map(x => x.label), items.map(x => x.w)) };
    }
    case 'tanggal': { const d = p ? Math.max(1, parseInt(p, 10) || 365) : 365; return { name, gen: () => genDate(d) }; }
    case 'nama': return { name, gen: (ctx) => ctx.name || (ctx.name = genName()) };
    case 'hp': return { name, gen: () => genPhone() };
    case 'email': return { name, gen: (ctx) => genEmail(ctx.name || (ctx.name = genName())) };
    case 'alamat': return { name, gen: () => genAddress() };
    case 'kota': return { name, gen: () => pick(CITIES) };
    case 'urut': return { name, gen: (ctx, i) => String(i + 1) };
    case 'teks': return { name, gen: () => pick(SENTENCES) };
  }
  fail('tipe tidak dikenal.');
}
function buildDataset(specs, n) {
  if (!specs.length) throw new Error('Tambahkan minimal satu kolom.');
  const cols = specs.map(compileCol);
  const rows = [];
  for (let i = 0; i < n; i++) { const ctx = {}; rows.push(cols.map(c => c.gen(ctx, i))); }
  return { headers: cols.map(c => c.name), rows };
}
const PRESET_KAOS = [
  { label: 'Nama', type: 'nama', param: '' },
  { label: 'Nomor HP', type: 'hp', param: '' },
  { label: 'Sleeve', type: 'pilihan', param: 'Pendek:65, Panjang:35' },
  { label: 'Ukuran', type: 'pilihan', param: 'S:15, M:35, L:35, XL:15' },
  { label: 'Jumlah', type: 'angka', param: '1-3' },
  { label: 'Tanggal pesan', type: 'tanggal', param: '60' }
];

/* Contoh form tiruan (struktur sama dengan data internal Google Form) */
const opt = l => [l, null, null, null, 0];
const SAMPLE_DATA = [null, [null, [
  [1, 'What is your name?', null, 0, [[559352220, null, 0]]],
  [2, 'Can you attend?', null, 2, [[877086558, [opt("Yes, I'll be there"), opt("Sorry, can't make it")], 1]]],
  [3, 'How many of you are attending?', null, 0, [[924523986, null, 0]]],
  [4, 'What will you be bringing?', null, 4, [[186230675, [opt('Mains'), opt('Salad'), opt('Dessert'), opt('Drinks'), opt('Sides/Appetizers')], 0]]],
  [5, 'Do you have any allergies or dietary restrictions?', null, 0, [[1751303409, null, 0]]],
  [6, 'What is your email address?', null, 0, [[2043151190, null, 0]]]
], null, null, null, null, null, 0, 'Party Invite'], '/forms/d/e/ID_FORM_CONTOH/viewform', 'Party Invite'];
// ==CORE-END==

/* ================== UI ================== */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) { if (c == null) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
const $ = id => document.getElementById(id);

function flash(el, text) {
  el.textContent = text;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; }, 2200);
}
async function salin(textarea, msgEl, doneText) {
  try { await navigator.clipboard.writeText(textarea.value); flash(msgEl, doneText || 'Tersalin'); }
  catch (e) { textarea.focus(); textarea.select(); flash(msgEl, 'Teks sudah dipilih. Tekan Ctrl+C untuk menyalin.'); }
}
function showErr(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }

/* Output bersama: tabel pratinjau + CSV */
function renderOutput(root, headers, rows, opts) {
  root.replaceChildren();
  const preview = rows.slice(0, 8);
  const csv = toCSV(headers, rows);
  const ta = h('textarea', { class: 'out', rows: '6', readonly: '', spellcheck: 'false', 'aria-label': 'Hasil CSV' });
  ta.value = csv;
  const msg = h('span', { class: 'msg mt-0', role: 'status' });
  root.append(
    h('div', { class: 'out-bar' },
      h('span', { class: 'meta', text: rows.length + ' BARIS · ' + headers.length + ' KOLOM · PRATINJAU ' + preview.length + ' BARIS PERTAMA' }),
      msg,
      h('button', { class: 'btn small', type: 'button', onclick: () => salin(ta, msg, 'CSV tersalin') }, 'Salin CSV')
    ),
    h('div', { class: 'tbl-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, headers.map(x => h('th', { text: x })))),
      h('tbody', {}, preview.map(r => h('tr', {}, r.map(c => h('td', { text: c })))))
    )),
    h('p', { class: 'msg opts', text: 'Nomor HP diawali 0. Saat membuka CSV di Excel, impor kolom itu sebagai teks agar angka 0 di depan tidak hilang.' }),
    h('label', { class: 'csv-label', for: 'csv-' + root.id }, 'Hasil CSV (siap disalin)'),
    (ta.id = 'csv-' + root.id, ta)
  );
}

/* ---------- Router ---------- */
const VIEWS = ['beranda', 'bot-form', 'dataset'];
function route() {
  const id = (location.hash || '').slice(1);
  const v = VIEWS.includes(id) ? id : 'beranda';
  for (const x of VIEWS) $('view-' + x).hidden = x !== v;
  document.querySelectorAll('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === v ? 'page' : 'false'));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- Bot Google Form ---------- */
let currentForm = null, isSample = true;

function showForm(form, sample) {
  currentForm = form; isSample = sample;
  $('formTitle').textContent = form.title || '(Form tanpa judul)';
  const n = form.questions.length;
  $('formMeta').textContent = n + ' pertanyaan · ' + form.pages + ' halaman';
  $('sampleNote').hidden = !sample;

  const warn = $('formWarn'); warn.replaceChildren();
  for (const q of form.questions) {
    if (q.type !== T.FILE) continue;
    const req = q.entries.some(e => e.required);
    warn.append(h('div', { class: 'note', text: req
      ? 'Pertanyaan upload "' + q.title + '" wajib diisi dan tidak bisa diisi bot. Buat salinan form tanpa upload, atau jadikan tidak wajib.'
      : 'Pertanyaan upload "' + q.title + '" akan dilewati.' }));
  }
  if (form.pages > 1) warn.append(h('div', { class: 'note', text: 'Form ini punya beberapa halaman. Percabangan logika tidak diikuti; semua pertanyaan diisi.' }));

  const body = $('qBody'); body.replaceChildren();
  form.questions.forEach((q, i) => {
    const opts = q.entries[0].options;
    const req = q.entries.some(e => e.required);
    body.append(h('tr', {},
      h('td', { class: 'num', text: String(i + 1) }),
      h('td', {}, h('span', { class: 'pill', text: NAMA_TIPE[q.type] || 'Tipe ' + q.type })),
      h('td', {}, req ? h('span', { class: 'pill req', text: 'wajib' }) : '–'),
      h('td', { text: q.title }),
      h('td', { class: 'opts', text: opts.length ? opts.slice(0, 6).join(', ') + (opts.length > 6 ? ', …' : '') : '' })
    ));
  });
  generateBot();
}

function generateBot() {
  if (!currentForm) return;
  showErr($('genErr'), '');
  let rules;
  try { rules = parseRules($('rulesBot').value); } catch (e) { showErr($('genErr'), e.message); return; }
  const n = Math.min(2000, Math.max(1, parseInt($('nBot').value, 10) || 1));
  const { headers, rows } = buildFormRows(currentForm, n, rules);
  if (!headers.length) { showErr($('genErr'), 'Form ini tidak punya pertanyaan yang bisa diisi.'); $('outBot').replaceChildren(); return; }
  renderOutput($('outBot'), headers, rows);

  const hasRules = Object.keys(rules).length > 0;
  $('cmdBox').value = 'python bot_form_universal.py "' + viewUrl(currentForm) + '" -n ' + n + ' --kirim --debug' + (hasRules ? ' --aturan aturan.json' : '');
  const hint = $('cmdHint');
  hint.hidden = !hasRules;
  hint.textContent = hasRules ? 'Simpan isi kotak "Atur jawaban sendiri" sebagai file aturan.json di folder yang sama dengan skrip.' : '';
}

$('btnRead').addEventListener('click', () => {
  showErr($('readErr'), '');
  const src = $('src').value;
  if (!src.trim()) { showErr($('readErr'), 'Tempel kode sumber form dulu.'); return; }
  try { showForm(parseSource(src), false); }
  catch (e) { showErr($('readErr'), e.message); }
});
$('btnGen').addEventListener('click', generateBot);
$('btnCmd').addEventListener('click', () => salin($('cmdBox'), $('cmdMsg'), 'Perintah tersalin'));

/* ---------- Dataset dummy ---------- */
let colSpecs = PRESET_KAOS.map(c => ({ ...c }));

function renderCols() {
  const list = $('colList'); list.replaceChildren();
  colSpecs.forEach((spec, i) => {
    const typeSel = h('select', { 'aria-label': 'Tipe kolom ' + (i + 1) },
      Object.entries(COLTYPES).map(([k, v]) => h('option', { value: k, ...(k === spec.type ? { selected: '' } : {}) }, v.label)));
    const label = h('input', { type: 'text', value: spec.label, 'aria-label': 'Nama kolom ' + (i + 1), placeholder: 'Nama kolom' });
    const param = h('input', { type: 'text', value: spec.param, 'aria-label': 'Pengaturan kolom ' + (i + 1) });
    const setParam = () => {
      const hint = COLTYPES[spec.type].hint;
      param.disabled = !hint; param.placeholder = hint || 'Tidak perlu diatur';
      if (!hint) { param.value = ''; spec.param = ''; }
    };
    setParam();
    label.addEventListener('input', () => { spec.label = label.value; });
    param.addEventListener('input', () => { spec.param = param.value; });
    typeSel.addEventListener('change', () => { spec.type = typeSel.value; setParam(); });
    list.append(h('div', { class: 'col-row' },
      h('div', { class: 'l' }, label), h('div', { class: 't' }, typeSel), h('div', { class: 'p' }, param),
      h('button', { class: 'btn small x', type: 'button', 'aria-label': 'Hapus kolom ' + (i + 1), onclick: () => { colSpecs.splice(i, 1); renderCols(); } }, 'Hapus')
    ));
  });
}
function generateSet() {
  showErr($('setErr'), '');
  const n = Math.min(5000, Math.max(1, parseInt($('nSet').value, 10) || 1));
  try {
    const { headers, rows } = buildDataset(colSpecs, n);
    renderOutput($('outSet'), headers, rows);
  } catch (e) { showErr($('setErr'), e.message); }
}
$('btnAddCol').addEventListener('click', () => { colSpecs.push({ label: 'Kolom ' + (colSpecs.length + 1), type: 'nama', param: '' }); renderCols(); });
$('btnPreset').addEventListener('click', () => { colSpecs = PRESET_KAOS.map(c => ({ ...c })); renderCols(); generateSet(); });
$('btnSet').addEventListener('click', generateSet);

/* ---------- Mulai ---------- */
route();
showForm(parseData(SAMPLE_DATA), true);
renderCols();
generateSet();
