// ─── Constants ────────────────────────────────────────────────
const QUARTERS = ['1-четверть', '2-четверть', '3-четверть', '4-четверть'];
const PAL = [
  '#f5d020','#3b82f6','#818cf8','#34d399','#fb923c',
  '#38bdf8','#a78bfa','#fbbf24','#60a5fa','#4ade80','#f472b6','#94a3b8'
];

const AWARD_COLS = [
  { key:'school', label:'Школьная грамота',        cls:'aw-school', col:6  },
  { key:'umc',    label:'УМЦ',                      cls:'aw-umc',    col:7  },
  { key:'daryn',  label:'РНПЦ Дарын',               cls:'aw-daryn',  col:8  },
  { key:'sardar', label:'Сарыарқа дарыны',          cls:'aw-sar',    col:9  },
  { key:'obl_q',  label:'Алғыс хаты ГОРОНО',       cls:'aw-oblq',   col:10 },
  { key:'obl_g',  label:'Почетная грамота управления образования',  cls:'aw-oblg',   col:11 },
  { key:'min_q',  label:'Алғыс хаты Министерства', cls:'aw-minq',   col:12 },
  { key:'min_g',  label:'Почётная грамота МОН',     cls:'aw-ming',   col:13 },
  { key:'znak1',  label:'Нагр. знак Алтынсарин',    cls:'aw-znak1',  col:14 },
  { key:'znak2',  label:'Нагр. знак Білім беру',    cls:'aw-znak2',  col:15 },
  { key:'other',  label:'Другие',                   cls:'aw-other',  col:16 },
];

// ─── State ────────────────────────────────────────────────────
const S = {
  gr: { files: [], parsed: [], charts: [] },
  aw: { file: null, teachers: [], charts: [] },
  rt: { teacherFile: null, studentFile: null, teachers: [], students: [], charts: [] },
  rs: { teacherFile: null, studentFile: null, teachers: [], students: [], charts: [] },
  history: { gr: [], aw: [] }
};
const multi_ = { gr: true, aw: false, rt: false, rs: false };

// ─── Storage Keys ────────────────────────────────────────────────
const STORAGE_KEY_GR = 'school_analytics_grades_history';
const STORAGE_KEY_AW = 'school_analytics_awards_history';
const STORAGE_KEY_AW_DATA = 'school_analytics_awards_data';

// ═══════════════════════════════════════════════════════
//  STORAGE & HISTORY MANAGEMENT
// ═══════════════════════════════════════════════════════
function saveAwardsToStorage(teachers) {
  try {
    // Validate and clean teacher data
    const cleanedTeachers = teachers.map(t => ({
      num: t.num,
      name: String(t.name || '').trim(),
      stazh: Number(t.stazh) || 0,
      stazh_org: Number(t.stazh_org) || 0,
      awards: t.awards || {},
      totalTypes: Number(t.totalTypes) || 0,
      totalCount: Number(t.totalCount) || 0,
      level: String(t.level || 'none')
    }));
    localStorage.setItem(STORAGE_KEY_AW_DATA, JSON.stringify({
      data: cleanedTeachers,
      timestamp: new Date().toISOString(),
      version: 1
    }));
    return true;
  } catch (e) {
    console.error('Error saving to storage:', e);
    return false;
  }
}

function loadAwardsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_AW_DATA);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate data structure
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    return null;
  } catch (e) {
    console.error('Error loading from storage:', e);
    return null;
  }
}

function saveToHistory(ns, entry) {
  try {
    const key = ns === 'gr' ? STORAGE_KEY_GR : STORAGE_KEY_AW;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });
    // Keep last 10 entries
    if (history.length > 10) history.pop();
    localStorage.setItem(key, JSON.stringify(history));
    S.history[ns] = history;
    return history;
  } catch (e) {
    console.error('Error saving history:', e);
    return [];
  }
}

function loadHistoryFromStorage() {
  try {
    S.history.gr = JSON.parse(localStorage.getItem(STORAGE_KEY_GR) || '[]');
    S.history.aw = JSON.parse(localStorage.getItem(STORAGE_KEY_AW) || '[]');
  } catch (e) {
    console.error('Error loading history:', e);
    S.history.gr = [];
    S.history.aw = [];
  }
}

function clearStorage(ns) {
  try {
    if (ns === 'all') {
      localStorage.removeItem(STORAGE_KEY_GR);
      localStorage.removeItem(STORAGE_KEY_AW);
      localStorage.removeItem(STORAGE_KEY_AW_DATA);
      S.history.gr = [];
      S.history.aw = [];
      renderHistoryPanel('all');
    } else {
      const key = ns === 'gr' ? STORAGE_KEY_GR : STORAGE_KEY_AW;
      localStorage.removeItem(key);
      S.history[ns] = [];
      renderHistoryPanel(ns);
    }
  } catch (e) {
    console.error('Error clearing storage:', e);
  }
}

function renderHistoryPanel(ns = 'all') {
  if (ns === 'all' || ns === 'gr') {
    const grHist = document.getElementById('gr-history');
    if (grHist) {
      if (S.history.gr.length === 0) {
        grHist.innerHTML = '<div class="hist-empty">История пуста. Загрузите файлы и нажмите "Анализировать"</div>';
      } else {
        grHist.innerHTML = `<div class="hist-list">
          ${S.history.gr.map((h, i) => `
            <div class="hist-item" onclick="loadHistoryEntry('gr', ${i})">
              <div class="hist-date">${new Date(h.timestamp).toLocaleString('ru-RU')}</div>
              <div class="hist-files">📚 ${h.files.length} файл(ов)</div>
            </div>`).join('')}
        </div>
        <button class="btn-small" onclick="clearStorage('gr')" style="margin-top:12px;width:100%;background:#f85149">Очистить историю</button>`;
      }
    }
  }
  
  if (ns === 'all' || ns === 'aw') {
    const awHist = document.getElementById('aw-history');
    if (awHist) {
      if (S.history.aw.length === 0) {
        awHist.innerHTML = '<div class="hist-empty">История пуста. Загрузите файл с наградами и нажмите "Построить аналитику"</div>';
      } else {
        awHist.innerHTML = `<div class="hist-list">
          ${S.history.aw.map((h, i) => `
            <div class="hist-item" onclick="loadHistoryEntry('aw', ${i})">
              <div class="hist-date">${new Date(h.timestamp).toLocaleString('ru-RU')}</div>
              <div class="hist-files">🏅 ${h.fileName}</div>
              <div class="hist-teachers">${h.teacherCount} педагогов</div>
            </div>`).join('')}
        </div>
        <button class="btn-small" onclick="clearStorage('aw')" style="margin-top:12px;width:100%;background:#f85149">Очистить историю</button>`;
      }
    }
  }
}

