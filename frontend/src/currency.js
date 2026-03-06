const IDR_TO_USD = 0.000063;

/** Format digits with "." as thousand separator (e.g. 500000 -> "500.000") */
export function formatNumberWithDots(value) {
  if (value == null || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** From input string (with dots or not), return digits-only string for state */
export function parseNumberInput(str) {
  if (str == null || str === '') return '';
  return String(str).replace(/\D/g, '');
}

export function formatRupiah(amount) {
  if (amount == null) return '—';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

export function rupiahToUsd(amount) {
  if (amount == null) return null;
  return Number(amount) * IDR_TO_USD;
}

export function formatUsd(amount) {
  if (amount == null) return '—';
  return '$ ' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatWithConversion(amount) {
  if (amount == null) return '—';
  const rp = formatRupiah(amount);
  const usd = formatUsd(rupiahToUsd(amount));
  return { rp, usd };
}
