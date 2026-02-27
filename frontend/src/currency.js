const IDR_TO_USD = 0.000063;

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