function loadHistoryEntry(ns, idx) {
  const history = S.history[ns];
  if (!history[idx]) return;
  
  const entry = history[idx];
  if (ns === 'gr') {
    S.gr.parsed = entry.parsed || [];
    if (S.gr.parsed.length > 0) {
      destroyCharts('gr');
      grOverview(); grSubjects(); grDynamics(); grProblems(); grCompare();
      renderHistoryPanel('gr');
      document.getElementById('gr-results').style.display = 'block';
      document.getElementById('gr-results').scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    S.aw.teachers = entry.teachers || [];
    if (S.aw.teachers.length > 0) {
      destroyCharts('aw');
      awOverview(); awStats(); awStazh(); awTop();
      renderHistoryPanel('aw');
      document.getElementById('aw-results').style.display = 'block';
      document.getElementById('aw-main').style.display = 'block';
      document.getElementById('aw-drill').style.display = 'none';
      document.getElementById('aw-results').scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// ═══════════════════════════════════════════════════════
//  NAV
// ═══════════════════════════════════════════════════════
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.ntab').forEach(b => b.classList.remove('on'));
  document.getElementById('page-' + id).classList.add('on');
  btn.classList.add('on');
}

function iswitch(ns, pane, btn) {
  const root = ns === 'gr' ? 'gr-results' : ns === 'aw' ? 'aw-main' : ns === 'rt' ? 'rt-results' : '';
  document.querySelectorAll(`#${root} .ipane`).forEach(p => p.classList.remove('on'));
  document.querySelectorAll(`#${root} .itab`).forEach(b => b.classList.remove('on'));
  document.getElementById(`${ns}-${pane}`).classList.add('on');
  btn.classList.add('on');
}

// ═══════════════════════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════════════════════
function setupDrop(ns) {
  const drop = document.getElementById(`${ns}-drop`);
  const inp  = document.getElementById(`${ns}-input`);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles(ns, [...e.dataTransfer.files]); });
  inp.addEventListener('change', () => addFiles(ns, [...inp.files]));
}

function addFiles(ns, files) {
  files.forEach(f => {
    if (!multi_[ns] && S[ns].file && S[ns].file.name === f.name) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (ns === 'aw' || ns === 'rt' || ns === 'rs') {
        S[ns].file = { name: f.name, data: e.target.result };
      } else {
        S[ns].files.push({ name: f.name, data: e.target.result });
      }
      renderPills(ns);
      document.getElementById(`${ns}-btn`).disabled = false;
    };
    reader.readAsArrayBuffer(f);
  });
}

function removeFile(ns, name) {
  if (ns === 'aw' || ns === 'rt' || ns === 'rs') {
    S[ns].file = null;
    document.getElementById(`${ns}-btn`).disabled = true;
  } else {
    S[ns].files = S[ns].files.filter(f => f.name !== name);
    document.getElementById(`${ns}-btn`).disabled = S[ns].files.length === 0;
  }
  renderPills(ns);
}

function renderPills(ns) {
  const files = (ns === 'aw' || ns === 'rt' || ns === 'rs') ? (S[ns].file ? [S[ns].file] : []) : S[ns].files;
  document.getElementById(`${ns}-pills`).innerHTML = files.map(f =>
    `<div class="pill"><span>📄 ${f.name}</span><span class="x" onclick="removeFile('${ns}','${f.name.replace(/'/g, "\\'")}')">×</span></div>`
  ).join('');
}

