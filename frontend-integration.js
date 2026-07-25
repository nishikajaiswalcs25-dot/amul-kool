const API_URL = '/api';
const PRODUCT_ID = 'amul-kool-exotic-rose-200ml';

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Something went wrong.');
  return payload;
}

async function getCartId() {
  let cartId = localStorage.getItem('amulKoolCartId');
  if (!cartId) {
    const created = await api('/carts', { method: 'POST', body: '{}' });
    cartId = created.cart.id;
    localStorage.setItem('amulKoolCartId', cartId);
  }
  return cartId;
}

async function getCart() {
  const cartId = localStorage.getItem('amulKoolCartId');
  if (!cartId) return null;
  try { return (await api(`/carts/${cartId}`)).cart; }
  catch { localStorage.removeItem('amulKoolCartId'); return null; }
}

function money(value) { return `₹${value.toFixed(2)}`; }

function closeCart() { document.getElementById('ak-cart-overlay')?.remove(); }

async function openCart() {
  const cart = await getCart();
  const item = cart?.items?.[0];
  const overlay = document.createElement('div');
  overlay.id = 'ak-cart-overlay';
  overlay.innerHTML = `
    <div class="ak-cart-backdrop"></div>
    <aside class="ak-cart-panel" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button class="ak-close" aria-label="Close cart">×</button>
      <h2>Your cart</h2>
      ${item ? `<div class="ak-item"><div><strong>${item.name}</strong><small>${item.quantity} × ${money(item.price)}</small><button class="ak-remove" data-product-id="${item.productId}">Remove</button></div><strong>${money(cart.subtotal)}</strong></div>
      <p class="ak-total">Total <strong>${money(cart.subtotal)}</strong></p>
      <form id="ak-checkout-form" class="ak-checkout">
        <input name="name" required minlength="2" placeholder="Your name" />
        <input name="email" required type="email" placeholder="Email address" />
        <button type="submit">Place order</button>
      </form>` : `<p class="ak-empty">Your cart is empty. Choose Shop Now to add Amul Kool Exotic Rose.</p>`}
      <p id="ak-cart-message" class="ak-message"></p>
    </aside>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.ak-close').addEventListener('click', closeCart);
  overlay.querySelector('.ak-cart-backdrop').addEventListener('click', closeCart);
  overlay.querySelector('#ak-checkout-form')?.addEventListener('submit', submitOrder);
  overlay.querySelector('.ak-remove')?.addEventListener('click', async (event) => {
    try {
      const cartId = localStorage.getItem('amulKoolCartId');
      await api(`/carts/${cartId}/items/${event.currentTarget.dataset.productId}`, { method: 'DELETE' });
      closeCart(); await openCart();
    } catch (error) { alert(error.message); }
  });
}

async function addToCart() {
  try {
    const cartId = await getCartId();
    await api(`/carts/${cartId}/items`, {
      method: 'POST', body: JSON.stringify({ productId: PRODUCT_ID, quantity: 1 })
    });
    await openCart();
  } catch (error) { alert(error.message); }
}

async function submitOrder(event) {
  event.preventDefault();
  const message = document.getElementById('ak-cart-message');
  const form = event.currentTarget;
  const cartId = localStorage.getItem('amulKoolCartId');
  const button = form.querySelector('button');
  button.disabled = true;
  button.textContent = 'Placing order…';
  try {
    const order = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({ cartId, customer: { name: form.name.value, email: form.email.value } })
    });
    localStorage.removeItem('amulKoolCartId');
    form.remove();
    message.textContent = `Order ${order.order.id} received. We will contact you soon.`;
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = 'Place order';
  }
}

const style = document.createElement('style');
style.textContent = `
  #ak-cart-overlay,#ak-product-overlay,#ak-feature-overlay,#ak-account-overlay{position:fixed;inset:0;z-index:1000;font-family:Arial,sans-serif}
  .ak-cart-backdrop{position:absolute;inset:0;background:rgba(40,23,26,.45)}
  .ak-cart-panel{position:absolute;right:0;top:0;height:100%;width:min(430px,100%);box-sizing:border-box;background:#fff8f7;padding:32px;color:#28171a;box-shadow:-16px 0 40px rgba(0,0,0,.18)}
  .ak-cart-panel h2{margin:0 0 28px;color:#b02047;font-size:28px}.ak-close{position:absolute;right:18px;top:14px;border:0;background:transparent;font-size:32px;cursor:pointer}
  .ak-item{display:flex;justify-content:space-between;border-bottom:1px solid #e0bec1;padding:0 0 18px}.ak-item small{display:block;color:#594043;margin-top:7px}.ak-remove{margin-top:10px;border:0;padding:0;background:transparent;color:#b02047;font-weight:700;text-decoration:underline;cursor:pointer}.ak-total{display:flex;justify-content:space-between;font-size:18px;margin:22px 0}.ak-empty{line-height:1.6;color:#594043}
  .ak-checkout{display:grid;gap:12px}.ak-checkout input{box-sizing:border-box;width:100%;padding:13px;border:1px solid #e0bec1;border-radius:10px;font-size:15px}.ak-checkout button,.ak-primary{border:0;border-radius:999px;padding:14px;background:#b02047;color:#fff;font-weight:700;cursor:pointer}.ak-checkout button:disabled{opacity:.65}.ak-message{line-height:1.5;color:#735c00;font-weight:600}
  .ak-product-image{width:100%;height:190px;object-fit:contain;border-radius:16px;background:#ffe9eb}.ak-product-panel p{color:#594043;line-height:1.55}.ak-product-price{font-size:22px;color:#b02047;font-weight:800}.ak-feature{margin-top:20px;padding:18px;background:#ffe9eb;border-radius:16px;line-height:1.6}.ak-account-switch{margin-top:18px;border:0;background:transparent;color:#b02047;font-weight:700;cursor:pointer;text-decoration:underline}
  .ak-milk-splash{position:fixed;inset:0;z-index:1200;pointer-events:none;overflow:hidden}.ak-milk-splash::before{content:'';position:absolute;left:var(--splash-x);top:var(--splash-y);width:70px;height:70px;background:#fffdf8;border-radius:45% 55% 58% 42% / 50% 42% 58% 50%;transform:translate(-50%,-50%) scale(.15);box-shadow:0 0 0 7px rgba(255,255,255,.75),0 0 25px rgba(255,255,255,.9);animation:ak-splash 1s cubic-bezier(.2,.8,.2,1) forwards}.ak-milk-drop{position:absolute;width:18px;height:18px;background:#fffdf8;border-radius:50%;left:var(--splash-x);top:var(--splash-y);box-shadow:0 0 8px rgba(255,255,255,.9);animation:ak-drop .85s ease-out forwards}.ak-aha{position:absolute;left:var(--splash-x);top:var(--splash-y);transform:translate(-50%,-50%);font:900 34px/1 Arial,sans-serif;letter-spacing:2px;color:#b02047;text-shadow:0 2px 0 #fff,0 0 12px #fff;animation:ak-aha 1s ease-out forwards}@keyframes ak-splash{55%{transform:translate(-50%,-50%) scale(5);opacity:.95}100%{transform:translate(-50%,-50%) scale(6);opacity:0}}@keyframes ak-drop{to{transform:translate(var(--x),var(--y)) scale(.15);opacity:0}}@keyframes ak-aha{0%{opacity:0;transform:translate(-50%,-30%) scale(.4)}25%{opacity:1;transform:translate(-50%,-110%) scale(1.25)}100%{opacity:0;transform:translate(-50%,-230%) scale(1)}}.ak-menu-item{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f0dadd;background:transparent;padding:17px 0;font-size:17px;font-weight:700;color:#b02047;cursor:pointer}
`;
document.head.appendChild(style);

document.querySelector('form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = event.currentTarget.querySelector('input[type="email"]')?.value;
  try {
    const result = await api('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
    alert(result.message);
    event.currentTarget.reset();
  } catch (error) { alert(error.message); }
});

function closeOverlay(id) { document.getElementById(id)?.remove(); }

function openProduct() {
  const image = document.querySelector('img[data-alt]')?.src || '';
  const overlay = document.createElement('div');
  overlay.id = 'ak-product-overlay';
  overlay.innerHTML = `<div class="ak-cart-backdrop"></div><aside class="ak-cart-panel ak-product-panel" role="dialog" aria-modal="true">
    <button class="ak-close" aria-label="Close product">×</button>
    <img class="ak-product-image" src="${image}" alt="Amul Kool Exotic Rose bottle">
    <h2>Amul Kool Exotic Rose</h2><p>Velvety rose refreshment made with real milk. 200 ml chilled bottle.</p>
    <p class="ak-product-price">₹35.00 <small>per bottle</small></p>
    <button class="ak-primary" id="ak-add-product">Add to cart</button>
  </aside>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.ak-close').addEventListener('click', () => closeOverlay('ak-product-overlay'));
  overlay.querySelector('.ak-cart-backdrop').addEventListener('click', () => closeOverlay('ak-product-overlay'));
  overlay.querySelector('#ak-add-product').addEventListener('click', async () => { closeOverlay('ak-product-overlay'); await addToCart(); });
}

function openFeature(title, details) {
  const overlay = document.createElement('div');
  overlay.id = 'ak-feature-overlay';
  overlay.innerHTML = `<div class="ak-cart-backdrop"></div><aside class="ak-cart-panel" role="dialog" aria-modal="true"><button class="ak-close">×</button><h2>${title}</h2><div class="ak-feature">${details}</div></aside>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.ak-close').addEventListener('click', () => closeOverlay('ak-feature-overlay'));
  overlay.querySelector('.ak-cart-backdrop').addEventListener('click', () => closeOverlay('ak-feature-overlay'));
}

function milkSplash(event) {
  const source = event.currentTarget.getBoundingClientRect();
  const x = event.clientX || source.left + source.width / 2;
  const y = event.clientY || source.top + source.height / 2;
  const splash = document.createElement('div');
  splash.className = 'ak-milk-splash';
  splash.style.setProperty('--splash-x', `${x}px`);
  splash.style.setProperty('--splash-y', `${y}px`);
  splash.innerHTML = '<b class="ak-aha">AHA!</b>' + [[-220,-150],[180,-190],[280,40],[-290,70],[80,230],[-120,210]].map(([x, y]) => `<i class="ak-milk-drop" style="--x:${x}px;--y:${y}px"></i>`).join('');
  document.body.appendChild(splash);
  setTimeout(() => splash.remove(), 950);
}

function openAccount() {
  const loggedIn = JSON.parse(localStorage.getItem('amulKoolUser') || 'null');
  const overlay = document.createElement('div');
  overlay.id = 'ak-account-overlay';
  if (loggedIn) {
    overlay.innerHTML = `<div class="ak-cart-backdrop"></div><aside class="ak-cart-panel" role="dialog" aria-modal="true"><button class="ak-close">×</button><h2>My account</h2><p>Signed in as <strong>${loggedIn.name}</strong><br>${loggedIn.email}</p><button class="ak-primary" id="ak-logout">Log out</button></aside>`;
  } else {
    overlay.innerHTML = `<div class="ak-cart-backdrop"></div><aside class="ak-cart-panel" role="dialog" aria-modal="true"><button class="ak-close">×</button><h2 id="ak-account-title">Login</h2><form id="ak-account-form" class="ak-checkout"><input id="ak-name" name="name" placeholder="Your name" style="display:none"><input name="email" type="email" required placeholder="Email address"><input name="password" type="password" required minlength="6" placeholder="Password (minimum 6 characters)"><button type="submit">Login</button></form><button class="ak-account-switch" id="ak-account-switch">New here? Create an account</button><p class="ak-message" id="ak-account-message"></p></aside>`;
  }
  document.body.appendChild(overlay);
  overlay.querySelector('.ak-close').addEventListener('click', () => closeOverlay('ak-account-overlay'));
  overlay.querySelector('.ak-cart-backdrop').addEventListener('click', () => closeOverlay('ak-account-overlay'));
  overlay.querySelector('#ak-logout')?.addEventListener('click', () => { localStorage.removeItem('amulKoolUser'); localStorage.removeItem('amulKoolToken'); closeOverlay('ak-account-overlay'); });
  let mode = 'login';
  overlay.querySelector('#ak-account-switch')?.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    overlay.querySelector('#ak-account-title').textContent = mode === 'login' ? 'Login' : 'Create account';
    overlay.querySelector('#ak-name').style.display = mode === 'login' ? 'none' : 'block';
    overlay.querySelector('#ak-name').required = mode === 'register';
    overlay.querySelector('#ak-account-form button').textContent = mode === 'login' ? 'Login' : 'Create account';
    overlay.querySelector('#ak-account-switch').textContent = mode === 'login' ? 'New here? Create an account' : 'Already have an account? Login';
  });
  overlay.querySelector('#ak-account-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const message = overlay.querySelector('#ak-account-message');
    try {
      const result = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify({ name: form.elements.name.value, email: form.elements.email.value, password: form.elements.password.value }) });
      localStorage.setItem('amulKoolUser', JSON.stringify(result.user)); localStorage.setItem('amulKoolToken', result.token);
      message.textContent = `Welcome, ${result.user.name}!`; setTimeout(() => closeOverlay('ak-account-overlay'), 700);
    } catch (error) { message.textContent = error.message; }
  });
}

function openMenu() {
  const overlay = document.createElement('div');
  overlay.id = 'ak-menu-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1100;font-family:Arial,sans-serif';
  overlay.innerHTML = `<div class="ak-cart-backdrop"></div><aside class="ak-cart-panel" role="dialog" aria-modal="true"><button class="ak-close">×</button><h2>Explore Amul Kool</h2><button class="ak-menu-item" data-go="home">Home</button><button class="ak-menu-item" data-go="product">Product</button><button class="ak-menu-item" data-go="nutrition">Nutrition Facts</button><button class="ak-menu-item" data-go="enjoy">How to Enjoy</button><button class="ak-menu-item" data-go="account">Account / Login</button></aside>`;
  document.body.appendChild(overlay);
  const close = () => closeOverlay('ak-menu-overlay');
  overlay.querySelector('.ak-close').addEventListener('click', close);
  overlay.querySelector('.ak-cart-backdrop').addEventListener('click', close);
  overlay.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.go; close();
    if (target === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (target === 'product') openProduct();
    if (target === 'account') openAccount();
    if (target === 'nutrition' || target === 'enjoy') {
      const pattern = target === 'nutrition' ? /Nutrition Facts/i : /How to Enjoy/i;
      document.querySelectorAll('h2').forEach((heading) => { if (pattern.test(heading.textContent)) heading.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    }
  }));
}

const featureDetails = {
  'Learn more': ['Real Rose Petals', 'Natural rose extracts bring a light floral aroma and signature blush to every chilled sip.'],
  'Strength details': ['Calcium Rich', 'Each 200 ml serving is presented with 240 mg of calcium to support everyday bone health.'],
  'Explore energy': ['Instant Energy', 'A creamy dairy refreshment designed as a convenient pick-me-up for busy days.']
};

[...document.querySelectorAll('div')].forEach((element) => {
  const label = element.textContent.trim().replace(/\s+chevron_right$/, '');
  if (featureDetails[label] && element.children.length <= 2) { element.style.cursor = 'pointer'; element.addEventListener('click', () => openFeature(...featureDetails[label])); }
});

[...document.querySelectorAll('.material-symbols-outlined')]
  .filter((icon) => icon.textContent.trim() === 'celebration')
  .forEach((icon) => {
    const trigger = icon.parentElement;
    trigger.style.cursor = 'pointer';
    trigger.title = 'Tap for a milk splash';
    trigger.addEventListener('click', milkSplash);
  });

const bottomNavActions = {
  home: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  bubble_chart: () => openFeature('Pure Quality', 'Real rose extracts, calcium-rich milk, and a refreshing Exotic Rose flavour in every bottle.'),
  local_bar: () => [...document.querySelectorAll('h2')].find((heading) => /How to Enjoy/i.test(heading.textContent))?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  person: openAccount
};

[...document.querySelectorAll('.material-symbols-outlined')].forEach((icon) => {
  const action = bottomNavActions[icon.textContent.trim()];
  if (!action) return;
  const button = icon.closest('button');
  if (!button) return;
  button.style.cursor = 'pointer';
  button.addEventListener('click', action);
});

[...document.querySelectorAll('button')].forEach((button) => {
  const label = button.textContent.trim();
  if (/shop now/i.test(label)) button.addEventListener('click', openProduct);
  if (/add_shopping_cart/i.test(label)) button.addEventListener('click', addToCart);
  if (/shopping_bag/i.test(label)) button.addEventListener('click', openCart);
  if (/menu/i.test(label)) button.addEventListener('click', openMenu);
  if (/account\s*\/\s*login/i.test(label)) button.addEventListener('click', openAccount);
});
