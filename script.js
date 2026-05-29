const ACH_GROUPS = [
  {
    label: 'Trainings',
    items: [
      { id: 'first',      name: 'Erster Start',   desc: '1 Training absolviert',   progress: s => Math.min(s.length, 1),   max: 1 },
      { id: 'sessions5',  name: '5 Sessions',     desc: '5 Trainings absolviert',  progress: s => Math.min(s.length, 5),   max: 5 },
      { id: 'sessions10', name: '10 Sessions',    desc: '10 Trainings absolviert', progress: s => Math.min(s.length, 10),  max: 10 },
      { id: 'sessions25', name: '25 Sessions',    desc: '25 Trainings absolviert', progress: s => Math.min(s.length, 25),  max: 25 },
    ]
  },
  {
    label: 'Sprünge',
    items: [
      { id: 'jumps100',  name: '100 in einer Session',  desc: '100 Sprünge ohne Unterbruch', progress: s => Math.min(Math.max(...s.map(x=>x.jumps), 0), 100),  max: 100 },
      { id: 'jumps500',  name: '500 in einer Session',  desc: '500 Sprünge ohne Unterbruch', progress: s => Math.min(Math.max(...s.map(x=>x.jumps), 0), 500),  max: 500 },
      { id: 'jumps1000', name: '1000 in einer Session', desc: 'Die 1000er-Marke knacken',    progress: s => Math.min(Math.max(...s.map(x=>x.jumps), 0), 1000), max: 1000 },
    ]
  },
  {
    label: 'Streak',
    items: [
      { id: 'streak3', name: '3 Tage am Stück', desc: '3 Tage hintereinander trainiert', progress: s => Math.min(getStreak(s), 3), max: 3 },
      { id: 'streak7', name: '7 Tage am Stück', desc: 'Eine Woche ohne Aussetzer',        progress: s => Math.min(getStreak(s), 7), max: 7 },
    ]
  },
  {
    label: 'Stil',
    items: [
      { id: 'freestyle', name: 'Freestyle',  desc: 'Eine Freestyle-Session absolviert',  progress: s => s.some(x => x.type === 'freestyle') ? 1 : 0, max: 1 },
      { id: 'multi',     name: 'Vielseitig', desc: '3 verschiedene Übungstypen probiert', progress: s => Math.min(new Set(s.map(x => x.type)).size, 3), max: 3 },
    ]
  },
];

const ACHIEVEMENTS = ACH_GROUPS.flatMap(g => g.items).map(a => ({
  ...a,
  check: s => a.progress(s) >= a.max,
}));

// ── Storage ───────────────────────────────────────────────────────────────────