// ═══════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════
function qc(q)    { return q < 50 ? 'var(--red)' : q < 70 ? 'var(--yel)' : 'var(--blu)'; }
function badge(q) {
  if (q < 50) return '<span class="badge b-bad">Проблема</span>';
  if (q < 70) return '<span class="badge b-warn">Внимание</span>';
  return '<span class="badge b-ok">Норма</span>';
}
function card(lbl, val, cls, sub = '') {
  return `<div class="card"><div class="lbl">${lbl}</div><div class="val ${cls}">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
function mkChart(id, cfg, ns) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = new Chart(el, cfg);
  S[ns].charts.push(c);
  return c;
}
function destroyCharts(ns) {
  S[ns].charts.forEach(c => { try { c.destroy(); } catch (e) {} });
  S[ns].charts = [];
}
function hasValue(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'nan' && s !== 'жоқ' && s !== 'жок' && s !== 'жоқ.' && s !== '-' && s !== 'нет';
}
function countYears(v) {
  if (!hasValue(v)) return 0;
  const s = String(v).replace(/[^\d,. \/]/g, '');
  const years = s.split(/[,. \/]+/).map(y => parseInt(y)).filter(y => y > 2000 && y < 2100);
  return years.length || 1;
}
function annualOrLast(st, s) {
  return st[s]?.['Годовая оценка'] || st[s]?.[QUARTERS[2]] || st[s]?.[QUARTERS[1]] || st[s]?.[QUARTERS[0]];
}

// ═══════════════════════════════════════════════════════
//  GRADES — parse & calculate
// ═══════════════════════════════════════════════════════
function parseGradeFile(name, buffer) {
  const wb  = XLSX.read(buffer, { type: 'array' });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (!raw.length) return null;

  const headers = raw[0].map(h => h ? String(h).trim() : '');
  const PIDX = headers.findIndex(h => h.includes('Период') || h.includes('Наименование'));
  const NIDX = headers.findIndex(h => h.includes('Фамилия') || h.includes('имя'));
  if (PIDX < 0 || NIDX < 0) return null;

  const subjects = headers.slice(PIDX + 1).filter(h => h.length > 0);
  const rows = [];
  let cur = null;

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (r[0] != null && r[NIDX]) cur = String(r[NIDX]).trim();
    const period = r[PIDX] ? String(r[PIDX]).trim() : null;
    if (!period || !cur) continue;
    const row = { student: cur, quarter: period };
    subjects.forEach((s, si) => {
      const v = r[PIDX + 1 + si];
      row[s] = (v !== null && v !== undefined && v !== '') ? +v : NaN;
    });
    rows.push(row);
  }
  return { name: name.replace(/\.(xls|xlsx)$/i, '').replace(/_/g, ' ').trim(), rows, subjects };
}

function calcGradeStats(rows, subjects) {
  const st = {};
  subjects.forEach(s => {
    st[s] = {};
    [...QUARTERS, 'Годовая оценка'].forEach(q => {
      const vals = rows.filter(r => r.quarter === q && !isNaN(r[s])).map(r => r[s]);
      if (!vals.length) return;
      const mean    = vals.reduce((a, b) => a + b, 0) / vals.length;
      const quality = vals.filter(v => v >= 4).length / vals.length * 100;
      const dist    = { 2: 0, 3: 0, 4: 0, 5: 0 };
      vals.forEach(v => { if (dist[v] !== undefined) dist[v]++; });
      st[s][q] = { mean, quality, n: vals.length, dist, vals };
    });
  });
  return st;
}

// ═══════════════════════════════════════════════════════
//  GRADES — render
// ═══════════════════════════════════════════════════════
function runGrades() {
  S.gr.parsed = S.gr.files.map(f => parseGradeFile(f.name, f.data)).filter(Boolean);
  S.gr.parsed.forEach(p => { p.stats = calcGradeStats(p.rows, p.subjects); });
  destroyCharts('gr');
  grOverview(); grSubjects(); grDynamics(); grProblems(); grCompare();
  
  // Save to history
  saveToHistory('gr', {
    files: S.gr.files.map(f => ({ name: f.name })),
    parsed: S.gr.parsed
  });
  
  renderHistoryPanel('gr');
  
  document.getElementById('gr-results').style.display = 'block';
  document.getElementById('gr-results').scrollIntoView({ behavior: 'smooth' });
}

function grOverview() {
  const C = S.gr.parsed;
  const allS = [...new Set(C.flatMap(c => c.subjects))];
  let students = 0, qS = 0, qC = 0, mS = 0, mC = 0, probs = 0, warns = 0;
  C.forEach(cls => {
    students += new Set(cls.rows.map(r => r.student)).size;
    allS.forEach(s => {
      const d = annualOrLast(cls.stats, s);
      if (!d) return;
      qS += d.quality; qC++; mS += d.mean; mC++;
      if (d.quality < 50) probs++; else if (d.quality < 70) warns++;
    });
  });
  const aq = qC ? qS / qC : 0, am = mC ? mS / mC : 0;
  const el = document.getElementById('gr-overview');
  el.innerHTML = `
    <div class="cards">
      ${card('Классов', C.length, '')}
      ${card('Учеников', students, '')}
      ${card('Средний балл', am.toFixed(2), am >= 4 ? 'g' : am >= 3.5 ? 'y' : 'r')}
      ${card('% качества', aq.toFixed(1) + '%', aq >= 70 ? 'g' : aq >= 50 ? 'y' : 'r')}
      ${card('Проблем', '<span class="r">' + probs + '</span>', '', '&lt;50%')}
      ${card('Внимание', '<span class="y">' + warns + '</span>', '', '50–70%')}
    </div>
    <div class="cgrid">
      <div class="ccrd"><h3>% качества по классам</h3><canvas id="c_gr_q"></canvas></div>
      <div class="ccrd"><h3>Распределение оценок</h3><canvas id="c_gr_d"></canvas></div>
    </div>`;

  const clsQ = C.map(cls => {
    const vs = allS.map(s => annualOrLast(cls.stats, s)?.quality).filter(v => v !== undefined);
    return vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : 0;
  });
  mkChart('c_gr_q', {
    type: 'bar',
    data: { labels: C.map(c => c.name), datasets: [{ data: clsQ, backgroundColor: clsQ.map(v => v < 50 ? '#f85149' : v < 70 ? '#f5d020' : '#3b82f6'), borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { max: 100, ticks: { color: '#7a90b0', callback: v => v + '%' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#e2eaf8' }, grid: { display: false } } } }
  }, 'gr');

  const dist = { 2: 0, 3: 0, 4: 0, 5: 0 };
  C.forEach(cls => cls.rows.filter(r => QUARTERS.includes(r.quarter)).forEach(r =>
    cls.subjects.forEach(s => { const v = r[s]; if (!isNaN(v) && dist[v] !== undefined) dist[v]++; })
  ));
  const tot = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  mkChart('c_gr_d', {
    type: 'doughnut',
    data: { labels: ['2', '3', '4', '5'], datasets: [{ data: [2,3,4,5].map(g => (dist[g] / tot * 100).toFixed(1)), backgroundColor: ['#f85149','#f5d020','#3b82f6','#34d399'], borderColor: '#080c14', borderWidth: 3 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#e2eaf8', padding: 14 } } } }
  }, 'gr');
}

function grSubjects() {
  const C = S.gr.parsed;
  const allS = [...new Set(C.flatMap(c => c.subjects))];
  let rows = '';
  allS.forEach(s => {
    let qS = 0, mS = 0, cnt = 0;
    const ns = [];
    C.forEach(cls => {
      const d = annualOrLast(cls.stats, s);
      if (!d) return;
      qS += d.quality; mS += d.mean; cnt++; ns.push(cls.name);
    });
    if (!cnt) return;
    const q = qS / cnt, m = mS / cnt, bc = qc(q);
    rows += `<tr>
      <td><strong>${s}</strong></td>
      <td style="color:var(--mut);font-size:12px">${ns.join(', ')}</td>
      <td><strong style="color:${bc}">${m.toFixed(2)}</strong></td>
      <td><div class="qbar"><div class="qbg"><div class="qfill" style="width:${q}%;background:${bc}"></div></div><span class="qnum" style="color:${bc}">${q.toFixed(0)}%</span></div></td>
      <td>${badge(q)}</td>
    </tr>`;
  });
  document.getElementById('gr-subjects').innerHTML = `
    <div class="stitle">Все предметы</div>
    <div class="tbl-wrap"><table class="dt">
      <thead><tr><th>Предмет</th><th>Классы</th><th>Ср. балл</th><th>% качества</th><th>Статус</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function grDynamics() {
  const C = S.gr.parsed;
  document.getElementById('gr-dynamics').innerHTML = `
    <div class="cgrid one"><div class="ccrd"><h3>% качества по четвертям</h3><canvas id="c_gr_dq"></canvas></div></div>
    <div class="cgrid one" style="margin-top:16px"><div class="ccrd"><h3>Средний балл по четвертям</h3><canvas id="c_gr_dm"></canvas></div></div>`;

  const dsQ = C.map((cls, i) => ({
    label: cls.name,
    data: QUARTERS.map(q => { const vs = cls.subjects.map(s => cls.stats[s]?.[q]?.quality).filter(v => v !== undefined); return vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null; }),
    borderColor: PAL[i], backgroundColor: PAL[i] + '22', fill: true, tension: .35, pointRadius: 5, borderWidth: 2.5
  }));
  mkChart('c_gr_dq', { type: 'line', data: { labels: QUARTERS, datasets: dsQ }, options: { scales: { y: { min: 0, max: 100, ticks: { color: '#7a90b0', callback: v => v + '%' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } } }, plugins: { legend: { labels: { color: '#e2eaf8' } } } } }, 'gr');

  const dsM = C.map((cls, i) => ({
    label: cls.name,
    data: QUARTERS.map(q => { const vs = cls.subjects.map(s => cls.stats[s]?.[q]?.mean).filter(v => v !== undefined); return vs.length ? +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(2) : null; }),
    borderColor: PAL[i], backgroundColor: PAL[i] + '22', fill: true, tension: .35, pointRadius: 5, borderWidth: 2.5
  }));
  mkChart('c_gr_dm', { type: 'line', data: { labels: QUARTERS, datasets: dsM }, options: { scales: { y: { min: 1.5, max: 5.5, ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } } }, plugins: { legend: { labels: { color: '#e2eaf8' } } } } }, 'gr');
}

