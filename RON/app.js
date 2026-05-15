// ============================================================
// BillarTPV — Sistema de Gestión Profesional para Sala de Billar
// Versión 1.0 | React 18 | PWA | Offline-First
// ============================================================

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ─────────────────────────────────────────────
// CONFIGURACIÓN INICIAL DE MESAS
// ─────────────────────────────────────────────
const MESAS_CONFIG = [
  { id: 1, nombre: 'Mesa 1', tarifa: 10, icono: '◈' },
  { id: 2, nombre: 'Mesa 2', tarifa: 10, icono: '◈' },
  { id: 3, nombre: 'Mesa 3', tarifa: 10, icono: '◈' },
  { id: 4, nombre: 'Mesa 5', tarifa: 10, icono: '◈' },
  { id: 5, nombre: 'Mesa 4', tarifa: 14, icono: '◉' },
  { id: 6, nombre: 'Mesa 7', tarifa: 14, icono: '◉' },
  { id: 7, nombre: 'Mesa 8', tarifa: 14, icono: '◉' },
  { id: 8, nombre: 'Mesa 6', tarifa: 8,  icono: '◇' },
];

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatMoney = (amount) => `${amount.toFixed(2)} €`;

const formatDateTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });
};

const formatTimeShort = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const calcImporte = (segundos, tarifa) => (segundos / 3600) * tarifa;

const getTodayKey = () => new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────
// PERSISTENCIA — LocalStorage helpers
// ─────────────────────────────────────────────
const LS = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
};

// ─────────────────────────────────────────────
// AUDIO — Sonidos opcionales
// ─────────────────────────────────────────────
const playBeep = (freq = 880, dur = 0.1, type = 'sine') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch {}
};

const playStart = () => { playBeep(660, 0.08); setTimeout(() => playBeep(880, 0.12), 100); };
const playStop  = () => { playBeep(440, 0.12); setTimeout(() => playBeep(330, 0.18), 120); };

