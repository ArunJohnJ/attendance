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
