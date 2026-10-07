const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const databasePath = path.join(__dirname, 'User_DB.json');

app.use(express.json());

async function readUsers() {
  try {
    const contents = await fs.readFile(databasePath, 'utf8');
    const data = JSON.parse(contents);
    if (!Array.isArray(data.users)) {
      throw new Error('User_DB.json must contain a users array');
    }
    return data.users;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await saveUsers([]);
    return [];
  }
}

async function saveUsers(users) {
  await fs.writeFile(databasePath, `${JSON.stringify({ users }, null, 2)}\n`, 'utf8');
}

const products = [
  { id: 1, name: 'Laptop', price: 25000, stock: 12 },
  { id: 2, name: 'iPhone', price: 15000},
  { id: 3, name: 'Headphones', price: 3200},
  { id: 4, name: 'Smart Watch', price: 4800 },
  { id: 5, name: 'Keyboard', price: 2100 },
];

app.get('/', (req, res) => {
  res.status(200).send('Welcome home page');
});

app.get('/users', async (req, res) => {
  try {
    const users = await readUsers();
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Could not read users from User_database.json' });
  }
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const users = await readUsers();
    const newUser = {
      id: users.reduce((maxId, user) => Math.max(maxId, Number(user.id) || 0), 0) + 1,
      name: name.trim(),
      email: email.trim(),
    };

    users.push(newUser);
    await saveUsers(users);
    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ error: 'Could not save user to User_database.json' });
  }
});

app.get('/products', (req, res) => {
  const { search } = req.query;

  if (search !== undefined && typeof search !== 'string') {
    return res.status(400).json({ error: 'search must be a single string' });
  }

  const matchingProducts = typeof search === 'string' && search.trim()
    ? products.filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  return res.status(200).json(matchingProducts);
});

if (require.main === module) {
  app.listen(5000, () => {
    console.log(`Server is running at http://localhost:5000`);
  });
}

module.exports = app;