function grProblems() {
  const issues = [];
  S.gr.parsed.forEach(cls => cls.subjects.forEach(s => {
    const d = annualOrLast(cls.stats, s);
    if (!d || d.quality >= 70) return;
    issues.push({ subject: s, cls: cls.name, quality: d.quality, mean: d.mean, level: d.quality < 50 ? 'bad' : 'warn' });
  }));
  issues.sort((a, b) => a.quality - b.quality);
  const el = document.getElementById('gr-problems');
  if (!issues.length) { el.innerHTML = '<div style="color:var(--grn);padding:24px">✅ Все предметы в норме!</div>'; return; }
  el.innerHTML = `<div class="pgrid">${issues.map(i => `
    <div class="pcrd ${i.level}">
      <div class="ps">${i.subject}</div>
      <div style="color:var(--mut);font-size:12px;margin-bottom:8px">📚 ${i.cls}</div>
      <div class="pq" style="color:${qc(i.quality)}">${i.quality.toFixed(0)}%</div>
      <div style="font-size:12px;color:var(--mut)">ср. балл ${i.mean.toFixed(2)}</div>
      <div class="pr">${i.level === 'bad' ? '⚠️ Срочно: доп. занятия, индив. работа.' : '🔍 Усилить контроль, провести срезы.'}</div>
    </div>`).join('')}</div>`;
}

function grCompare() {
  const C = S.gr.parsed;
  if (C.length < 2) { document.getElementById('gr-compare').innerHTML = '<div style="color:var(--mut);padding:40px">Загрузите минимум 2 класса.</div>'; return; }
  const common = C[0].subjects.filter(s => C.every(c => c.subjects.includes(s)));
  document.getElementById('gr-compare').innerHTML = `
    <div class="cgrid">
      <div class="ccrd"><h3>% качества по предметам</h3><canvas id="c_gr_cs"></canvas></div>
      <div class="ccrd"><h3>Радар</h3><div style="max-width:380px;margin:0 auto"><canvas id="c_gr_cr"></canvas></div></div>
    </div>`;
  mkChart('c_gr_cs', { type: 'bar', data: { labels: common, datasets: C.map((cls, i) => ({ label: cls.name, data: common.map(s => { const d = annualOrLast(cls.stats, s); return d ? +d.quality.toFixed(1) : 0; }), backgroundColor: PAL[i] + 'cc', borderColor: PAL[i], borderWidth: 1, borderRadius: 4 })) }, options: { indexAxis: 'y', scales: { x: { max: 100, ticks: { color: '#7a90b0', callback: v => v + '%' }, grid: { color: '#1e2d45' } }, y: { ticks: { color: '#e2eaf8', font: { size: 10 } }, grid: { display: false } } }, plugins: { legend: { labels: { color: '#e2eaf8' } } } } }, 'gr');
  mkChart('c_gr_cr', { type: 'radar', data: { labels: common, datasets: C.map((cls, i) => ({ label: cls.name, data: common.map(s => { const d = annualOrLast(cls.stats, s); return d ? +d.quality.toFixed(1) : 0; }), borderColor: PAL[i], backgroundColor: PAL[i] + '33', pointBackgroundColor: PAL[i], borderWidth: 2 })) }, options: { scales: { r: { min: 0, max: 100, ticks: { color: '#7a90b0', backdropColor: 'transparent', stepSize: 25 }, grid: { color: '#1e2d45' }, pointLabels: { color: '#e2eaf8', font: { size: 9 } } } }, plugins: { legend: { labels: { color: '#e2eaf8' } } } } }, 'gr');
}

// ═══════════════════════════════════════════════════════
//  AWARDS — parse
// ═══════════════════════════════════════════════════════
function parseAwardsFile(buffer) {
  const wb  = XLSX.read(buffer, { type: 'array' });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const teachers = [];

  for (let i = 2; i < raw.length; i++) {
    const r    = raw[i];
    const num  = r[0];
    const name = r[1] ? String(r[1]).trim() : null;
    if (!name || !num) continue;

    const stazh     = parseFloat(r[2]) || 0;
    const stazh_org = r[5] ? parseFloat(String(r[5])) || 0 : 0;

    const awards = {};
    AWARD_COLS.forEach(ac => {
      const v = r[ac.col];
      awards[ac.key] = hasValue(v) ? String(v).trim() : null;
    });

    const totalTypes = AWARD_COLS.filter(ac => awards[ac.key] !== null).length;
    const totalCount = AWARD_COLS.reduce((sum, ac) => sum + (awards[ac.key] ? countYears(awards[ac.key]) : 0), 0);

    let level = 'none';
    if (awards.znak2 || awards.znak1)             level = 'знак';
    else if (awards.min_g)                         level = 'МОН грамота';
    else if (awards.min_q)                         level = 'МОН алғыс';
    else if (awards.obl_g)                         level = 'ГОРОНО грамота';
    else if (awards.obl_q)                         level = 'ГОРОНО алғыс';
    else if (awards.sardar || awards.daryn || awards.umc) level = 'республиканские';
    else if (awards.school)                        level = 'школьная';

    teachers.push({ num: parseInt(num), name, stazh, stazh_org, awards, totalTypes, totalCount, level });
  }
  return teachers;
}

// ═══════════════════════════════════════════════════════
//  AWARDS — render
// ═══════════════════════════════════════════════════════
function runAwards() {
  if (!S.aw.file) return;
  S.aw.teachers = parseAwardsFile(S.aw.file.data);
  
  // Validate and save teacher data
  saveAwardsToStorage(S.aw.teachers);
  
  // Save to history
  saveToHistory('aw', {
    fileName: S.aw.file.name,
    teachers: S.aw.teachers,
    teacherCount: S.aw.teachers.length
  });
  
  renderHistoryPanel('aw');
  
  destroyCharts('aw');
  awOverview(); awStats(); awStazh(); awTop();
  document.getElementById('aw-results').style.display = 'block';
  document.getElementById('aw-main').style.display    = 'block';
  document.getElementById('aw-drill').style.display   = 'none';
  document.getElementById('aw-results').scrollIntoView({ behavior: 'smooth' });
}

