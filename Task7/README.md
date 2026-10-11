# Task 7 Notes API

A REST API built with Express, PostgreSQL, and TypeORM. It supports user registration and login, authenticated profile access, and creating, listing, searching, updating, and deleting notes linked to the signed-in user.

## Requirements

- Node.js 20.12 or later
- PostgreSQL

## Setup

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database, then create a `.env` file in this folder:

   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_NAME=task7_db
   JWT_SECRET=replace_with_a_long_random_secret
   ```

   Use your own PostgreSQL credentials and a database that already exists. Keep `.env` private; it is ignored by Git.

3. Start the API:

   ```bash
   node server.js
   ```

   The server connects to PostgreSQL and synchronizes the tables from the TypeORM entity definitions before listening on the configured port. The default port is `5000`.

## API routes

All request and response bodies use JSON.

### Register

`POST /register`

```json
{
  "username": "sam",
  "email": "sam@example.com",
  "password": "your_password"
}
```

The password is stored as a bcrypt hash. Email is required and must be unique.

### Log in

`POST /login`

```json
{
  "email": "sam@example.com",
  "password": "your_password"
}
```

On success, the response contains a signed JWT:

```json
{
  "token": "your_jwt"
}
```

The token expires after one hour.

### Get the authenticated user

`GET /auth`

Send the token in the `Authorization` header:

```http
Authorization: Bearer your_jwt
```

The response includes the user's `id`, `username`, and `email`.

### Create a note

`POST /notes`

This route also requires a bearer token. Send a title and content:

```json
{
  "title": "First note",
  "content": "Remember to review the project."
}
```

The note is associated with the authenticated user.

### List notes

`GET /notes`

Returns the authenticated user's notes as an array of `{ id, title, content }` objects. Notes belonging to other users are never included.

### Search notes

`GET /notes/search?q=review`

Searches the authenticated user's titles and content without regard to letter case. The same search is available on `GET /notes?q=review` (also accepts `query` or `search` as the query parameter name).

### Get one note

`GET /notes/:id`

Returns one of the authenticated user's notes. A missing note, or a note belonging to another user, returns `404`.

### Update a note

`PATCH /notes/:id` (also supported: `PUT /notes/:id`)

Send either or both fields to update:

```json
{
  "title": "Updated title",
  "content": "Updated note content"
}
```

The response contains a success message and the updated note. Empty titles are rejected; content must be a string.

### Delete a note

`DELETE /notes/:id`

Deletes a note owned by the authenticated user. A note owned by another user is treated as not found.

## Database tables

- `users`: generated ID, username, unique email, and bcrypt password hash.
- `notes`: generated ID, title, content, and an optional user relationship for compatibility with existing records.

The `username` field is nullable so existing user records can remain in the database after the schema update.
