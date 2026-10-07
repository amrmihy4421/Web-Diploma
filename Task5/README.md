# Task 5: Express API

A small REST API built with Node.js and Express. It provides user routes and a product list with a search query.

## Run the server

From the `Task5` folder, install dependencies and start the server:

```bash
npm install
node express.js
```

The server runs at `http://localhost:5000`.

## Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Return a welcome message |
| GET | `/users` | Return all users stored in `User_DB.json` |
| POST | `/users` | Add a user and save it in `User_DB.json` |
| GET | `/products` | Return all products, or search products by name |

## Search products

The `GET /products` route accepts an optional `search` query parameter. It matches part of a product name, ignores uppercase and lowercase differences, and trims spaces around the search text.

Return all products:

```http
GET http://localhost:5000/products
```

Search for products whose name contains `phone`:

```http
GET http://localhost:5000/products?search=phone
```

This returns the `iPhone` product. Searching for `PHONE` or ` phone ` returns the same match. If `search` is empty or contains only spaces, the API returns all products. If no product name matches, it returns an empty array (`[]`). The `search` value must be a single string; otherwise, the API responds with status `400`.

## User routes

To add a user, send a JSON body with non-empty `name` and `email` values:

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Amr Hassan","email":"amr@example.com"}'
```

The API assigns the new user an ID and saves the updated user list to `User_DB.json`.