function awOverview() {
  const T          = S.aw.teachers;
  const total      = T.length;
  const withAwards = T.filter(t => t.totalTypes > 0).length;
  const withSign   = T.filter(t => t.awards.znak1 || t.awards.znak2).length;
  const withMin    = T.filter(t => t.awards.min_g || t.awards.min_q).length;
  const avgStazh   = T.reduce((a, b) => a + b.stazh, 0) / total;

  const el = document.getElementById('aw-overview');
  el.innerHTML = `
    <div class="cards">
      ${card('Педагогов', total, '')}
      ${card('Имеют награды', withAwards, 'g', Math.round(withAwards / total * 100) + '% состава')}
      ${card('Ср. стаж', avgStazh.toFixed(1) + ' лет', 'b', '')}
      ${card('Нагр. знаки', withSign, 'p', '')}
      ${card('Награды МОН', withMin, 'y', '')}
      ${card('Без наград', total - withAwards, 'r', Math.round((total - withAwards) / total * 100) + '% состава')}
    </div>
    <div class="stitle">Все педагоги — нажмите для подробной информации</div>
    <div class="tch-grid" id="aw-cards"></div>`;

  const grid = document.getElementById('aw-cards');
  T.forEach((t, i) => {
    const chipHtml = AWARD_COLS.filter(ac => t.awards[ac.key])
      .map(ac => `<span class="award-chip ${ac.cls}">${ac.label.length > 20 ? ac.label.slice(0, 18) + '…' : ac.label}</span>`)
      .join('');
    const div = document.createElement('div');
    div.className = 'tch-card';
    div.style.borderLeftColor = t.totalTypes === 0 ? 'var(--brd)' : t.totalTypes >= 5 ? 'var(--acc)' : t.totalTypes >= 3 ? 'var(--grn)' : 'var(--blu)';
    div.innerHTML = `
      <div class="tname">${t.name}</div>
      <div class="tmeta">Стаж: ${t.stazh} лет · в организации: ${t.stazh_org || '—'} лет</div>
      <div class="trow"><span>Типов наград</span><strong>${t.totalTypes}</strong></div>
      <div class="trow"><span>Всего грамот/знаков</span><strong>${t.totalCount}</strong></div>
      <div class="trow"><span>Высшая награда</span><strong style="color:var(--acc)">${t.level === 'none' ? '—' : t.level}</strong></div>
      <div class="taw">${chipHtml || '<span style="color:var(--mut);font-size:12px">Наград нет</span>'}</div>`;
    div.onclick = () => awDrill(i);
    grid.appendChild(div);
  });
}

