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

export function getDeviceHistory(id) {
  return fetch(`${BASE}/${id}/history`, { headers: authHeaders() }).then(handle);
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

export function listDocuments(id) {
  return fetch(`${BASE}/${id}/documents`, { headers: authHeaders() }).then(handle);
}

export function uploadDocument(id, kind, file) {
  const qs = new URLSearchParams({ kind, filename: file.name });
  return fetch(`${BASE}/${id}/documents?${qs}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/octet-stream' }),
    body: file,
  }).then(handle);
}

export function deleteDocument(id, docId) {
  return fetch(`${BASE}/${id}/documents/${docId}`, { method: 'DELETE', headers: authHeaders() }).then(handle);
}

// Files require the auth header, so they are fetched as blobs instead of linked directly.
export async function fetchDocumentBlob(id, docId) {
  const res = await fetch(`${BASE}/${id}/documents/${docId}/file`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Greška (${res.status})`);
  return res.blob();
}
