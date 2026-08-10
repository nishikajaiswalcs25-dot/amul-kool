# Amul Kool backend

This zero-dependency Node.js API supports the supplied Amul Kool page. It persists newsletter sign-ups, carts, and orders to a local `data.json` file created automatically on first write.

## Run

1. Install [Node.js 18+](https://nodejs.org/).
2. Open this folder in a terminal.
3. Run `npm start`.

The server listens on `http://localhost:3000`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/products` | Product catalogue |
| POST | `/api/newsletter` | Store a notification email |
| POST | `/api/carts` | Create a cart |
| GET | `/api/carts/:cartId` | Read a cart |
| POST | `/api/carts/:cartId/items` | Add the product to a cart |
| POST | `/api/orders` | Save an order |

## Attach it to your page

Paste the contents of `frontend-integration.js` immediately before the closing `</body>` tag in the supplied HTML. It connects the existing Notify Me form and Shop Now/cart buttons to the backend.

Before using real payments, replace the JSON file with a database and integrate an authenticated payment provider.
## 🚀 Live Demo

[View Live Website](https://amul-kool.onrender.com)
