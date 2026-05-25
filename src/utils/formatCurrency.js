export function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHours(value) {
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat`;
}