function awStats() {
  const T = S.aw.teachers;
  document.getElementById('aw-stats').innerHTML = `
    <div class="cgrid">
      <div class="ccrd"><h3>Охват по типам наград</h3><canvas id="c_aw_types"></canvas></div>
      <div class="ccrd"><h3>Педагоги по количеству типов наград</h3><canvas id="c_aw_cnt"></canvas></div>
    </div>
    <div class="cgrid one" style="margin-top:16px">
      <div class="ccrd"><h3>Все типы наград — сколько педагогов имеют</h3><canvas id="c_aw_bar"></canvas></div>
    </div>`;

  const typeCounts = AWARD_COLS
    .map(ac => ({ label: ac.label, count: T.filter(t => t.awards[ac.key]).length }))
    .sort((a, b) => b.count - a.count);

  mkChart('c_aw_bar', {
    type: 'bar',
    data: { labels: typeCounts.map(t => t.label), datasets: [{ data: typeCounts.map(t => t.count), backgroundColor: typeCounts.map((_, i) => PAL[i % PAL.length]), borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } }, y: { ticks: { color: '#e2eaf8', font: { size: 11 } }, grid: { display: false } } } }
  }, 'aw');

  const withAw = T.filter(t => t.totalTypes > 0).length;
  mkChart('c_aw_types', {
    type: 'doughnut',
    data: { labels: ['Имеют награды', 'Без наград'], datasets: [{ data: [withAw, T.length - withAw], backgroundColor: ['#3b82f6', '#1e2d45'], borderColor: '#080c14', borderWidth: 3 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#e2eaf8', padding: 14 } } } }
  }, 'aw');

  const dist = {};
  T.forEach(t => { dist[t.totalTypes] = (dist[t.totalTypes] || 0) + 1; });
  const maxT     = Math.max(...Object.keys(dist).map(Number));
  const distData = Array.from({ length: maxT + 1 }, (_, i) => dist[i] || 0);
  mkChart('c_aw_cnt', {
    type: 'bar',
    data: { labels: distData.map((_, i) => i === 0 ? '0 наград' : i + ' тип(ов)'), datasets: [{ data: distData, backgroundColor: distData.map((_, i) => i === 0 ? '#f85149' : i < 3 ? '#f5d020' : '#3b82f6'), borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#7a90b0' }, grid: { display: false } } } }
  }, 'aw');
}

function awStazh() {
  const T        = S.aw.teachers;
  const brackets = [
    { l: '0–5',   min: 0,  max: 5   },
    { l: '6–10',  min: 6,  max: 10  },
    { l: '11–15', min: 11, max: 15  },
    { l: '16–20', min: 16, max: 20  },
    { l: '21–30', min: 21, max: 30  },
    { l: '31+',   min: 31, max: 999 }
  ];
  const groups = brackets.map(b => ({ ...b, teachers: T.filter(t => t.stazh >= b.min && t.stazh <= b.max) }));

  document.getElementById('aw-stazh').innerHTML = `
    <div class="cgrid">
      <div class="ccrd"><h3>Состав по стажу</h3><canvas id="c_aw_stazh"></canvas></div>
      <div class="ccrd"><h3>Ср. кол-во наград по группам стажа</h3><canvas id="c_aw_stavg"></canvas></div>
    </div>
    <div class="stitle" style="margin-top:24px">Педагоги по группам стажа</div>
    ${groups.filter(g => g.teachers.length).map(g => `
      <div style="margin-bottom:20px">
        <div style="font-family:'Unbounded',sans-serif;font-size:12px;color:var(--acc);margin-bottom:10px">
          Стаж ${g.l} лет — ${g.teachers.length} чел.
        </div>
        <div class="tbl-wrap"><table class="dt">
          <thead><tr><th>ФИО</th><th>Стаж</th><th>Наград</th><th>Высшая</th></tr></thead>
          <tbody>${g.teachers.map(t => `<tr>
            <td style="cursor:pointer;color:var(--blu)" onclick="awDrill(${S.aw.teachers.indexOf(t)})">${t.name}</td>
            <td>${t.stazh}</td>
            <td><strong>${t.totalTypes}</strong></td>
            <td style="color:var(--acc)">${t.level === 'none' ? '—' : t.level}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`).join('')}`;

  mkChart('c_aw_stazh', { type: 'bar', data: { labels: groups.map(g => g.l), datasets: [{ data: groups.map(g => g.teachers.length), backgroundColor: PAL, borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#7a90b0' }, grid: { display: false } } } } }, 'aw');
  mkChart('c_aw_stavg', { type: 'bar', data: { labels: groups.map(g => g.l), datasets: [{ label: 'Ср. типов наград', data: groups.map(g => g.teachers.length ? +(g.teachers.reduce((a, b) => a + b.totalTypes, 0) / g.teachers.length).toFixed(1) : 0), backgroundColor: '#3b82f6', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#7a90b0' }, grid: { color: '#1e2d45' } }, x: { ticks: { color: '#7a90b0' }, grid: { display: false } } } } }, 'aw');
}

function awTop() {
  const T    = [...S.aw.teachers].sort((a, b) => b.totalTypes - a.totalTypes || b.totalCount - a.totalCount);
  let rows = '';
  T.forEach((t, i) => {
    const medal    = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span style="color:var(--mut)">${i + 1}</span>`;
    const chipHtml = AWARD_COLS.filter(ac => t.awards[ac.key])
      .map(ac => `<span class="award-chip ${ac.cls}" title="${t.awards[ac.key]}">${ac.label.length > 16 ? ac.label.slice(0, 14) + '…' : ac.label}</span>`)
      .join('');
    rows += `<tr style="cursor:pointer" onclick="awDrill(${S.aw.teachers.indexOf(t)})">
      <td style="font-size:15px">${medal}</td>
      <td><strong style="color:var(--blu)">${t.name}</strong></td>
      <td>${t.stazh}</td>
      <td style="font-weight:700;color:var(--acc)">${t.totalTypes}</td>
      <td>${t.totalCount}</td>
      <td style="color:var(--acc);font-size:12px">${t.level === 'none' ? '—' : t.level}</td>
      <td>${chipHtml}</td>
    </tr>`;
  });
  document.getElementById('aw-top').innerHTML = `
    <div class="stitle">Рейтинг педагогов по наградам</div>
    <div class="tbl-wrap"><table class="dt">
      <thead><tr><th>#</th><th>ФИО</th><th>Стаж</th><th>Типов наград</th><th>Всего</th><th>Высшая</th><th>Награды</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function awDrill(idx) {
  const t = S.aw.teachers[idx];
  document.getElementById('aw-drill').style.display = 'block';
  document.getElementById('aw-main').style.display  = 'none';

  const awardRows = AWARD_COLS.map(ac => {
    const v = t.awards[ac.key];
    if (!v) return '';
    return `<tr>
      <td><span class="award-chip ${ac.cls}">${ac.label}</span></td>
      <td style="color:var(--txt)">${v}</td>
      <td style="color:var(--mut);font-size:12px">${countYears(v)} раз</td>
    </tr>`;
  }).join('');

  document.getElementById('aw-drill').innerHTML = `
    <button class="back-btn" onclick="awBack()">← Все педагоги</button>
    <div style="font-family:'Unbounded',sans-serif;font-size:22px;font-weight:800;margin-bottom:4px">${t.name}</div>
    <div style="color:var(--mut);font-size:13px;margin-bottom:24px">Общий стаж: ${t.stazh} лет · В организации: ${t.stazh_org || '—'} лет</div>
    <div class="cards">
      ${card('Типов наград', t.totalTypes, t.totalTypes >= 5 ? 'g' : t.totalTypes >= 2 ? 'y' : 'r')}
      ${card('Всего грамот', t.totalCount, 'b')}
      ${card('Высшая награда', t.level === 'none' ? '—' : t.level, 'p', '')}
    </div>
    ${awardRows ? `
      <div class="stitle">Полный список наград</div>
      <div class="tbl-wrap"><table class="dt">
        <thead><tr><th>Тип награды</th><th>Годы / информация</th><th>Количество</th></tr></thead>
        <tbody>${awardRows}</tbody>
      </table></div>`
    : '<div style="color:var(--mut);padding:20px">У данного педагога наград не зафиксировано.</div>'}`;
}

function awBack() {
  destroyCharts('aw');
  awOverview(); awStats(); awStazh(); awTop();
  renderHistoryPanel('aw');
  document.getElementById('aw-drill').style.display = 'none';
  document.getElementById('aw-main').style.display  = 'block';
}

// ═══════════════════════════════════════════════════════
//  EXPORT & BACKUP
// ═══════════════════════════════════════════════════════
function exportTeacherData() {
  if (!S.aw.teachers || S.aw.teachers.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  
  const exportData = S.aw.teachers.map(t => ({
    '№': t.num,
    'ФИО': t.name,
    'Общий стаж (лет)': t.stazh,
    'Стаж в организации (лет)': t.stazh_org,
    'Типов наград': t.totalTypes,
    'Всего грамот/знаков': t.totalCount,
    'Высшая награда': t.level,
    ...Object.fromEntries(AWARD_COLS.map(ac => [ac.label, t.awards[ac.key] || '']))
  }));
  
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Награды');
  
  // Auto-adjust column widths
  const colWidths = {};
  Object.keys(exportData[0] || {}).forEach((key, idx) => {
    colWidths[String.fromCharCode(65 + idx)] = { wch: Math.max(15, key.length + 2) };
  });
  ws['!cols'] = Object.values(colWidths);
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `teachers_export_${timestamp}.xlsx`);
}

function exportGradesData() {
  if (!S.gr.parsed || S.gr.parsed.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  
  const wb = XLSX.utils.book_new();
  
  S.gr.parsed.forEach(cls => {
    const data = [];
    cls.rows.forEach(row => {
      const rowData = { 'Ученик': row.student, 'Период': row.quarter };
      cls.subjects.forEach(s => {
        rowData[s] = isNaN(row[s]) ? '' : row[s];
      });
      data.push(rowData);
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = {};
    Object.keys(data[0] || {}).forEach((key, idx) => {
      colWidths[String.fromCharCode(65 + idx)] = { wch: Math.max(15, key.length + 2) };
    });
    ws['!cols'] = Object.values(colWidths);
    
    XLSX.utils.book_append_sheet(wb, ws, cls.name.slice(0, 31));
  });
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `grades_export_${timestamp}.xlsx`);
}

// ═══════════════════════════════════════════════════════
//  RATINGS — parse and render (from files(2), exact implementation)
// ═══════════════════════════════════════════════════════

// Set up drop handlers for ratings (teachers and students separately)
function setupRatingDrops() {
  // Teachers ratings
  const rtDrop = document.getElementById('rt-drop');
  const rtInput = document.getElementById('rt-input');
  if (rtDrop && rtInput) {
    rtDrop.addEventListener('dragover', e => { e.preventDefault(); rtDrop.classList.add('over'); });
    rtDrop.addEventListener('dragleave', () => rtDrop.classList.remove('over'));
    rtDrop.addEventListener('drop', e => { 
      e.preventDefault(); 
      rtDrop.classList.remove('over'); 
      if (e.dataTransfer.files.length > 0) loadRatingFile('rt', e.dataTransfer.files[0]); 
    });
    rtInput.addEventListener('change', () => { if (rtInput.files.length > 0) loadRatingFile('rt', rtInput.files[0]); });
  }
  
  // Students ratings
  const rsDrop = document.getElementById('rs-drop');
  const rsInput = document.getElementById('rs-input');
  if (rsDrop && rsInput) {
    rsDrop.addEventListener('dragover', e => { e.preventDefault(); rsDrop.classList.add('over'); });
    rsDrop.addEventListener('dragleave', () => rsDrop.classList.remove('over'));
    rsDrop.addEventListener('drop', e => { 
      e.preventDefault(); 
      rsDrop.classList.remove('over'); 
      if (e.dataTransfer.files.length > 0) loadRatingFile('rs', e.dataTransfer.files[0]); 
    });
    rsInput.addEventListener('change', () => { if (rsInput.files.length > 0) loadRatingFile('rs', rsInput.files[0]); });
  }
}

// Load and parse rating file (teachers or students)
function loadRatingFile(ns, file) {
  const reader = new FileReader();
  reader.onload = e => {
    if (ns === 'rt') {
      S.rt.teacherFile = { name: file.name, data: e.target.result };
      S.rt.teachers = parseTeacherRatings(e.target.result);
      document.getElementById('rt-pills').innerHTML = `📊 ${file.name}`;
      document.getElementById('rt-btn').disabled = false;
    } else {
      S.rt.studentFile = { name: file.name, data: e.target.result };
      S.rt.students = parseStudentRatings(e.target.result);
      document.getElementById('rs-pills').innerHTML = `📊 ${file.name}`;
      document.getElementById('rs-btn').disabled = false;
    }
    updateStudentSelect();
  };
  reader.readAsArrayBuffer(file);
}

// Parse teacher ratings from Excel
function parseTeacherRatings(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  
  const teachers = [];
  const cyrillic = /[А-ЯЁа-яёA-Za-z]/;
  
  raw.forEach((row, idx) => {
    // Column 34 = name
    if (!row[34] || !cyrillic.test(String(row[34]))) return;
    const name = String(row[34]).trim();
    
    // Extract quarter scores and total from columns 35-38
    const q1    = parseFloat(row[35]) || 0;
    const q2    = parseFloat(row[36]) || 0;
    const q34   = parseFloat(row[37]) || 0;
    const total = parseFloat(row[38]) || 0;
    
    // Extract criteria from columns 2-31
    const criteria = {};
    for (let i = 2; i <= 31; i++) {
      const val = row[i];
      if (val !== null && val !== undefined && val !== '') {
        const header = raw[0] && raw[0][i] ? String(raw[0][i]).trim() : `Критерий ${i-1}`;
        criteria[header] = parseFloat(val) || 0;
      }
    }
    
    teachers.push({ name, q1, q2, q34, total, criteria });
  });
  
  return teachers.sort((a, b) => b.total - a.total);
}

// Parse student ratings from Excel
function parseStudentRatings(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  
  if (!raw.length) return [];
  
  const students = [];
  const headers = raw[0] || [];
  
  // Process rows starting from 1 (row 0 is headers)
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    
    // Name from column 1 or 81
    let name = (row[1] ? String(row[1]).trim() : '') || (row[81] ? String(row[81]).trim() : '');
    if (!name) continue;
    
    // Total from column 80
    const total = parseFloat(row[80]) || 0;
    
    // Criteria scores from columns 2-79
    const scores = [];
    for (let j = 2; j <= 79; j++) {
      if (row[j] !== null && row[j] !== undefined && row[j] !== '') {
        const label = headers[j] ? String(headers[j]).trim() : `Критерий ${j-1}`;
        const value = parseFloat(row[j]) || 0;
        scores.push({ label, value });
      }
    }
    
    students.push({ name, total, scores, idx: students.length });
  }
  
  // Sort by total descending
  students.sort((a, b) => b.total - a.total);
  
  // Update indices after sorting
  students.forEach((s, i) => s.rank = i + 1);
  
  return students;
}

// Update student select dropdown
function updateStudentSelect() {
  const sel = document.getElementById('student-select');
  if (!sel) return;
  
  sel.innerHTML = '<option value="">— выберите ученика —</option>';
  S.rt.students.forEach((student, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${student.name} (${student.total} баллов)`;
    sel.appendChild(opt);
  });
}

// Run teacher ratings analysis
function runTeacherRatings() {
  if (!S.rt.teacherFile) return;
  
  destroyCharts('rt');
  renderTeacherRating();
  
  document.getElementById('rt-results').style.display = 'block';
  document.getElementById('rt-teachers').scrollIntoView({ behavior: 'smooth' });
}

// Run student ratings analysis
function runStudentRatings() {
  if (!S.rt.studentFile) return;
  
  destroyCharts('rt');
  renderStudentRating();
  
  document.getElementById('rt-results').style.display = 'block';
  iswitch('rt', 'students', document.querySelector('#rt-results .itab:nth-child(2)'));
  document.getElementById('rt-students').scrollIntoView({ behavior: 'smooth' });
}

// Render teacher ratings
function renderTeacherRating() {
  const root = document.getElementById('rt-teachers');
  if (!root || !S.rt.teachers.length) {
    if (root) root.innerHTML = '<p>Нет данных учителей</p>';
    return;
  }
  
  let html = `<div class="stitle">Рейтинг учителей</div>
    <div class="cards">
      <div class="card">
        <div class="lbl">Всего педагогов</div>
        <div class="val">${S.rt.teachers.length}</div>
      </div>
      <div class="card">
        <div class="lbl">Лидер</div>
        <div class="val">${S.rt.teachers[0].name}</div>
      </div>
      <div class="card">
        <div class="lbl">Средний балл</div>
        <div class="val">${(S.rt.teachers.reduce((s, t) => s + t.total, 0) / S.rt.teachers.length).toFixed(1)}</div>
      </div>
    </div>`;
  
  // Create chart container
  const chartId = 'chart-teachers-' + Math.random().toString(36).substr(2, 9);
  html += `<div style="margin-top:24px;padding:16px;background:var(--sur);border-radius:8px">
    <canvas id="${chartId}" height="100"></canvas>
  </div>`;
  
  // Table with rankings
  html += `<div class="stitle" style="margin-top:24px">Таблица рейтинговfb</div>
    <div class="tbl-wrap"><table class="dt"><thead><tr>
      <th style="width:60px">Ме<span>сто</span></th>
      <th>ФИО</th>
      <th style="width:80px">I четв.</th>
      <th style="width:80px">II четв.</th>
      <th style="width:80px">III-IV четв.</th>
      <th style="width:100px">Итого</th>
      <th style="width:160px">Диаграмма</th>
    </tr></thead><tbody>`;
  
  S.rt.teachers.forEach((teacher, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
    const pct = Math.min(100, (teacher.total / 100) * 100);
    const barColor = pct >= 70 ? 'var(--blu)' : pct >= 40 ? 'var(--yel)' : 'var(--red)';
    
    html += `<tr>
      <td class="tal">${medal}</td>
      <td>${teacher.name}</td>
      <td class="tal">${teacher.q1.toFixed(1)}</td>
      <td class="tal">${teacher.q2.toFixed(1)}</td>
      <td class="tal">${teacher.q34.toFixed(1)}</td>
      <td style="color:var(--acc);font-weight:bold" class="tal">${teacher.total.toFixed(1)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="qbar" style="height:8px;background:var(--brd);border-radius:4px;flex:1;overflow:hidden">
            <div class="qfill" style="height:100%;width:${pct}%;background:${barColor};border-radius:4px"></div>
          </div>
          <div style="font-size:12px;color:var(--txt);min-width:30px">${pct.toFixed(0)}%</div>
        </div>
      </td>
    </tr>`;
  });
  
  html += `</tbody></table></div>`;
  root.innerHTML = html;
  
  // Render chart
  setTimeout(() => {
    const ctx = document.getElementById(chartId);
    if (ctx) {
      const topN = S.rt.teachers.slice(0, 10);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: topN.map(t => t.name),
          datasets: [{
            label: 'Баллы',
            data: topN.map(t => t.total),
            backgroundColor: topN.map((_, i) => PAL[i % PAL.length]),
            borderRadius: 4,
            indexAxis: 'y'
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
      S.rt.charts.push(ctx.chart);
    }
  }, 0);
}

// Render student ratings
function renderStudentRating() {
  const root = document.getElementById('rt-students');
  if (!root || !S.rt.students.length) {
    if (root) root.innerHTML = '<p>Нет данных учеников</p>';
    return;
  }
  
  let html = `<div class="stitle">Рейтинг учеников</div>
    <div class="cards">
      <div class="card">
        <div class="lbl">Всего учеников</div>
        <div class="val">${S.rt.students.length}</div>
      </div>
      <div class="card">
        <div class="lbl">Лидер</div>
        <div class="val">${S.rt.students[0].name}</div>
      </div>
      <div class="card">
        <div class="lbl">Средний балл</div>
        <div class="val">${(S.rt.students.reduce((s, st) => s + st.total, 0) / S.rt.students.length).toFixed(1)}</div>
      </div>
    </div>`;
  
  html += `<div class="stitle" style="margin-top:24px">Таблица рейтинг</div>
    <div class="tbl-wrap"><table class="dt"><thead><tr>
      <th style="width:60px">Место</th>
      <th>ФИО</th>
      <th style="width:100px">Баллы</th>
    </tr></thead><tbody>`;
  
  S.rt.students.forEach((student, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
    html += `<tr onclick="selectStudentAndSwitch(${idx})" style="cursor:pointer">
      <td>${medal}</td>
      <td>${student.name}</td>
      <td class="tal" style="color:var(--acc);font-weight:bold">${student.total.toFixed(1)}</td>
    </tr>`;
  });
  
  html += `</tbody></table></div>`;
  root.innerHTML = html;
}

// Select student and switch to detail tab
function selectStudentAndSwitch(idx) {
  const sel = document.getElementById('student-select');
  if (sel) sel.value = idx;
  iswitch('rt', 'student-card', document.querySelector('#rt-results .itab:nth-child(3)'));
  showStudentCard(String(idx));
}

// Show detailed student card
function showStudentCard(idxStr) {
  const root = document.getElementById('student-card-body');
  if (!root) return;
  
  if (idxStr === '' || idxStr === undefined) {
    root.innerHTML = '';
    return;
  }
  
  const idx = parseInt(idxStr);
  const student = S.rt.students[idx];
  if (!student) return;
  
  let html = `
    <div class="stitle">${student.name}</div>
    <div class="cards">
      <div class="card">
        <div class="lbl">Общий балл</div>
        <div class="val" style="color:var(--acc)">${student.total.toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="lbl">Позиция</div>
        <div class="val">${student.rank} из ${S.rt.students.length}</div>
      </div>
  `;
  
  // Calculate bonus and penalties
  let bonusSum = 0, penaltySum = 0;
  const bonusItems = [], penaltyItems = [];
  
  student.scores.forEach(score => {
    if (score.value > 0) {
      bonusSum += score.value;
      bonusItems.push(score);
    } else if (score.value < 0) {
      penaltySum += Math.abs(score.value);
      penaltyItems.push(score);
    }
  });
  
  html += `
      <div class="card">
        <div class="lbl">Бонусы</div>
        <div class="val" style="color:var(--blu)">${bonusSum.toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="lbl">Штрафы</div>
        <div class="val" style="color:var(--red)">${penaltySum.toFixed(1)}</div>
      </div>
    </div>
  `;
  
  // Progress bar
  const pct = Math.min(100, (student.total / 100) * 100);
  html += `
    <div style="margin-top:20px">
      <div class="lbl" style="margin-bottom:8px">Прогресс</div>
      <div class="qbar" style="height:16px;background:var(--brd);border-radius:8px;overflow:hidden">
        <div class="qfill" style="height:100%;width:${pct}%;background:var(--acc);border-radius:8px;transition:width 0.3s"></div>
      </div>
      <div style="text-align:right;margin-top:4px;font-size:12px;color:var(--txt);opacity:0.7">${pct.toFixed(1)}%</div>
    </div>
  `;
  
  // Bonuses and penalties breakdown
  html += `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px">
      <div>
        <div class="lbl" style="margin-bottom:8px;color:var(--blu)">Бонусы (${bonusItems.length})</div>
        <div class="cgrid" style="max-height:200px;overflow-y:auto">
  `;
  
  bonusItems.forEach(item => {
    html += `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--brd);font-size:13px">
            <span>${item.label}</span>
            <span style="color:var(--blu);font-weight:bold">+${item.value.toFixed(1)}</span>
          </div>
    `;
  });
  
  html += `
        </div>
      </div>
      <div>
        <div class="lbl" style="margin-bottom:8px;color:var(--red)">Штрафы (${penaltyItems.length})</div>
        <div class="cgrid" style="max-height:200px;overflow-y:auto">
  `;
  
  penaltyItems.forEach(item => {
    html += `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--brd);font-size:13px">
            <span>${item.label}</span>
            <span style="color:var(--red);font-weight:bold">${item.value.toFixed(1)}</span>
          </div>
    `;
  });
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  root.innerHTML = html;
}

// Override iswitch for rt namespace to use correct root
const originalIswitch = iswitch;
function iswitch(ns, pane, btn) {
  if (ns === 'rt') {
    const root = 'rt-results';
    document.querySelectorAll(`#${root} .ipane`).forEach(p => p.classList.remove('on'));
    document.querySelectorAll(`#${root} .itab`).forEach(b => b.classList.remove('on'));
    const paneEl = document.getElementById(`${ns}-${pane}`);
    if (paneEl) paneEl.classList.add('on');
    if (btn) btn.classList.add('on');
  } else {
    originalIswitch(ns, pane, btn);
  }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
function initializeApp() {
  setupDrop('gr');
  setupDrop('aw');
  setupRatingDrops();
  loadHistoryFromStorage();
  renderHistoryPanel('all');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}

// Load previously saved awards data if available
window.addEventListener('load', () => {
  const savedTeachers = loadAwardsFromStorage();
  if (savedTeachers && savedTeachers.length > 0) {
    S.aw.teachers = savedTeachers;
  }
});
