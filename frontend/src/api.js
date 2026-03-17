const API_BASE = import.meta.env.VITE_API_URL || '';
export const API = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';
const AUTH_TOKEN_KEY = 'postink_auth_token';

let _apiStudioId = null;
export function setApiStudioId(id) {
  _apiStudioId = id;
}
export function getApiStudioId() {
  return _apiStudioId;
}

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mergeStudioParams(params) {
  const p = { ...params };
  if (_apiStudioId) p.studioId = _apiStudioId;
  return p;
}

async function apiFetch(url, options = {}) {
  const headers = { ...authHeaders(), ...options.headers };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function getArtists(opts = {}) {
  const params = mergeStudioParams(opts);
  const q = new URLSearchParams();
  if (params.activeOnly) q.set('activeOnly', 'true');
  if (params.studioId) q.set('studioId', params.studioId);
  const qs = q.toString();
  const url = qs ? `${API}/artists?${qs}` : `${API}/artists`;
  const res = await apiFetch(url);
  return res.json();
}

export async function getArtist(id) {
  const q = _apiStudioId ? `?studioId=${_apiStudioId}` : '';
  const res = await apiFetch(`${API}/artists/${id}${q}`);
  return res.json();
}

export async function createArtist(formData) {
  const res = await apiFetch(`${API}/artists`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function updateArtist(id, formData) {
  const res = await apiFetch(`${API}/artists/${id}`, {
    method: 'PATCH',
    body: formData,
  });
  return res.json();
}

export async function updateArtistStatus(id, isActive) {
  const fd = new FormData();
  fd.append('isActive', isActive ? 'true' : 'false');
  return updateArtist(id, fd);
}

export async function deleteArtist(id) {
  await apiFetch(`${API}/artists/${id}`, { method: 'DELETE' });
}

export async function getAvailability(artistId, from, to) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (_apiStudioId) q.set('studioId', _apiStudioId);
  const url = `${API}/artists/${artistId}/availability` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function addAvailability(artistId, slotOrSlots) {
  const body = Array.isArray(slotOrSlots) ? { slots: slotOrSlots } : slotOrSlots;
  const res = await apiFetch(`${API}/artists/${artistId}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateAvailabilitySlot(artistId, slotId, data) {
  const res = await apiFetch(`${API}/artists/${artistId}/availability/${slotId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAvailabilitySlot(artistId, slotId) {
  await apiFetch(`${API}/artists/${artistId}/availability/${slotId}`, { method: 'DELETE' });
}

export function uploadUrl(path) {
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

// ----- Studio: Bookings -----
export async function getBookings(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/bookings` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function getBooking(id) {
  const q = _apiStudioId ? `?studioId=${_apiStudioId}` : '';
  const res = await apiFetch(`${API}/bookings/${id}${q}`);
  return res.json();
}

export async function createBooking(data) {
  const res = await apiFetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBooking(id, data) {
  const res = await apiFetch(`${API}/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteBooking(id) {
  await apiFetch(`${API}/bookings/${id}`, { method: 'DELETE' });
}

// ----- Projects (after booking: fixed or hourly rate) -----
export async function getProjects(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/projects` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function createProject(data) {
  const res = await apiFetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProject(id, data) {
  const res = await apiFetch(`${API}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProject(id) {
  await apiFetch(`${API}/projects/${id}`, { method: 'DELETE' });
}

// ----- Sessions (each project has minimum 1 session) -----
export async function getSessions(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/sessions` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function createSession(data) {
  const res = await apiFetch(`${API}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSession(id, data) {
  const res = await apiFetch(`${API}/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSession(id) {
  await apiFetch(`${API}/sessions/${id}`, { method: 'DELETE' });
}

// POST /api/uploads/preference — max 3 images, 2MB each. Returns { urls: string[] }.
export async function uploadPreferenceImages(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }
  const res = await apiFetch(`${API}/uploads/preference`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Upload failed');
  }
  return res.json();
}

// POST /api/uploads/payment-evidence — 1 image, max 2MB. Returns { url: string }.
export async function uploadPaymentEvidence(file) {
  const formData = new FormData();
  formData.append('evidence', file);
  const res = await apiFetch(`${API}/uploads/payment-evidence`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Upload failed');
  }
  return res.json();
}

// ----- Studio: Payments -----
export async function getPayments(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/payments` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function createPayment(data) {
  const res = await apiFetch(`${API}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updatePayment(id, data) {
  const res = await apiFetch(`${API}/payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePayment(id) {
  await apiFetch(`${API}/payments/${id}`, { method: 'DELETE' });
}

// ----- Customers & Studios (for dropdowns) -----
export async function getCustomers(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams();
  Object.entries(p).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, value);
  });
  const url = q.toString() ? `${API}/customers?${q}` : `${API}/customers`;
  const res = await apiFetch(url);
  return res.json();
}

export async function createCustomer(data) {
  const res = await apiFetch(`${API}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCustomer(id, data) {
  const res = await apiFetch(`${API}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCustomer(id) {
  await apiFetch(`${API}/customers/${id}`, { method: 'DELETE' });
}

/** Link customer to the current studio (add to one more studio). */
export async function addCustomerToStudio(customerId) {
  const res = await apiFetch(`${API}/customers/${customerId}/studios`, { method: 'POST' });
  return res.json();
}

export async function getStudios() {
  const res = await apiFetch(`${API}/studios`);
  return res.json();
}

export async function createStudio(data) {
  const res = await apiFetch(`${API}/studios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getStudio(id) {
  const res = await apiFetch(`${API}/studios/${id}`);
  return res.json();
}

export async function updateStudio(id, data) {
  const res = await apiFetch(`${API}/studios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ----- Studio commissions (artist–studio % agreement) -----
export async function getCommissions(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/commissions` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  return res.json();
}

export async function createCommission(data) {
  const res = await apiFetch(`${API}/commissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCommission(id, data) {
  const res = await apiFetch(`${API}/commissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCommission(id) {
  await apiFetch(`${API}/commissions/${id}`, { method: 'DELETE' });
}

// Parse error body: use JSON { error } if present, else raw text
async function errorMessage(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === 'string') return j.error;
  } catch {}
  return text || res.statusText || 'Request failed';
}

// ----- Specialities (per-studio CMS) -----
export async function getSpecialities() {
  const p = mergeStudioParams({});
  const q = new URLSearchParams(p);
  const url = q.toString() ? `${API}/specialities?${q}` : `${API}/specialities`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createSpeciality(data) {
  const res = await apiFetch(`${API}/specialities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updateSpeciality(id, data) {
  const res = await apiFetch(`${API}/specialities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteSpeciality(id) {
  const res = await apiFetch(`${API}/specialities/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res));
}

// ----- Payment destinations (where booking fee can be paid) -----
export async function getPaymentDestinations(params = {}) {
  const p = mergeStudioParams(params);
  const q = new URLSearchParams(p);
  const url = `${API}/payment-destinations` + (q.toString() ? `?${q}` : '');
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createPaymentDestination(data) {
  const res = await apiFetch(`${API}/payment-destinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updatePaymentDestination(id, data) {
  const res = await apiFetch(`${API}/payment-destinations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deletePaymentDestination(id) {
  const res = await apiFetch(`${API}/payment-destinations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res));
}

// ----- Auth & Users (require login) -----
export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

export async function getUsers() {
  const res = await apiFetch(`${API}/users`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function getUser(id) {
  const res = await apiFetch(`${API}/users/${id}`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createUser(data) {
  const res = await apiFetch(`${API}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updateUser(id, data) {
  const res = await apiFetch(`${API}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteUser(id) {
  const res = await apiFetch(`${API}/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res));
}
