// ── Session helpers ───────────────────────────────────────────────────────────

function saveSession(token) {
  localStorage.setItem('token', token);
}

function clearSession() {
  localStorage.removeItem('token');
  // Remove legacy keys if present
  localStorage.removeItem('role');
  localStorage.removeItem('email');
  // Clear session flags
  sessionStorage.removeItem('authenticated');
  sessionStorage.removeItem('adminAuthenticated');
  sessionStorage.removeItem('adminEmail');
  sessionStorage.removeItem('adminRole');
}

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Decodes the JWT payload (without verifying signature — verification happens
 * server-side on every protected API call). Returns the parsed payload or null.
 */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    // Base64url → Base64 → JSON
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the JWT token is expired or invalid.
 */
function isTokenExpired() {
  const token = getToken();
  if (!token) return true;
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  // exp is in seconds; Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

/**
 * Returns the role embedded in the JWT ('ADMIN', 'SUPER-ADMIN', 'TEACHER', …)
 * or null if no valid token exists.
 * Because the JWT is server-signed, the client cannot change this value
 * without the server rejecting all subsequent API calls.
 */
function getRoleFromToken() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return (payload && payload.role) ? payload.role : null;
}

/**
 * Returns the class embedded in the JWT, or null.
 */
function getClassFromToken() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return (payload && payload.class) ? payload.class : null;
}

/**
 * Returns the email embedded in the JWT, or null.
 */
function getEmailFromToken() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return (payload && payload.email) ? payload.email : null;
}

/**
 * Role-based page guard.
 * Call once at the top of each protected page (before any rendering).
 *
 * @param {string[]} allowedRoles  - Roles permitted on this page, e.g. ['ADMIN','SUPER-ADMIN']
 * @param {string}   loginPage     - Page to redirect to on failure, e.g. 'admin.html'
 *
 * If the token is missing, expired, or carries the wrong role:
 *   1. Clears all session data
 *   2. Redirects to loginPage immediately
 *
 * Otherwise sets the appropriate sessionStorage flag and returns normally.
 */
function requireRole(allowedRoles, loginPage) {
  const token = getToken();
  const role  = token ? getRoleFromToken() : null;

  if (!token || isTokenExpired() || !role || !allowedRoles.includes(role)) {
    clearSession();
    // Preserve a redirect reason so the login page can show a message
    sessionStorage.setItem('authError',
      !token || !role ? 'notLoggedIn' : isTokenExpired() ? 'tokenExpired' : 'wrongRole');
    location.replace(loginPage);
    // Stop further script execution on this page
    throw new Error('Auth redirect');
  }

  // Stamp the appropriate sessionStorage flag
  if (allowedRoles.some(r => r === 'ADMIN' || r === 'SUPER-ADMIN')) {
    sessionStorage.setItem('adminAuthenticated', '1');
  } else {
    sessionStorage.setItem('authenticated', '1');
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
// Each page styles #toast differently via CSS; this just toggles the class.

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(t._hideTimer);
  t.textContent = msg;
  t.classList.add('show');
  t._hideTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/** Shows a toast that stays until showToast() or hideToast() is called. */
function showToastPersistent(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(t._hideTimer);
  t.textContent = msg;
  t.classList.add('show');
}

function hideToast() {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(t._hideTimer);
  t.classList.remove('show');
}

// ── Google OAuth login helpers (shared by teachers.html & admin.html) ─────────
// Requires: config.js, api.js, and the GIS <script> to be loaded on the page.
// Each login page must have: #google-btn, #err-msg, #toast elements.

const GOOGLE_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
  </svg> Sign in with Google`;

function setError(msg) {
  document.getElementById('err-msg').textContent = msg;
}

function resetBtn() {
  const btn = document.getElementById('google-btn');
  btn.disabled = false;
  btn.innerHTML = GOOGLE_ICON_SVG;
}

function logout() {
  clearSession();
  location.href = 'index.html';
}

/**
 * Show auth-error toast if redirected here from a protected page.
 * @param {string} roleLabel - e.g. 'Teacher' or 'Admin'
 */
function showAuthErrorToast(roleLabel) {
  const err = sessionStorage.getItem('authError');
  if (!err) return;
  sessionStorage.removeItem('authError');
  const msgs = {
    wrongRole:    `⛔ Access denied — ${roleLabel} login required`,
    tokenExpired: '⏱️ Session expired — please log in again',
    notLoggedIn:  '🔒 Please log in to continue',
  };
  window.addEventListener('DOMContentLoaded', () =>
    showToast(msgs[err] || '🔒 Please log in to continue', 4000));
}

/**
 * Handle the OAuth redirect: if ?code= is in the URL, exchange it for a token.
 * @param {object}   opts
 * @param {function} opts.onSuccess - called with the API response data
 * @param {string}   opts.errorMsg  - message shown when role doesn't match
 */
function handleOAuthRedirect({ onSuccess, errorMsg }) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;

  window.history.replaceState({}, '', window.location.pathname);

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('google-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    showToast('🔄 Verifying…');
    const stopSpin = btnSpinner(btn);

    apiCall(APP_CONFIG.LAMBDA_URLS.LOGIN, { body: { code, redirectUri: window.location.origin + window.location.pathname }, auth: false })
      .then(data => onSuccess(data))
      .catch(err => {
        stopSpin();
        setError(err.message || 'Login failed. Please try again.');
        resetBtn();
      });
  });
}

// ── Google OAuth client (redirect mode — works on iOS Safari) ────────────────
let _googleClient = null;

function login() {
  const btn = document.getElementById('google-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  setError('');

  if (!_googleClient) {
    _googleClient = google.accounts.oauth2.initCodeClient({
      client_id: APP_CONFIG.GOOGLE_CLIENT_NAME,
      scope: 'openid email',
      ux_mode: 'redirect',
      redirect_uri: window.location.origin + window.location.pathname,
    });
  }
  _googleClient.requestCode();
}
