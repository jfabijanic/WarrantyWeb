import { getToken, clearSession } from './auth';

const BASE = '/api/devices';

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function handle(res) {
  if (res.status === 401) {
    // Session expired or invalid - clear it and force a reload back to the login screen.
    clearSession();
    window.location.reload();
    throw new Error('Sesija je istekla. Prijavi se ponovno.');
  }
  if (!res.ok) {
    let message = `Greška (${res.status})`;
    try {
      const data = await res.json();
      if (data.errors) message = data.errors.join(' ');
      else if (data.error) message = data.error;
    } catch {
      // ignore json parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listDevices() {
  return fetch(BASE, { headers: authHeaders() }).then(handle);
}

export function getSummary() {
  return fetch(`${BASE}/summary`, { headers: authHeaders() }).then(handle);
}

export function getDevice(id) {
  return fetch(`${BASE}/${id}`, { headers: authHeaders() }).then(handle);
}

export function createDevice(payload) {
  return fetch(BASE, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  }).then(handle);
}

export function updateDevice(id, payload) {
  return fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  }).then(handle);
}

export function deleteDevice(id) {
  return fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle);
}