function getSessions() {
  try { return JSON.parse(localStorage.getItem('sd_sessions') || '[]'); } catch { return []; }
}
function saveSessions(arr) { localStorage.setItem('sd_sessions', JSON.stringify(arr)); }
function getUnlocked() {
  try { return JSON.parse(localStorage.getItem('sd_unlocked') || '[]'); } catch { return []; }
}
function saveUnlocked(arr) { localStorage.setItem('sd_unlocked', JSON.stringify(arr)); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStreak(sessions) {
  if (!sessions.length) return 0;
  const dates     = [...new Set(sessions.map(s => s.date))].sort().reverse();
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if ((new Date(dates[i - 1]) - new Date(dates[i])) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

function typeBadge(type) {
  const map = {
    basic:     ['badge-gray',   'Basic'],
    double:    ['badge-blue',   'Double Under'],
    crossover: ['badge-orange', 'Crossover'],
    speed:     ['badge-pink',   'Speed'],
    freestyle: ['badge-green',  'Freestyle'],
    mixed:     ['badge-gray',   'Gemischt'],
  };
  const [cls, label] = map[type] || ['badge-gray', type];
  return `<span class="badge ${cls}">${label}</span>`;
}

function intensityDot(level) {
  const colors = { hart: '#c0392b', mittel: '#c07a28', leicht: '#2b5fc0' };
  const col = colors[level] || '#7a7068';
  return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${col};margin-right:5px;vertical-align:middle"></span>${level}`;
}

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ── Chart ─────────────────────────────────────────────────────────────────────

let chartInst = null;

function renderChart(sessions) {
  const recent = sessions.slice(-10);
  const data   = recent.map(s => s.jumps);
  const maxVal = Math.max(...data, 0);

  const ctx = document.getElementById('dashChart').getContext('2d');
  if (chartInst) chartInst.destroy();
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: recent.map(s => formatDate(s.date)),
      datasets: [{
        data,
        backgroundColor: data.map(v => v === maxVal && data.length > 1 ? 'rgba(192,57,43,0.85)' : 'rgba(192,57,43,0.15)'),
        borderColor:     data.map(v => v === maxVal && data.length > 1 ? '#c0392b' : 'rgba(192,57,43,0.3)'),
        borderWidth: 1,
        borderRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => ` ${c.raw} Sprünge` },
          backgroundColor: '#ffffff',
          borderColor: '#e8e3de', borderWidth: 1,
          titleColor: '#1a1a1a', bodyColor: '#7a7068',
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }
      },
      scales: {
        x: { ticks: { color: '#b0a89e', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        y: { ticks: { color: '#b0a89e', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' }, beginAtZero: true }
      }
    }
  });
}

// ── Render pages ──────────────────────────────────────────────────────────────

function renderDashboard() {
  const sessions = getSessions();

  document.getElementById('stat-sessions').textContent = sessions.length;
  document.getElementById('stat-jumps').textContent    = sessions.reduce((a, s) => a + s.jumps, 0).toLocaleString('de-CH');
  document.getElementById('stat-minutes').textContent  = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const pr = sessions.length ? Math.max(...sessions.map(s => s.jumps)) : null;
  document.getElementById('stat-pr').textContent = pr ? pr.toLocaleString('de-CH') : '–';

  const streak = getStreak(sessions);
  const banner = document.getElementById('streak-banner');
  if (streak >= 2) {
    banner.style.display = 'flex';
    document.getElementById('streak-num').textContent  = streak;
    document.getElementById('streak-text').textContent = 'Tage in Folge trainiert';
  } else {
    banner.style.display = 'none';
  }

  const last     = sessions.length ? sessions[sessions.length - 1] : null;
  const lastCard = document.getElementById('last-session-card');
  if (last) {
    lastCard.style.display = 'block';
    document.getElementById('last-session-info').innerHTML =
      `${formatDate(last.date)} &nbsp;·&nbsp; ${last.jumps} Sprünge &nbsp;·&nbsp; ${last.duration} min &nbsp;·&nbsp; ${typeBadge(last.type)} &nbsp; ${last.mood}`;
  } else {
    lastCard.style.display = 'none';
  }

  renderChart(sessions);
}

function renderHistory() {
  const sessions = getSessions().slice().reverse();
  document.getElementById('history-count').textContent = sessions.length + ' Einträge';
  const list = document.getElementById('history-list');
  if (!sessions.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🪢</div><div class="empty-text">Leer? Din Ernst?!</div></div>`;
    return;
  }
  const pr = Math.max(...sessions.map(s => s.jumps));
  list.innerHTML = sessions.map(s => `
    <div class="log-item">
      <div class="log-date">${formatDate(s.date)}</div>
      <div class="log-body">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="log-jumps">${s.jumps.toLocaleString('de-CH')}</span>
          <span style="font-size:12px;color:var(--text-muted)">Sprünge</span>
          ${s.jumps === pr && sessions.length > 1 ? '<span class="pr-tag">PR</span>' : ''}
          ${typeBadge(s.type)}
        </div>
        <div class="log-meta">${s.duration} min &nbsp;·&nbsp; ${intensityDot(s.intensity)} &nbsp;·&nbsp; ${s.mood}</div>
        ${s.notes ? `<div class="log-note">${s.notes}</div>` : ''}
      </div>
      <button class="btn-ghost" onclick="deleteSession(${s.id})">Löschen</button>
    </div>
  `).join('');
}

function renderAchievements() {
  const sessions = getSessions();
  const unlocked = getUnlocked();
  document.getElementById('ach-grid').innerHTML = ACH_GROUPS.map(group => {
    const items = group.items.map(a => {
      const ok  = unlocked.includes(a.id) || a.check(sessions);
      const cur = a.progress(sessions);
      const pct = Math.round((cur / a.max) * 100);
      return `
        <div class="ach-item ${ok ? 'unlocked' : ''}">
          <div class="ach-item-top">
            <div>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.desc}</div>
            </div>
            <div class="ach-check">
              <div class="ach-check-inner"></div>
            </div>
          </div>
          <div class="ach-bar-wrap">
            <div class="ach-bar" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="ach-group">
        <div class="ach-group-title">${group.label}</div>
        ${items}
      </div>`;
  }).join('');
}

// ── Functions ───────────────────────────────────────────────────────────────────


function saveSession() {
  const date      = document.getElementById('inp-date').value;
  const jumps     = parseInt(document.getElementById('inp-jumps').value);
  const duration  = parseInt(document.getElementById('inp-duration').value);
  const type      = document.getElementById('inp-type').value;
  const intensity = document.getElementById('inp-intensity').value;
  const mood      = document.getElementById('inp-mood').value;
  const notes     = document.getElementById('inp-notes').value.trim();

  if (!date || !jumps || !duration) { showToast('Bitte alle Pflichtfelder ausfüllen'); return; }

  const sessions = getSessions();
  sessions.push({ id: Date.now(), date, jumps, duration, type, intensity, mood, notes });
  saveSessions(sessions);
  checkNewAchievements(sessions);

  document.getElementById('inp-jumps').value    = '';
  document.getElementById('inp-duration').value = '';
  document.getElementById('inp-notes').value    = '';

  showToast('✅ Training gespeichert!');
  showPage('dashboard');
}

function deleteSession(id) {
  if (!confirm('Eintrag wirklich löschen?')) return;
  saveSessions(getSessions().filter(s => s.id !== id));
  renderHistory();
  renderDashboard();
  showToast('Eintrag gelöscht.');
}

// ── Navigation ────────────────────────────────────────────────────────────────

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.dataset.page === name) t.classList.add('active');
  });
  if (name === 'dashboard')    renderDashboard();
  if (name === 'history')      renderHistory();
}

// ── Timer ─────────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Ende ──────────────────────────────────────────────────────────────────────

document.getElementById('inp-date').value = new Date().toISOString().slice(0, 10);
renderDashboard();
