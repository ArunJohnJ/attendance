// ── Session helpers ───────────────────────────────────────────────────────────

function saveSession(token) {
  localStorage.setItem('token', token);
}

function clearSession() {
  localStorage.removeItem('token');
}

function getToken() {
  return localStorage.getItem('token');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
// Each page styles #toast differently via CSS; this just toggles the class.

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
