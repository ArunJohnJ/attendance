// ── api.js — Centralised fetch helper ─────────────────────────────────────────
// Depends on auth.js (getToken, clearSession, getEmailFromToken) — load auth.js first.
//
// When auth=true (default):
//   • Authorization: Bearer <token>  header added from localStorage
//   • caller's email injected into every authenticated request body as { email }
//     — even when no body was originally passed (e.g. GET-style calls) —
//     so the backend audit log always captures who made the call
//   Pass auth:false for public/unauthenticated endpoints (e.g. LOGIN, SUMMARY)

/**
 * @param {string}  url
 * @param {object}  [options]
 * @param {string}  [options.method]       - HTTP method; defaults to 'POST' when body present, else 'GET'
 * @param {object}  [options.queryParams]  - Key/value pairs appended as a query string
 * @param {object}  [options.body]         - Request body — serialised to JSON automatically
 * @param {boolean} [options.auth=true]    - Include Authorization: Bearer <token> header
 * @returns {Promise<any>}
 */
/**
 * Redirect to the appropriate login page based on the current page,
 * then stop all further execution by throwing.
 */
function _redirectToLogin(reason) {
  clearSession();
  sessionStorage.setItem('authError', reason);
  const isAdmin = location.pathname.includes('admin-dashboard');
  location.replace(isAdmin ? 'admin.html' : 'teachers.html');
  throw new Error('Session expired. Please log in again.');
}

async function apiCall(url, { method, queryParams, body, auth = true } = {}) {
  // ── Proactive token-expiry check ─────────────────────────────────────────
  // Check BEFORE the network call so the redirect is immediate and never
  // races with a catch block in the calling page.
  if (auth && isTokenExpired()) {
    _redirectToLogin('tokenExpired');
  }

  // Build URL with optional query params
  if (queryParams && Object.keys(queryParams).length > 0) {
    url = `${url}?${new URLSearchParams(queryParams)}`;
  }

  // Build headers
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken(); // from auth.js
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject caller email into body for every authenticated request.
  // Even if no body was provided, create one with just { email } so the
  // audit log in BaseHandler always captures the caller.
  // Exception: if body is an array, skip email injection (can't spread into array).
  let finalBody = body;
  if (auth) {
    const callerEmail = getEmailFromToken(); // from auth.js
    if (callerEmail && !Array.isArray(body)) {
      finalBody = { ...(body ?? {}), email: callerEmail };
    }
  }

  // Resolve method
  const resolvedMethod = method ?? (finalBody !== undefined ? 'POST' : 'GET');

  // Execute
  const response = await fetch(url, {
    method: resolvedMethod,
    headers,
    ...(finalBody !== undefined ? { body: JSON.stringify(finalBody) } : {}),
  });

  // 401 — expired / invalid token
  if (response.status === 401) {
    _redirectToLogin('tokenExpired');
  }

  // Other non-2xx
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return response.json();
}

// ══════════════════════════════════════════════════════════════════
//  btnSpinner — animated spinner on any button during an API call
//
//  const stop = btnSpinner(btn);
//  try { await apiCall(...); } finally { stop(); }
// ══════════════════════════════════════════════════════════════════

function btnSpinner(btn) {
  if (!btn) return () => {};
  const originalHTML     = btn.innerHTML;
  const originalDisabled = btn.disabled;
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;justify-content:center">` +
    `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;` +
    `border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;` +
    `animation:_bspin 0.65s linear infinite;flex-shrink:0"></span>` +
    `Loading\u2026</span>`;
  if (!document.getElementById('_bspinStyle')) {
    const s = document.createElement('style');
    s.id = '_bspinStyle';
    s.textContent = '@keyframes _bspin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
  return () => { btn.innerHTML = originalHTML; btn.disabled = originalDisabled; };
}
