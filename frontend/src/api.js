const API = '/api';

export async function getArtists() {
  const res = await fetch(`${API}/artists`);
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
export async function getCustomers() {
  const res = await fetch(`${API}/customers`);
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
