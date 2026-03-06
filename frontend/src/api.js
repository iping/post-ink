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

// ----- Reviews -----
export async function getReviews(params = {}) {
  const q = new URLSearchParams(params);
  const url = `${API}/reviews` + (q.toString() ? `?${q}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getArtistReviewSummary(artistId) {
  const res = await fetch(`${API}/reviews/artist/${artistId}/summary`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createReview(data) {
  const res = await fetch(`${API}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteReview(id) {
  const res = await fetch(`${API}/reviews/${id}`, { method: 'DELETE' });
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
