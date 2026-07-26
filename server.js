const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function loadEnvironmentFile() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnvironmentFile();
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, 'data.json');
const FRONTEND_FILE = path.join(__dirname, 'final amul kool website with backend.html');
const INTEGRATION_FILE = path.join(__dirname, 'frontend-integration.js');
const PRODUCT = {
  id: 'amul-kool-exotic-rose-200ml',
  name: 'Amul Kool Exotic Rose',
  size: '200 ml',
  price: 35,
  currency: 'INR',
  inStock: true
};

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not read data.json:', error.message);
    return { subscribers: [], carts: {}, orders: [] };
  }
}

let data = loadData();
data.users ??= [];
const sessions = new Map();

function saveData() {
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(body));
}

function sendFile(response, filePath, contentType) {
  fs.readFile(filePath, (error, content) => {
    if (error) return sendJson(response, 500, { error: 'Unable to load the website.' });
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
}

function getBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Body must be valid JSON.')); }
    });
  });
}

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

async function sendSubscriptionEmail(email) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;
  const senderName = process.env.BREVO_SENDER_NAME || 'Amul Kool';
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: 'Welcome to the Amul Kool Rose Club!',
      htmlContent: `<main style="font-family:Arial,sans-serif;color:#28171a"><h1 style="color:#b02047">Welcome to the Rose Club!</h1><p>Thanks for joining Amul Kool.</p><p>You will be the first to hear about exclusive offers, recipes, and new flavours.</p><p style="font-weight:bold">Stay cool,<br>Amul Kool</p></main>`
    })
  });
  if (!response.ok) throw new Error(`Brevo email request failed (${response.status}).`);
  return true;
}

function getCart(cartId) {
  return data.carts[cartId] || { id: cartId, items: [] };
}

