const API_BASE = import.meta.env.VITE_API_URL || '';
export const API = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';
const AUTH_TOKEN_KEY = 'postink_auth_token';

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getArtists(opts = {}) {
  const params = new URLSearchParams();
  if (opts.activeOnly) params.set('activeOnly', 'true');
  const qs = params.toString();
  const url = qs ? `${API}/artists?${qs}` : `${API}/artists`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getArtist(id) {
  const res = await fetch(`${API}/artists/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createArtist(formData) {
  const res = await fetch(`${API}/artists`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateArtist(id, formData) {
  const res = await fetch(`${API}/artists/${id}`, {
    method: 'PATCH',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateArtistStatus(id, isActive) {
  const fd = new FormData();
  fd.append('isActive', isActive ? 'true' : 'false');
  return updateArtist(id, fd);
}

export async function deleteArtist(id) {
  const res = await fetch(`${API}/artists/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function getAvailability(artistId, from, to) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const url = `${API}/artists/${artistId}/availability` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addAvailability(artistId, slotOrSlots) {
  const body = Array.isArray(slotOrSlots) ? { slots: slotOrSlots } : slotOrSlots;
  const res = await fetch(`${API}/artists/${artistId}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateAvailabilitySlot(artistId, slotId, data) {
  const res = await fetch(`${API}/artists/${artistId}/availability/${slotId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAvailabilitySlot(artistId, slotId) {
  const res = await fetch(`${API}/artists/${artistId}/availability/${slotId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export function uploadUrl(path) {
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

// ----- Studio: Bookings -----
export async function getBookings(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/bookings` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBooking(id) {
  const res = await fetch(`${API}/bookings/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createBooking(data) {
  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateBooking(id, data) {
  const res = await fetch(`${API}/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteBooking(id) {
  const res = await fetch(`${API}/bookings/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ----- Projects (after booking: fixed or hourly rate) -----
export async function getProjects(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/projects` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProject(data) {
  const res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProject(id, data) {
  const res = await fetch(`${API}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProject(id) {
  const res = await fetch(`${API}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ----- Sessions (each project has minimum 1 session) -----
export async function getSessions(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/sessions` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createSession(data) {
  const res = await fetch(`${API}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateSession(id, data) {
  const res = await fetch(`${API}/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSession(id) {
  const res = await fetch(`${API}/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// POST /api/uploads/preference — max 3 images, 2MB each. Returns { urls: string[] }.
export async function uploadPreferenceImages(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }
  const res = await fetch(`${API}/uploads/preference`, {
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
  const res = await fetch(`${API}/uploads/payment-evidence`, {
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
  const q = new URLSearchParams(params);
  const url = `${API}/payments` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createPayment(data) {
  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePayment(id, data) {
  const res = await fetch(`${API}/payments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePayment(id) {
  const res = await fetch(`${API}/payments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ----- Customers & Studios (for dropdowns) -----
export async function getCustomers(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, value);
  });
  const url = q.toString() ? `${API}/customers?${q}` : `${API}/customers`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createCustomer(data) {
  const res = await fetch(`${API}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCustomer(id, data) {
  const res = await fetch(`${API}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCustomer(id) {
  const res = await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function getStudios() {
  const res = await fetch(`${API}/studios`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createStudio(data) {
  const res = await fetch(`${API}/studios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ----- Studio commissions (artist–studio % agreement) -----
export async function getCommissions(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/commissions` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createCommission(data) {
  const res = await fetch(`${API}/commissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCommission(id, data) {
  const res = await fetch(`${API}/commissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCommission(id) {
  const res = await fetch(`${API}/commissions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
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

// ----- Specialities (master list CMS) -----
export async function getSpecialities() {
  const res = await fetch(`${API}/specialities`);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createSpeciality(data) {
  const res = await fetch(`${API}/specialities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updateSpeciality(id, data) {
  const res = await fetch(`${API}/specialities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteSpeciality(id) {
  const res = await fetch(`${API}/specialities/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res));
}

// ----- Payment destinations (where booking fee can be paid) -----
export async function getPaymentDestinations(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/payment-destinations` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createPaymentDestination(data) {
  const res = await fetch(`${API}/payment-destinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updatePaymentDestination(id, data) {
  const res = await fetch(`${API}/payment-destinations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deletePaymentDestination(id) {
  const res = await fetch(`${API}/payment-destinations/${id}`, { method: 'DELETE' });
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
  const res = await fetch(`${API}/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function getUser(id) {
  const res = await fetch(`${API}/users/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function createUser(data) {
  const res = await fetch(`${API}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updateUser(id, data) {
  const res = await fetch(`${API}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res));
}
