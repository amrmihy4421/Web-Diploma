# Blog API

A REST API built with Express, PostgreSQL, and TypeORM. It supports user registration and login, posts, comments, sharing posts, and role-based admin actions.

## Requirements

- Node.js 20.12 or later
- PostgreSQL
- DBeaver (for creating and viewing the database)

## Setup

1.Install the dependencies and start the API:

   ```bash
   npm install
   npm start
   ```

   The server connects to `blog_db` and creates the `users`, `posts`, `comments`, and `shares` tables from the TypeORM entity definitions. The default port is `5000`.

## Authentication

Register at `POST /register`:

```json
{
  "username": "Amr",
  "email": "amr@example.com",
  "password": "StrongPass1!"
}
```

Username must contain 3–80 characters. Email must be valid, unique, and no longer than 255 characters. Password must be at least 8 characters and contain an uppercase letter, a number, and a special character. Passwords are stored as bcrypt hashes.

Log in at `POST /login` with an email and password. The response contains a JWT and the user's role. Include the token on protected routes:

```http
Authorization: Bearer your_jwt
```

`GET /auth` returns the signed-in user's ID, username, email, and role. The API checks the user's current role in the database for each authenticated request.

## Posts

- `POST /posts` creates a post for the signed-in user. Body: `{ "title": "First post", "content": "Post text" }`. Titles are limited to 200 characters.
- `GET /posts` lists all posts so users can read and comment on one another's posts. Add `?q=search-term` to search titles and content.
- `GET /posts/:id` returns one post with its author and comment/share counts.
- `PATCH /posts/:id` or `PUT /posts/:id` updates the signed-in user's post. Send `title`, `content`, or both.
- `DELETE /posts/:id` deletes only the signed-in user's post.
- `DELETE /admin/posts/:id` lets an admin delete any post.

## Comments

- `POST /posts/:id/comments` adds a comment to a post. Body: `{ "content": "A comment" }`.
- `GET /posts/:id/comments` lists a post's comments with their authors.
- `DELETE /comments/:id` lets a comment's author delete their comment. The author of the post can also delete comments on that post.

## Shares

- `POST /posts/:id/share` records the signed-in user's share of a post. A user can share a given post once.
- `GET /posts/:id/shares` lists the users who shared a post.
- `DELETE /posts/:id/share` removes the signed-in user's share.

## Admin actions

Admins can view every account at `GET /admin/users`, view all posts at `GET /posts`, delete any post at `DELETE /admin/posts/:id`, and delete any account at `DELETE /admin/users/:id`. The user list includes IDs, usernames, emails, and roles; it never includes password hashes. Deleting a user also deletes that user's posts, comments, and shares; deleting a post also deletes its comments and shares.

## Database tables

- `users`: username, unique email, bcrypt password hash, and `user` or `admin` role.
- `posts`: title, content, author, and creation/update timestamps.
- `comments`: comment content, its post, author, and creation timestamp.
- `shares`: the user and post each share record links, with a creation timestamp. A user can share a post once.