function cartSummary(cart) {
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  return { ...cart, quantity, subtotal, currency: 'INR' };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (request.method === 'OPTIONS') return sendJson(response, 204, {});

  try {
    if (request.method === 'GET' && pathname === '/') {
      return sendFile(response, FRONTEND_FILE, 'text/html; charset=utf-8');
    }

    if (request.method === 'GET' && pathname === '/frontend-integration.js') {
      return sendFile(response, INTEGRATION_FILE, 'application/javascript; charset=utf-8');
    }

    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, { ok: true, service: 'amul-kool-backend' });
    }

    if (request.method === 'GET' && pathname === '/api/products') {
      return sendJson(response, 200, { products: [PRODUCT] });
    }

    if (request.method === 'POST' && pathname === '/api/newsletter') {
      const { email } = await getBody(request);
      if (!validEmail(email)) return sendJson(response, 400, { error: 'Please provide a valid email address.' });
      const normalizedEmail = email.trim().toLowerCase();
      const exists = data.subscribers.some((subscriber) => subscriber.email === normalizedEmail);
      if (!exists) {
        data.subscribers.push({ email: normalizedEmail, subscribedAt: new Date().toISOString() });
        saveData();
      }
      try {
        const sent = await sendSubscriptionEmail(normalizedEmail);
        const message = sent ? 'You are on the notification list. Check your inbox for a welcome email.' : 'You are on the notification list. Email delivery will activate once Brevo is configured.';
        return sendJson(response, 201, { message, alreadySubscribed: exists, emailSent: sent });
      } catch (error) {
        console.error('Brevo email error:', error.message);
        return sendJson(response, 502, { error: 'Your email was saved, but the confirmation email could not be sent.' });
      }
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const { name, email, password } = await getBody(request);
      if (typeof name !== 'string' || name.trim().length < 2 || !validEmail(email) || !validPassword(password)) {
        return sendJson(response, 400, { error: 'Enter a name, valid email, and password of at least 6 characters.' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (data.users.some((user) => user.email === normalizedEmail)) {
        return sendJson(response, 409, { error: 'An account already exists for this email.' });
      }
      const hashed = passwordHash(password);
      const user = { id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, ...hashed, createdAt: new Date().toISOString() };
      data.users.push(user);
      saveData();
      const token = crypto.randomUUID();
      sessions.set(token, user.id);
      return sendJson(response, 201, { token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const { email, password } = await getBody(request);
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const user = data.users.find((entry) => entry.email === normalizedEmail);
      if (!user || !validPassword(password)) return sendJson(response, 401, { error: 'Incorrect email or password.' });
      const incoming = passwordHash(password, user.salt).hash;
      const isValid = crypto.timingSafeEqual(Buffer.from(incoming, 'hex'), Buffer.from(user.hash, 'hex'));
      if (!isValid) return sendJson(response, 401, { error: 'Incorrect email or password.' });
      const token = crypto.randomUUID();
      sessions.set(token, user.id);
      return sendJson(response, 200, { token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (request.method === 'POST' && pathname === '/api/carts') {
      const cartId = crypto.randomUUID();
      data.carts[cartId] = { id: cartId, items: [], createdAt: new Date().toISOString() };
      saveData();
      return sendJson(response, 201, { cart: cartSummary(data.carts[cartId]) });
    }

    const removeItemMatch = pathname.match(/^\/api\/carts\/([\w-]+)\/items\/([\w-]+)$/);
    if (request.method === 'DELETE' && removeItemMatch) {
      const [, cartId, productId] = removeItemMatch;
      const cart = data.carts[cartId];
      if (!cart) return sendJson(response, 404, { error: 'Cart not found.' });
      const originalLength = cart.items.length;
      cart.items = cart.items.filter((item) => item.productId !== productId);
      if (cart.items.length === originalLength) return sendJson(response, 404, { error: 'Product is not in this cart.' });
      saveData();
      return sendJson(response, 200, { cart: cartSummary(cart) });
    }

    const cartMatch = pathname.match(/^\/api\/carts\/([\w-]+)(?:\/items)?$/);
    if (cartMatch) {
      const cartId = cartMatch[1];
      const cart = getCart(cartId);
      if (!data.carts[cartId]) return sendJson(response, 404, { error: 'Cart not found.' });

      if (request.method === 'GET') return sendJson(response, 200, { cart: cartSummary(cart) });

      if (request.method === 'POST' && pathname.endsWith('/items')) {
        const { productId, quantity = 1 } = await getBody(request);
        if (productId !== PRODUCT.id) return sendJson(response, 404, { error: 'Product not found.' });
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
          return sendJson(response, 400, { error: 'Quantity must be a whole number between 1 and 20.' });
        }
        const existing = cart.items.find((item) => item.productId === productId);
        if (existing) existing.quantity = Math.min(existing.quantity + quantity, 20);
        else cart.items.push({ productId: PRODUCT.id, name: PRODUCT.name, price: PRODUCT.price, quantity });
        data.carts[cartId] = cart;
        saveData();
        return sendJson(response, 200, { cart: cartSummary(cart) });
      }
    }

    if (request.method === 'POST' && pathname === '/api/orders') {
      const { cartId, customer } = await getBody(request);
      const cart = data.carts[cartId];
      if (!cart || cart.items.length === 0) return sendJson(response, 400, { error: 'A non-empty cart is required.' });
      if (!customer || typeof customer.name !== 'string' || customer.name.trim().length < 2 || !validEmail(customer.email)) {
        return sendJson(response, 400, { error: 'Customer name and a valid email are required.' });
      }
      const summary = cartSummary(cart);
      const order = {
        id: `AK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        customer: { name: customer.name.trim(), email: customer.email.trim().toLowerCase() },
        items: cart.items,
        total: summary.subtotal,
        currency: summary.currency,
        status: 'received',
        createdAt: new Date().toISOString()
      };
      data.orders.push(order);
      delete data.carts[cartId];
      saveData();
      return sendJson(response, 201, { order });
    }

    return sendJson(response, 404, { error: 'Route not found.' });
  } catch (error) {
    console.error(error);
    return sendJson(response, 400, { error: error.message || 'Unable to process the request.' });
  }
});

server.listen(PORT, () => {
  console.log(`Amul Kool website and API running at http://localhost:${PORT}`);
});
