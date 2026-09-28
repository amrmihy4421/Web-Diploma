import express = require('express');
import fs from 'node:fs/promises';
import path from 'node:path';
import { Request, Response, NextFunction } from 'express';

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserDatabase {
  users: User[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock?: number;
}

interface UserInput {
  name: string;
  email: string;
}

const app = express();
const databasePath = path.join(__dirname, '..', 'user_DB.json');

app.use(express.json());

function validateUserInput(body: unknown): { value?: UserInput; errors: string[] } {
  const errors: string[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object'] };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';

  if (!name) errors.push('name is required and must be a non-empty string');
  else if (name.length < 2 || name.length > 50) errors.push('name must be between 2 and 50 characters');

  if (!email) errors.push('email is required and must be a non-empty string');
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email must be a valid email address');
  }

  if (errors.length > 0) return { errors };
  return { value: { name, email }, errors };
}

function parseUserId(value: string | string[]): number | null {
  if (typeof value !== 'string') return null;
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function readUsers(): Promise<User[]> {
  try {
    const contents = await fs.readFile(databasePath, 'utf8');
    const data: unknown = JSON.parse(contents);
    if (typeof data !== 'object' || data === null || !Array.isArray((data as UserDatabase).users)) {
      throw new Error('user_DB.json must contain a users array');
    }
    return (data as UserDatabase).users;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await saveUsers([]);
    return [];
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await fs.writeFile(databasePath, `${JSON.stringify({ users }, null, 2)}\n`, 'utf8');
}

const products: Product[] = [
  { id: 1, name: 'Laptop', price: 25000, stock: 12 },
  { id: 2, name: 'iPhone', price: 15000 },
  { id: 3, name: 'Headphones', price: 3200 },
  { id: 4, name: 'Smart Watch', price: 4800 },
  { id: 5, name: 'Keyboard', price: 2100 },
];

app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('Welcome home page');
});

app.get('/users', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json(await readUsers());
  } catch {
    return res.status(500).json({ error: 'Could not read users from user_DB.json' });
  }
});

app.post('/users', async (req: Request, res: Response) => {
  const validation = validateUserInput(req.body);
  if (!validation.value) return res.status(400).json({ errors: validation.errors });

  try {
    const users = await readUsers();
    const newUser: User = {
      id: users.reduce((maxId, user) => Math.max(maxId, Number(user.id) || 0), 0) + 1,
      ...validation.value,
    };
    users.push(newUser);
    await saveUsers(users);
    return res.status(201).json(newUser);
  } catch {
    return res.status(500).json({ error: 'Could not save user to user_DB.json' });
  }
});

app.put('/users/:id', async (req: Request, res: Response) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) return res.status(400).json({ error: 'id must be a positive integer' });

  const validation = validateUserInput(req.body);
  if (!validation.value) return res.status(400).json({ errors: validation.errors });

  try {
    const users = await readUsers();
    const userIndex = users.findIndex((user) => Number(user.id) === userId);
    if (userIndex === -1) return res.status(404).json({ error: `User with id ${userId} was not found` });

    users[userIndex] = { ...users[userIndex], ...validation.value };
    await saveUsers(users);
    return res.status(200).json(users[userIndex]);
  } catch {
    return res.status(500).json({ error: 'Could not update user in user_DB.json' });
  }
});

app.delete('/users/:id', async (req: Request, res: Response) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) return res.status(400).json({ error: 'id must be a positive integer' });

  try {
    const users = await readUsers();
    const userIndex = users.findIndex((user) => Number(user.id) === userId);
    if (userIndex === -1) return res.status(404).json({ error: `User with id ${userId} was not found` });

    const [deletedUser] = users.splice(userIndex, 1);
    await saveUsers(users);
    return res.status(200).json({ message: 'User deleted', user: deletedUser });
  } catch {
    return res.status(500).json({ error: 'Could not delete user from user_DB.json' });
  }
});

app.get('/products', (_req: Request, res: Response) => {
  res.status(200).json(products);
});

// Return malformed JSON errors in the same JSON format as other validation errors.
app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ errors: ['Request body contains invalid JSON'] });
  }
  return res.status(500).json({ error: 'Unexpected server error' });
});

if (require.main === module) {
  app.listen(5000, () => {
    console.log('Server is running at http://localhost:5000');
  });
}

export = app;
