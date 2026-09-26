# Task3 User and Product API

A simple API built with Node.js and Express. User data is stored in `User_database.json` in the project folder.

## Getting Started

Open CMD in the `Task3` folder and run:

```cmd
npm install
npm start
```

The server will run at `http://localhost:5000`. Keep this CMD window open while using the API.

## Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Display a welcome message |
| GET | `/users` | Return the list of users |
| POST | `/users` | Add a user and save it to `User_database.json` |
| GET | `/products` | Return the list of products |

## Add a User from CMD

Open a second CMD window and run:

```cmd

curl -X POST http://localhost:5000/users -H "Content-Type: application/json" -d "{\"name\":\"User_Name\",\"email\":\"user@example.com\"}"

```

Both `name` and `email` are required and must be non-empty strings. When the request succeeds, the server returns the new user, including its `id`, and saves it to `User_database.json`.

To view the users after adding one:

```cmd
curl http://localhost:5000/users
```
