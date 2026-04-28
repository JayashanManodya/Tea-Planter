export const PAYHERE_PENDING_KEY = 'teaplanter_payhere_pending';
export const PAYHERE_ORDER_ID_KEY = 'teaplanter_payhere_order_id';

export function setPayHerePendingFlags() {
  sessionStorage.setItem(PAYHERE_PENDING_KEY, '1');
  localStorage.setItem(PAYHERE_PENDING_KEY, '1');
}

export function clearPayHerePendingFlags() {
  sessionStorage.removeItem(PAYHERE_PENDING_KEY);
  localStorage.removeItem(PAYHERE_PENDING_KEY);
}

export function isPayHerePendingReturn() {
  return (
    sessionStorage.getItem(PAYHERE_PENDING_KEY) === '1' ||
    localStorage.getItem(PAYHERE_PENDING_KEY) === '1'
  );
}
