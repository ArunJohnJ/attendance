// ── Session helpers ───────────────────────────────────────────────────────────

function saveSession(token) {
  localStorage.setItem('token', token);
}

function clearSession() {
  localStorage.removeItem('token');
  // Remove legacy keys if present
  localStorage.removeItem('role');
  localStorage.removeItem('email');
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
 * Returns the role embedded in the JWT ('ADMIN', 'SUPER-ADMIN', 'teacher', …)
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
 * Returns the email embedded in the JWT, or null.
 */
function getEmailFromToken() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return (payload && payload.email) ? payload.email : null;
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
