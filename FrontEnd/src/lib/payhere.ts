type PayHereSession = Record<string, string>;

export function submitPayHereCheckout(session: PayHereSession) {
  const checkoutUrl = session.sandbox_url || 'https://sandbox.payhere.lk/pay/checkout';
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkoutUrl;
  form.style.display = 'none';

  Object.entries(session).forEach(([key, value]) => {
    if (key === 'sandbox_url') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value ?? '';
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
