export function formatMoney(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}