// ─────────────────────────────────────────────
// ESTILOS GLOBALES (inyectados en <head>)
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  :root {
    --bg:        #080810;
    --bg2:       #0e0e1a;
    --bg3:       #141426;
    --border:    rgba(255,255,255,0.07);
    --border2:   rgba(255,255,255,0.12);
    --text:      #e8e8f0;
    --muted:     #6b6b88;
    --accent:    #7c6fff;
    --accent2:   #a78bfa;
    --green:     #22c55e;
    --green-bg:  rgba(34,197,94,0.12);
    --red:       #ef4444;
    --red-bg:    rgba(239,68,68,0.12);
    --gray:      #3f3f5a;
    --gray-bg:   rgba(63,63,90,0.15);
    --gold:      #f59e0b;
    --gold-bg:   rgba(245,158,11,0.12);
    --radius:    14px;
    --radius-sm: 8px;
    --shadow:    0 8px 32px rgba(0,0,0,0.4);
  }
  .dark-mode-off { }
  .light-mode {
    --bg:      #f0f0f8;
    --bg2:     #e4e4f0;
    --bg3:     #d8d8ec;
    --border:  rgba(0,0,0,0.08);
    --border2: rgba(0,0,0,0.14);
    --text:    #1a1a2e;
    --muted:   #7070a0;
    --gray:    #a0a0c0;
    --gray-bg: rgba(100,100,140,0.1);
  }

  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }

  .app-wrap { min-height: 100vh; display: flex; flex-direction: column; }

  /* HEADER */
  .header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(8,8,16,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .light-mode .header { background: rgba(240,240,248,0.92); }
  .header-brand { display: flex; align-items: center; gap: 12px; }
  .header-logo { 
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), #4f46e5);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800; font-family: 'Syne', sans-serif;
    color: white; letter-spacing: -1px; flex-shrink: 0;
  }
  .header-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: -0.3px; }
  .header-sub { font-size: 0.72rem; color: var(--muted); font-family: 'DM Mono', monospace; }
  .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .btn-icon {
    width: 36px; height: 36px; border-radius: var(--radius-sm);
    border: 1px solid var(--border2); background: var(--bg3);
    color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 16px; transition: all 0.18s; flex-shrink: 0;
  }
  .btn-icon:hover { background: var(--accent); border-color: var(--accent); }
  .nav-tab {
    padding: 7px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border2);
    background: transparent; color: var(--muted); cursor: pointer; font-size: 0.8rem;
    font-family: 'DM Sans', sans-serif; font-weight: 500; transition: all 0.18s;
    white-space: nowrap;
  }
  .nav-tab.active { background: var(--accent); border-color: var(--accent); color: white; }
  .nav-tab:hover:not(.active) { border-color: var(--border2); color: var(--text); }

  /* MAIN */
  .main { flex: 1; padding: 20px; max-width: 1400px; margin: 0 auto; width: 100%; }

  /* GRID MESAS */
  .mesas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  /* TARJETA MESA */
  .mesa-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    position: relative;
    overflow: hidden;
    display: flex; flex-direction: column; gap: 14px;
  }
  .mesa-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    transition: opacity 0.3s;
  }
  .mesa-card.libre::before  { background: var(--green); }
  .mesa-card.en-uso::before { background: var(--red); }
  .mesa-card.finalizada::before { background: var(--gray); }
  .mesa-card.en-uso { 
    border-color: rgba(239,68,68,0.25);
    box-shadow: 0 0 0 1px rgba(239,68,68,0.1), var(--shadow);
  }
  .mesa-card.libre { border-color: rgba(34,197,94,0.15); }
  .mesa-card.finalizada { opacity: 0.85; }
  .mesa-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.5); }

  .mesa-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .mesa-info { display: flex; flex-direction: column; gap: 3px; }
  .mesa-nombre { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: -0.3px; }
  .mesa-tarifa { font-family: 'DM Mono', monospace; font-size: 0.78rem; color: var(--accent2); }
  .mesa-badge {
    padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
    font-family: 'DM Mono', monospace; letter-spacing: 0.3px;
    transition: all 0.3s;
  }
  .badge-libre     { background: var(--green-bg); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }
  .badge-en-uso    { background: var(--red-bg);   color: var(--red);   border: 1px solid rgba(239,68,68,0.25); animation: pulse-badge 2s infinite; }
  .badge-finalizada{ background: var(--gray-bg);  color: var(--muted); border: 1px solid rgba(100,100,140,0.2); }

  @keyframes pulse-badge {
    0%, 100% { opacity: 1; } 50% { opacity: 0.7; }
  }

  .mesa-timer {
    text-align: center;
    padding: 16px 12px;
    background: var(--bg3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .timer-display {
    font-family: 'DM Mono', monospace;
    font-size: 2.2rem;
    font-weight: 500;
    letter-spacing: 3px;
    line-height: 1;
    transition: color 0.3s;
  }
  .timer-display.running { color: var(--red); }
  .timer-display.idle    { color: var(--muted); }
  .timer-display.done    { color: var(--text); }

  .timer-importe {
    margin-top: 8px;
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    transition: color 0.3s;
  }
  .timer-importe.running { color: var(--gold); }
  .timer-importe.idle    { color: var(--muted); }
  .timer-importe.done    { color: var(--text); }

  .timer-sub { font-size: 0.7rem; color: var(--muted); margin-top: 3px; font-family: 'DM Mono', monospace; }

  /* Progress bar */
  .mesa-progress { height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
  .mesa-progress-fill { 
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, var(--accent), var(--red));
    transition: width 1s linear;
  }

  .hora-inicio { 
    font-size: 0.72rem; color: var(--muted); text-align: center;
    font-family: 'DM Mono', monospace;
    display: flex; justify-content: space-between;
  }

  /* BOTONES MESA */
  .mesa-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .mesa-btns.tres { grid-template-columns: 1fr 1fr; }
  .btn-mesa {
    padding: 12px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border2);
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.85rem;
    cursor: pointer; transition: all 0.18s; letter-spacing: 0.2px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .btn-iniciar { background: var(--green-bg); color: var(--green); border-color: rgba(34,197,94,0.3); }
  .btn-iniciar:hover { background: var(--green); color: white; }
  .btn-detener { background: var(--red-bg); color: var(--red); border-color: rgba(239,68,68,0.3); grid-column: 1 / -1; }
  .btn-detener:hover { background: var(--red); color: white; }
  .btn-reset   { background: var(--gray-bg); color: var(--muted); border-color: rgba(100,100,140,0.2); }
  .btn-reset:hover { background: var(--gray); color: white; }
  .btn-cobrar { background: var(--gold-bg); color: var(--gold); border-color: rgba(245,158,11,0.3); grid-column: 1 / -1; }
  .btn-cobrar:hover { background: var(--gold); color: #1a1a00; }

  /* CAJA */
  .caja-wrap { display: flex; flex-direction: column; gap: 20px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .stat-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px 20px;
    display: flex; flex-direction: column; gap: 6px;
    transition: all 0.2s;
  }
  .stat-card:hover { border-color: var(--border2); }
  .stat-label { font-size: 0.72rem; color: var(--muted); font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 0.8px; }
  .stat-value { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 700; letter-spacing: -1px; }
  .stat-value.gold  { color: var(--gold); }
  .stat-value.green { color: var(--green); }
  .stat-value.accent{ color: var(--accent2); }

  .section-title {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1rem;
    letter-spacing: -0.2px; margin-bottom: 12px; color: var(--text);
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* HISTORIAL TABLE */
  .table-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  thead th {
    padding: 12px 16px; text-align: left; background: var(--bg3);
    font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap;
    border-bottom: 1px solid var(--border);
  }
  tbody td { padding: 11px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--bg3); }
  .mono { font-family: 'DM Mono', monospace; }
  .td-importe { font-family: 'Syne', sans-serif; font-weight: 700; color: var(--gold); }
  .td-mesa { font-weight: 600; }
  .empty-state {
    text-align: center; padding: 40px; color: var(--muted);
    font-family: 'DM Mono', monospace; font-size: 0.85rem;
  }

  /* MESAS BREAKDOWN */
  .mesas-breakdown { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .mesa-stat {
    background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 14px; display: flex; flex-direction: column; gap: 4px;
  }
  .mesa-stat-nombre { font-weight: 600; font-size: 0.85rem; }
  .mesa-stat-importe { font-family: 'Syne', sans-serif; font-weight: 700; color: var(--gold); font-size: 1.1rem; }
  .mesa-stat-partidas { font-size: 0.72rem; color: var(--muted); font-family: 'DM Mono', monospace; }

  /* ACCION BUTTONS */
  .btn-accion {
    padding: 11px 20px; border-radius: var(--radius-sm);
    border: 1px solid var(--border2); background: var(--bg3);
    color: var(--text); cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-weight: 600; font-size: 0.85rem; transition: all 0.18s;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-accion:hover { border-color: var(--accent); color: var(--accent2); }
  .btn-danger { border-color: rgba(239,68,68,0.3); color: var(--red); }
  .btn-danger:hover { background: var(--red); color: white; border-color: var(--red); }
  .btn-success { border-color: rgba(34,197,94,0.3); color: var(--green); }
  .btn-success:hover { background: var(--green); color: white; border-color: var(--green); }
  .accion-row { display: flex; gap: 10px; flex-wrap: wrap; }

  /* MODAL */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius);
    padding: 28px; max-width: 420px; width: 100%;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    animation: slideUp 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .modal-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.15rem; margin-bottom: 10px; }
  .modal-body { color: var(--muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px; }
  .modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
  .modal-amount { 
    font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 700; 
    color: var(--gold); text-align: center; margin: 16px 0;
  }

  /* TOAST */
  .toast-wrap { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  .toast {
    background: var(--bg3); border: 1px solid var(--border2); border-radius: var(--radius-sm);
    padding: 10px 18px; font-size: 0.85rem; font-weight: 500;
    box-shadow: var(--shadow); white-space: nowrap;
    animation: toastIn 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .toast.green { border-color: rgba(34,197,94,0.4); color: var(--green); }
  .toast.red   { border-color: rgba(239,68,68,0.4); color: var(--red); }
  .toast.gold  { border-color: rgba(245,158,11,0.4); color: var(--gold); }

  /* HISTORIAL TAB */
  .hist-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .hist-tab { padding: 7px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 0.8rem; transition: all 0.18s; }
  .hist-tab.active { background: var(--bg3); border-color: var(--border2); color: var(--text); }

  /* ESTADÍSTICAS */
  .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 10px; background: var(--bg3); border-radius: var(--radius-sm); border: 1px solid var(--border); }
  .chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
  .chart-bar { width: 100%; border-radius: 4px 4px 0 0; background: var(--accent); transition: height 0.6s cubic-bezier(0.4,0,0.2,1); min-height: 2px; }
  .chart-bar-label { font-family: 'DM Mono', monospace; font-size: 0.62rem; color: var(--muted); }
  .chart-bar-val { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--accent2); }

  /* Responsive */
  @media (max-width: 600px) {
    .main { padding: 12px; }
    .mesas-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .mesa-card { padding: 14px; gap: 10px; }
    .timer-display { font-size: 1.4rem; }
    .timer-importe { font-size: 1.1rem; }
    .mesa-btns { gap: 6px; }
    .btn-mesa { padding: 10px 6px; font-size: 0.78rem; }
    .header { padding: 10px 14px; }
    .header-title { font-size: 0.95rem; }
    .stat-value { font-size: 1.4rem; }
  }
  @media (max-width: 400px) {
    .mesas-grid { grid-template-columns: 1fr; }
    .header-actions { gap: 5px; }
    .nav-tab { padding: 6px 10px; font-size: 0.75rem; }
  }
  @media (min-width: 1200px) {
    .mesas-grid { grid-template-columns: repeat(4, 1fr); }
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* Animaciones pulsing */
  @keyframes glow-red { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 18px 2px rgba(239,68,68,0.2); } }
  .mesa-card.en-uso { animation: glow-red 3s ease-in-out infinite; }
`;

// ─────────────────────────────────────────────
// COMPONENTE TOAST
// ─────────────────────────────────────────────
function Toasts({ toasts }) {
  return React.createElement('div', { className: 'toast-wrap' },
    toasts.map(t => React.createElement('div', { key: t.id, className: `toast ${t.type || ''}` }, t.msg))
  );
}

// ─────────────────────────────────────────────
// COMPONENTE MODAL
// ─────────────────────────────────────────────
function Modal({ title, body, onCancel, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, extra = null }) {
  return React.createElement('div', { className: 'modal-backdrop', onClick: onCancel },
    React.createElement('div', { className: 'modal', onClick: e => e.stopPropagation() },
      React.createElement('div', { className: 'modal-title' }, title),
      React.createElement('div', { className: 'modal-body' }, body),
      extra,
      React.createElement('div', { className: 'modal-btns' },
        React.createElement('button', { className: 'btn-accion', onClick: onCancel }, cancelText),
        React.createElement('button', {
          className: `btn-accion ${danger ? 'btn-danger' : 'btn-success'}`,
          onClick: onConfirm
        }, confirmText)
      )
    )
  );
}

// ─────────────────────────────────────────────
// COMPONENTE TARJETA MESA
// ─────────────────────────────────────────────
function MesaCard({ mesa, onIniciar, onDetener, onReset, onCobrar, soundEnabled }) {
  const { estado, tiempoSeg, iniciadoEn } = mesa;
  const importe = calcImporte(tiempoSeg, mesa.tarifa);
  const estadoClass = estado === 'libre' ? 'libre' : estado === 'en-uso' ? 'en-uso' : 'finalizada';
  const badgeClass = estado === 'libre' ? 'badge-libre' : estado === 'en-uso' ? 'badge-en-uso' : 'badge-finalizada';
  const badgeText = estado === 'libre' ? 'LIBRE' : estado === 'en-uso' ? 'EN USO' : 'FINALIZADA';

  // Barra progreso: max 2h = 7200s
  const progressPct = Math.min((tiempoSeg / 7200) * 100, 100);

  const timerClass = estado === 'en-uso' ? 'running' : estado === 'finalizada' ? 'done' : 'idle';
  const iconMap = { libre: '▶', 'en-uso': '⏹', finalizada: '🔄' };

  // Tarifa color
  const tarifaColor = mesa.tarifa === 14 ? '#a78bfa' : mesa.tarifa === 10 ? '#60a5fa' : '#34d399';

  return React.createElement('div', { className: `mesa-card ${estadoClass}` },
    // Header
    React.createElement('div', { className: 'mesa-header' },
      React.createElement('div', { className: 'mesa-info' },
        React.createElement('div', { className: 'mesa-nombre' }, `${mesa.icono} ${mesa.nombre}`),
        React.createElement('div', { className: 'mesa-tarifa', style: { color: tarifaColor } },
          `${mesa.tarifa} €/hora`
        )
      ),
      React.createElement('span', { className: `mesa-badge ${badgeClass}` }, badgeText)
    ),

    // Timer display
    React.createElement('div', { className: 'mesa-timer' },
      React.createElement('div', { className: `timer-display ${timerClass}` }, formatTime(tiempoSeg)),
      React.createElement('div', { className: `timer-importe ${timerClass}` }, formatMoney(importe)),
      React.createElement('div', { className: 'timer-sub' },
        estado === 'en-uso' ? `Iniciado: ${formatTimeShort(iniciadoEn)}` :
        estado === 'finalizada' ? 'Partida finalizada' : 'En espera'
      )
    ),

    // Barra progreso
    estado !== 'libre' && React.createElement('div', { className: 'mesa-progress' },
      React.createElement('div', { className: 'mesa-progress-fill', style: { width: `${progressPct}%` } })
    ),

    // Info inicio/fin
    estado !== 'libre' && React.createElement('div', { className: 'hora-inicio' },
      React.createElement('span', null, `Inicio: ${formatTimeShort(mesa.iniciadoEn)}`),
      mesa.finalizadoEn && React.createElement('span', null, `Fin: ${formatTimeShort(mesa.finalizadoEn)}`)
    ),

    // Botones
    React.createElement('div', { className: 'mesa-btns' },
      estado === 'libre' && React.createElement('button', {
        className: 'btn-mesa btn-iniciar',
        onClick: onIniciar,
        style: { gridColumn: '1 / -1' }
      }, '▶ Iniciar partida'),

      estado === 'en-uso' && React.createElement('button', {
        className: 'btn-mesa btn-detener',
        onClick: onDetener
      }, '⏹ Detener'),

      estado === 'finalizada' && React.createElement(React.Fragment, null,
        React.createElement('button', {
          className: 'btn-mesa btn-cobrar',
          onClick: onCobrar
        }, '💳 Cobrar'),
        React.createElement('button', {
          className: 'btn-mesa btn-reset',
          onClick: onReset
        }, '↺ Resetear')
      ),

      (estado === 'libre' || estado === 'en-uso') && React.createElement('button', {
        className: 'btn-mesa btn-reset',
        onClick: onReset,
        style: estado === 'en-uso' ? {} : { display: 'none' }
      }, '↺ Reset')
    )
  );
}

// ─────────────────────────────────────────────
// VISTA CAJA DIARIA
// ─────────────────────────────────────────────
function VistaCaja({ historial, onCerrarCaja, onExportarCSV }) {
  const hoy = getTodayKey();
  const registrosHoy = historial.filter(r => r.fecha === hoy);

  const totalHoy = registrosHoy.reduce((s, r) => s + r.importe, 0);
  const partidasHoy = registrosHoy.length;
  const tiempoTotalSeg = registrosHoy.reduce((s, r) => s + r.tiempoSeg, 0);

  // Por mesa
  const porMesa = {};
  MESAS_CONFIG.forEach(m => { porMesa[m.id] = { nombre: m.nombre, importe: 0, partidas: 0 }; });
  registrosHoy.forEach(r => {
    if (porMesa[r.mesaId]) {
      porMesa[r.mesaId].importe += r.importe;
      porMesa[r.mesaId].partidas += 1;
    }
  });

  return React.createElement('div', { className: 'caja-wrap' },
    // Stats
    React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '📊 Resumen del día'),
      React.createElement('div', { className: 'stats-grid' },
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-label' }, 'Total facturado'),
          React.createElement('div', { className: 'stat-value gold' }, formatMoney(totalHoy))
        ),
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-label' }, 'Partidas jugadas'),
          React.createElement('div', { className: 'stat-value green' }, partidasHoy)
        ),
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-label' }, 'Tiempo total'),
          React.createElement('div', { className: 'stat-value accent' }, formatTime(tiempoTotalSeg))
        ),
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-label' }, 'Ticket medio'),
          React.createElement('div', { className: 'stat-value' }, partidasHoy > 0 ? formatMoney(totalHoy / partidasHoy) : '—')
        )
      )
    ),

    // Por mesa
    React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '🎱 Ingresos por mesa'),
      React.createElement('div', { className: 'mesas-breakdown' },
        Object.values(porMesa).map(m =>
          React.createElement('div', { key: m.nombre, className: 'mesa-stat' },
            React.createElement('div', { className: 'mesa-stat-nombre' }, m.nombre),
            React.createElement('div', { className: 'mesa-stat-importe' }, formatMoney(m.importe)),
            React.createElement('div', { className: 'mesa-stat-partidas' }, `${m.partidas} partida${m.partidas !== 1 ? 's' : ''}`)
          )
        )
      )
    ),

    // Historial hoy
    React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '📋 Partidas de hoy'),
      React.createElement('div', { className: 'table-wrap' },
        React.createElement('div', { className: 'table-scroll' },
          React.createElement('table', null,
            React.createElement('thead', null,
              React.createElement('tr', null,
                ['Mesa', 'Tarifa', 'Inicio', 'Fin', 'Duración', 'Importe'].map(h =>
                  React.createElement('th', { key: h }, h)
                )
              )
            ),
            React.createElement('tbody', null,
              registrosHoy.length === 0
                ? React.createElement('tr', null,
                    React.createElement('td', { colSpan: 6, className: 'empty-state' }, 'Sin partidas registradas hoy')
                  )
                : [...registrosHoy].reverse().map((r, i) =>
                    React.createElement('tr', { key: i },
                      React.createElement('td', { className: 'td-mesa' }, r.mesa),
                      React.createElement('td', { className: 'mono' }, `${r.tarifa} €/h`),
                      React.createElement('td', { className: 'mono' }, formatTimeShort(r.iniciadoEn)),
                      React.createElement('td', { className: 'mono' }, formatTimeShort(r.finalizadoEn)),
                      React.createElement('td', { className: 'mono' }, formatTime(r.tiempoSeg)),
                      React.createElement('td', { className: 'td-importe' }, formatMoney(r.importe))
                    )
                  )
            )
          )
        )
      )
    ),

    // Acciones
    React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '⚙️ Acciones de caja'),
      React.createElement('div', { className: 'accion-row' },
        React.createElement('button', { className: 'btn-accion btn-success', onClick: () => onExportarCSV('hoy') }, '📥 Exportar CSV del día'),
        React.createElement('button', { className: 'btn-accion btn-danger', onClick: onCerrarCaja }, '🔒 Cerrar caja diaria')
      )
    )
  );
}

// ─────────────────────────────────────────────
// VISTA HISTORIAL COMPLETO
// ─────────────────────────────────────────────
function VistaHistorial({ historial, onExportarCSV, cajasCerradas }) {
  const [tab, setTab] = useState('partidas');
  const [filtroMesa, setFiltroMesa] = useState('todas');

  const registrosFiltrados = filtroMesa === 'todas'
    ? historial
    : historial.filter(r => String(r.mesaId) === filtroMesa);

  // Estadísticas semanales
  const semanaStats = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3);
      const regs = historial.filter(r => r.fecha === key);
      dias.push({ key, label, total: regs.reduce((s, r) => s + r.importe, 0), partidas: regs.length });
    }
    return dias;
  }, [historial]);

  const maxTotal = Math.max(...semanaStats.map(d => d.total), 1);

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
    // Tabs
    React.createElement('div', { className: 'hist-tabs' },
      ['partidas', 'semana', 'cajas'].map(t =>
        React.createElement('button', {
          key: t, className: `hist-tab ${tab === t ? 'active' : ''}`,
          onClick: () => setTab(t)
        }, t === 'partidas' ? '📋 Partidas' : t === 'semana' ? '📈 Semana' : '🔒 Cajas cerradas')
      )
    ),

    tab === 'partidas' && React.createElement('div', null,
      // Filtro mesa
      React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' } },
        React.createElement('button', { className: `hist-tab ${filtroMesa === 'todas' ? 'active' : ''}`, onClick: () => setFiltroMesa('todas') }, 'Todas'),
        MESAS_CONFIG.map(m =>
          React.createElement('button', {
            key: m.id, className: `hist-tab ${filtroMesa === String(m.id) ? 'active' : ''}`,
            onClick: () => setFiltroMesa(String(m.id))
          }, m.nombre)
        )
      ),
      React.createElement('div', { className: 'table-wrap' },
        React.createElement('div', { className: 'table-scroll' },
          React.createElement('table', null,
            React.createElement('thead', null,
              React.createElement('tr', null,
                ['Fecha', 'Mesa', 'Tarifa', 'Inicio', 'Fin', 'Duración', 'Importe'].map(h =>
                  React.createElement('th', { key: h }, h)
                )
              )
            ),
            React.createElement('tbody', null,
              registrosFiltrados.length === 0
                ? React.createElement('tr', null, React.createElement('td', { colSpan: 7, className: 'empty-state' }, 'Sin registros'))
                : [...registrosFiltrados].reverse().map((r, i) =>
                    React.createElement('tr', { key: i },
                      React.createElement('td', { className: 'mono' }, r.fecha),
                      React.createElement('td', { className: 'td-mesa' }, r.mesa),
                      React.createElement('td', { className: 'mono' }, `${r.tarifa} €/h`),
                      React.createElement('td', { className: 'mono' }, formatTimeShort(r.iniciadoEn)),
                      React.createElement('td', { className: 'mono' }, formatTimeShort(r.finalizadoEn)),
                      React.createElement('td', { className: 'mono' }, formatTime(r.tiempoSeg)),
                      React.createElement('td', { className: 'td-importe' }, formatMoney(r.importe))
                    )
                  )
            )
          )
        )
      ),
      React.createElement('div', { style: { marginTop: '12px' } },
        React.createElement('button', { className: 'btn-accion btn-success', onClick: () => onExportarCSV('todo') }, '📥 Exportar todo CSV')
      )
    ),

    tab === 'semana' && React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '📈 Últimos 7 días'),
      React.createElement('div', { className: 'chart-bars' },
        semanaStats.map(d =>
          React.createElement('div', { key: d.key, className: 'chart-bar-wrap' },
            React.createElement('div', { className: 'chart-bar-val' }, d.total > 0 ? `${d.total.toFixed(0)}€` : ''),
            React.createElement('div', {
              className: 'chart-bar',
              style: { height: `${(d.total / maxTotal) * 80}%`, background: d.key === getTodayKey() ? 'var(--gold)' : 'var(--accent)' }
            }),
            React.createElement('div', { className: 'chart-bar-label' }, d.label),
            React.createElement('div', { className: 'chart-bar-label' }, d.partidas > 0 ? `${d.partidas}p` : '')
          )
        )
      ),
      React.createElement('div', { style: { marginTop: '20px' } },
        React.createElement('div', { className: 'stats-grid' },
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-label' }, 'Total semana'),
            React.createElement('div', { className: 'stat-value gold' }, formatMoney(semanaStats.reduce((s, d) => s + d.total, 0)))
          ),
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-label' }, 'Partidas semana'),
            React.createElement('div', { className: 'stat-value green' }, semanaStats.reduce((s, d) => s + d.partidas, 0))
          ),
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-label' }, 'Mejor día'),
            React.createElement('div', { className: 'stat-value accent' },
              semanaStats.reduce((best, d) => d.total > best.total ? d : best, semanaStats[0]).label || '—'
            )
          )
        )
      )
    ),

    tab === 'cajas' && React.createElement('div', null,
      React.createElement('div', { className: 'section-title' }, '🔒 Historial de cierres de caja'),
      React.createElement('div', { className: 'table-wrap' },
        React.createElement('div', { className: 'table-scroll' },
          React.createElement('table', null,
            React.createElement('thead', null,
              React.createElement('tr', null,
                ['Fecha', 'Partidas', 'Tiempo total', 'Total'].map(h =>
                  React.createElement('th', { key: h }, h)
                )
              )
            ),
            React.createElement('tbody', null,
              cajasCerradas.length === 0
                ? React.createElement('tr', null, React.createElement('td', { colSpan: 4, className: 'empty-state' }, 'Sin cierres registrados'))
                : [...cajasCerradas].reverse().map((c, i) =>
                    React.createElement('tr', { key: i },
                      React.createElement('td', { className: 'mono' }, c.fecha),
                      React.createElement('td', null, c.partidas),
                      React.createElement('td', { className: 'mono' }, formatTime(c.tiempoTotal)),
                      React.createElement('td', { className: 'td-importe' }, formatMoney(c.total))
                    )
                  )
            )
          )
        )
      )
    )
  );
}

// ─────────────────────────────────────────────
// APLICACIÓN PRINCIPAL
// ─────────────────────────────────────────────
function App() {
  // ── Estado de las mesas
  const [mesas, setMesas] = useState(() => {
    const saved = LS.get('billartpv_mesas');
    if (saved) {
      // Restaurar temporizadores activos
      return saved.map(m => {
        if (m.estado === 'en-uso' && m.iniciadoEn) {
          const elapsed = Math.floor((Date.now() - m.iniciadoEn) / 1000);
          return { ...m, tiempoSeg: m.tiempoSegBase + elapsed };
        }
        return m;
      });
    }
    return MESAS_CONFIG.map(cfg => ({
      ...cfg, estado: 'libre', tiempoSeg: 0, tiempoSegBase: 0,
      iniciadoEn: null, finalizadoEn: null
    }));
  });

  // ── Historial
  const [historial, setHistorial] = useState(() => LS.get('billartpv_historial', []));
  const [cajasCerradas, setCajasCerradas] = useState(() => LS.get('billartpv_cajas', []));

  // ── UI
  const [vista, setVista] = useState('mesas');
  const [darkMode, setDarkMode] = useState(() => LS.get('billartpv_dark', true));
  const [soundEnabled, setSoundEnabled] = useState(() => LS.get('billartpv_sound', true));
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  // ── Ticker principal (cada segundo)
  const tickerRef = useRef(null);

  const addToast = useCallback((msg, type = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── Aplicar clase light/dark
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    LS.set('billartpv_dark', darkMode);
  }, [darkMode]);

  // ── Persistir mesas
  useEffect(() => {
    LS.set('billartpv_mesas', mesas);
  }, [mesas]);

  // ── Persistir historial
  useEffect(() => {
    LS.set('billartpv_historial', historial);
  }, [historial]);

  useEffect(() => {
    LS.set('billartpv_cajas', cajasCerradas);
  }, [cajasCerradas]);

  useEffect(() => {
    LS.set('billartpv_sound', soundEnabled);
  }, [soundEnabled]);

  // ── Ticker: actualizar temporizadores
  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setMesas(prev => prev.map(m => {
        if (m.estado !== 'en-uso' || !m.iniciadoEn) return m;
        const elapsed = Math.floor((Date.now() - m.iniciadoEn) / 1000);
        return { ...m, tiempoSeg: m.tiempoSegBase + elapsed };
      }));
    }, 1000);
    return () => clearInterval(tickerRef.current);
  }, []);

  // ── Acciones de mesa
  const accionIniciar = useCallback((mesaId) => {
    if (soundEnabled) playStart();
    setMesas(prev => prev.map(m =>
      m.id === mesaId
        ? { ...m, estado: 'en-uso', iniciadoEn: Date.now(), tiempoSegBase: 0, tiempoSeg: 0, finalizadoEn: null }
        : m
    ));
    const mesa = MESAS_CONFIG.find(m => m.id === mesaId);
    addToast(`▶ ${mesa.nombre} iniciada`, 'green');
  }, [soundEnabled, addToast]);

  const accionDetener = useCallback((mesaId) => {
    if (soundEnabled) playStop();
    const ahora = Date.now();
    setMesas(prev => prev.map(m => {
      if (m.id !== mesaId) return m;
      const elapsed = Math.floor((ahora - m.iniciadoEn) / 1000);
      const tiempoFinal = m.tiempoSegBase + elapsed;
      return { ...m, estado: 'finalizada', finalizadoEn: ahora, tiempoSeg: tiempoFinal, tiempoSegBase: tiempoFinal };
    }));
    addToast(`⏹ Mesa detenida`, 'red');
  }, [soundEnabled, addToast]);

  const accionCobrar = useCallback((mesaId) => {
    const m = mesas.find(x => x.id === mesaId);
    if (!m || m.estado !== 'finalizada') return;
    const importe = calcImporte(m.tiempoSeg, m.tarifa);
    setModal({
      type: 'cobrar', mesaId,
      title: `Cobrar — ${m.nombre}`,
      body: `Duración: ${formatTime(m.tiempoSeg)}\nTarifa: ${m.tarifa} €/hora`,
      importe
    });
  }, [mesas]);

  const confirmarCobro = useCallback((mesaId) => {
    const m = mesas.find(x => x.id === mesaId);
    if (!m) return;
    const importe = calcImporte(m.tiempoSeg, m.tarifa);
    const registro = {
      mesaId: m.id, mesa: m.nombre, tarifa: m.tarifa,
      iniciadoEn: m.iniciadoEn, finalizadoEn: m.finalizadoEn,
      tiempoSeg: m.tiempoSeg, importe,
      fecha: getTodayKey(), creadoEn: Date.now()
    };
    setHistorial(prev => [...prev, registro]);
    setMesas(prev => prev.map(x =>
      x.id === mesaId
        ? { ...x, estado: 'libre', tiempoSeg: 0, tiempoSegBase: 0, iniciadoEn: null, finalizadoEn: null }
        : x
    ));
    setModal(null);
    if (soundEnabled) { playBeep(880, 0.1); setTimeout(() => playBeep(1100, 0.15), 150); }
    addToast(`💳 Cobrado ${formatMoney(importe)}`, 'gold');
  }, [mesas, soundEnabled, addToast]);

  const accionReset = useCallback((mesaId) => {
    const m = mesas.find(x => x.id === mesaId);
    if (!m) return;
    if (m.estado === 'libre') return;
    setModal({ type: 'reset', mesaId, title: '¿Resetear mesa?', body: `¿Seguro que quieres resetear ${m.nombre}? Se perderán los datos de esta partida no cobrada.` });
  }, [mesas]);

  const confirmarReset = useCallback((mesaId) => {
    setMesas(prev => prev.map(m =>
      m.id === mesaId
        ? { ...m, estado: 'libre', tiempoSeg: 0, tiempoSegBase: 0, iniciadoEn: null, finalizadoEn: null }
        : m
    ));
    setModal(null);
    addToast('↺ Mesa reseteada', '');
  }, [addToast]);

  // ── Cerrar caja
  const cerrarCaja = useCallback(() => {
    setModal({ type: 'caja', title: 'Cerrar caja diaria', body: '¿Confirmas el cierre de caja? Las estadísticas del día quedarán archivadas.' });
  }, []);

  const confirmarCierreCaja = useCallback(() => {
    const hoy = getTodayKey();
    const registrosHoy = historial.filter(r => r.fecha === hoy);
    const resumen = {
      fecha: hoy, partidas: registrosHoy.length,
      total: registrosHoy.reduce((s, r) => s + r.importe, 0),
      tiempoTotal: registrosHoy.reduce((s, r) => s + r.tiempoSeg, 0),
      cerradoEn: Date.now()
    };
    setCajasCerradas(prev => [...prev, resumen]);
    setModal(null);
    addToast(`🔒 Caja cerrada — ${formatMoney(resumen.total)}`, 'gold');
  }, [historial, addToast]);

  // ── Exportar CSV
  const exportarCSV = useCallback((tipo) => {
    const hoy = getTodayKey();
    const datos = tipo === 'hoy' ? historial.filter(r => r.fecha === hoy) : historial;
    if (datos.length === 0) { addToast('Sin datos para exportar', 'red'); return; }
    const header = 'Fecha,Mesa,Tarifa (€/h),Inicio,Fin,Duración (s),Importe (€)\n';
    const rows = datos.map(r =>
      `${r.fecha},"${r.mesa}",${r.tarifa},` +
      `"${new Date(r.iniciadoEn).toLocaleString('es-ES')}",` +
      `"${new Date(r.finalizadoEn).toLocaleString('es-ES')}",` +
      `${r.tiempoSeg},${r.importe.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `billartpv_${tipo}_${hoy}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('📥 CSV exportado', 'green');
  }, [historial, addToast]);

  // ── Stats header rápidas
  const mesasEnUso = mesas.filter(m => m.estado === 'en-uso').length;
  const totalAcumulado = mesas.filter(m => m.estado === 'en-uso').reduce((s, m) => s + calcImporte(m.tiempoSeg, m.tarifa), 0);
  const hoy = getTodayKey();
  const totalHoy = historial.filter(r => r.fecha === hoy).reduce((s, r) => s + r.importe, 0);

  return React.createElement('div', { className: 'app-wrap' },
    // Header
    React.createElement('header', { className: 'header' },
      React.createElement('div', { className: 'header-brand' },
        React.createElement('div', { className: 'header-logo' }, 'B'),
        React.createElement('div', null,
          React.createElement('div', { className: 'header-title' }, 'BillarTPV'),
          React.createElement('div', { className: 'header-sub' }, `${mesasEnUso} en uso · ${formatMoney(totalHoy)} hoy`)
        )
      ),
      React.createElement('div', { className: 'header-actions' },
        ['mesas', 'caja', 'historial'].map(v =>
          React.createElement('button', {
            key: v, className: `nav-tab ${vista === v ? 'active' : ''}`,
            onClick: () => setVista(v)
          }, v === 'mesas' ? '🎱 Mesas' : v === 'caja' ? '💰 Caja' : '📋 Historial')
        ),
        React.createElement('button', {
          className: 'btn-icon', title: 'Sonido',
          onClick: () => { setSoundEnabled(p => !p); }
        }, soundEnabled ? '🔔' : '🔕'),
        React.createElement('button', {
          className: 'btn-icon', title: 'Modo claro/oscuro',
          onClick: () => setDarkMode(p => !p)
        }, darkMode ? '☀️' : '🌙')
      )
    ),

    // Main content
    React.createElement('main', { className: 'main' },
      vista === 'mesas' && React.createElement('div', null,
        // Mini summary
        totalAcumulado > 0 && React.createElement('div', {
          style: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }
        },
          React.createElement('div', { style: { background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: '0.8rem', fontFamily: 'DM Mono, monospace' } },
            `${mesasEnUso} mesa${mesasEnUso !== 1 ? 's' : ''} activa${mesasEnUso !== 1 ? 's' : ''} · ${formatMoney(totalAcumulado)} en curso`
          )
        ),
        React.createElement('div', { className: 'mesas-grid' },
          mesas.map(mesa =>
            React.createElement(MesaCard, {
              key: mesa.id, mesa,
              onIniciar: () => accionIniciar(mesa.id),
              onDetener: () => accionDetener(mesa.id),
              onReset: () => accionReset(mesa.id),
              onCobrar: () => accionCobrar(mesa.id),
              soundEnabled
            })
          )
        )
      ),

      vista === 'caja' && React.createElement(VistaCaja, {
        historial, onCerrarCaja: cerrarCaja, onExportarCSV: exportarCSV
      }),

      vista === 'historial' && React.createElement(VistaHistorial, {
        historial, cajasCerradas, onExportarCSV: exportarCSV
      })
    ),

    // Modal
    modal && React.createElement(Modal, {
      title: modal.title,
      body: modal.body,
      onCancel: () => setModal(null),
      onConfirm: () => {
        if (modal.type === 'reset') confirmarReset(modal.mesaId);
        else if (modal.type === 'cobrar') confirmarCobro(modal.mesaId);
        else if (modal.type === 'caja') confirmarCierreCaja();
      },
      danger: modal.type === 'reset' || modal.type === 'caja',
      confirmText: modal.type === 'cobrar' ? '✅ Confirmar cobro' : modal.type === 'caja' ? '🔒 Cerrar caja' : '↺ Resetear',
      cancelText: 'Cancelar',
      extra: modal.type === 'cobrar' && React.createElement('div', { className: 'modal-amount' }, formatMoney(modal.importe))
    }),

    // Toasts
    React.createElement(Toasts, { toasts })
  );
}

// ─────────────────────────────────────────────
// INYECTAR CSS GLOBAL Y MONTAR APP
// ─────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = GLOBAL_CSS;
document.head.appendChild(styleEl);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
