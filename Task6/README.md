# Task 6: Express API with TypeORM

A small Express API that uses TypeORM to access a PostgreSQL database. It defines `User` and `Product` entities and supports product search by title.

## Requirements

- Node.js
- PostgreSQL

Create a PostgreSQL database named `notes_db`, then update the connection settings in `db.js` to match your local PostgreSQL username, password, host, and port.

## Run the server

From the `Task6` folder:

```bash
npm install
node server.js
```

The API runs at `http://localhost:5000`. On startup, the app initializes TypeORM, fills required fields for legacy rows when needed, and synchronizes the entities with the database schema.

## Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Create a user from the JSON request body |
| GET | `/products` | Return all products, or search by title |
| PUT | `/users/:id` | Update a user |
| DELETE | `/users/:id` | Delete a user |
| GET | `/users/:id/products/count` | Return the number of products owned by a user |

### Create a user

The current route reads `username` and `email` from the JSON request body:

```bash
curl -X GET http://localhost:5000/ \
  -H "Content-Type: application/json" \
  --data '{"username":"amr","email":"amr@example.com"}'
```

The response contains the saved user, including its generated `id`.

### Search products

Without a `search` parameter, the route returns all products:

```http
GET http://localhost:5000/products
```

Search for a partial title, without case sensitivity:

```http
GET http://localhost:5000/products?search=phone
```

The search text is trimmed. An empty or whitespace-only value returns all products. If the query matches nothing, the response is an empty array. `search` must be a single string; repeated query parameters return status `400`.

### Update a user

```http
PUT http://localhost:5000/users/1
Content-Type: application/json

{
  "username": "amr-hassan"
}
```

Returns the updated user, or status `404` if the user does not exist.

### Delete a user

```http
DELETE http://localhost:5000/users/1
```

Returns status `204` when successful, or `404` if the user does not exist.

### Count a user's products

```http
GET http://localhost:5000/users/1/products/count
```

Example response:

```json
{
  "userId": 1,
  "productsCount": 3
}
```

Invalid user IDs return status `400`; IDs for users that do not exist return status `404`.
