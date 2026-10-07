const express = require('express');
const AppDataSource = require('./db');

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    const UserRepository = AppDataSource.getRepository('User');
    const newUser = UserRepository.create(req.body);
    const savedUser = await UserRepository.save(newUser);
    res.status(201).json(savedUser);
});

app.get('/products', async (req, res) => {
    const { search } = req.query;

    if (search !== undefined && typeof search !== 'string') {
        return res.status(400).json({ message: 'search must be a single string' });
    }

    try {
        const productRepository = AppDataSource.getRepository('Product');
        const searchTerm = typeof search === 'string' ? search.trim() : '';
        const products = searchTerm
            ? await productRepository
                .createQueryBuilder('product')
                .where('product.title ILIKE :search', { search: `%${searchTerm}%` })
                .getMany()
            : await productRepository.find();

        return res.status(200).json(products);
    } catch (error) {
        console.error('Could not fetch products:', error);
        return res.status(500).json({ message: 'Could not fetch products' });
    }
});

app.put('/users/:id', async (req, res) => {
    const UserRepository = AppDataSource.getRepository('User');
    const user = await UserRepository.findOneBy({ id: parseInt(req.params.id) });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    UserRepository.merge(user, req.body);
    const updatedUser = await UserRepository.save(user);
    res.json(updatedUser);
});

app.delete('/users/:id', async (req, res) => {
    const UserRepository = AppDataSource.getRepository('User');
    const user = await UserRepository.findOneBy({ id: parseInt(req.params.id) });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    await UserRepository.remove(user);
    res.status(204).send();
});

app.get('/users/:id/products/count', async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    try {
        const userRepository = AppDataSource.getRepository('User');
        const productRepository = AppDataSource.getRepository('Product');
        const user = await userRepository.findOneBy({ id: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const productsCount = await productRepository.count({
            where: { user: { id: userId } }
        });

        return res.json({ userId, productsCount });
    } catch (error) {
        console.error('Could not count products for user:', error);
        return res.status(500).json({ message: 'Could not count products' });
    }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await AppDataSource.initialize();

        const [{ table_exists: usersTableExists }] = await AppDataSource.query(
            "SELECT to_regclass('public.users') IS NOT NULL AS table_exists"
        );

        if (usersTableExists) {
            await AppDataSource.query(
                'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" character varying'
            );
            await AppDataSource.query(
                `UPDATE "users"
                 SET "username" = 'legacy_user_' || "id"::text
                 WHERE "username" IS NULL OR btrim("username") = ''`
            );
            await AppDataSource.query(
                'ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL'
            );
        }

        const [{ table_exists: productsTableExists }] = await AppDataSource.query(
            "SELECT to_regclass('public.products') IS NOT NULL AS table_exists"
        );

        if (productsTableExists) {
            await AppDataSource.query(
                'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "title" character varying'
            );
            await AppDataSource.query(
                'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content" text'
            );
            await AppDataSource.query(
                `UPDATE "products"
                 SET "title" = 'legacy_product_' || "id"::text
                 WHERE "title" IS NULL OR btrim("title") = ''`
            );
            await AppDataSource.query(
                `UPDATE "products"
                 SET "content" = ''
                 WHERE "content" IS NULL`
            );
            await AppDataSource.query(
                'ALTER TABLE "products" ALTER COLUMN "title" SET NOT NULL'
            );
            await AppDataSource.query(
                'ALTER TABLE "products" ALTER COLUMN "content" SET NOT NULL'
            );
        }

        await AppDataSource.synchronize();
        console.log('Data Source has been initialized!');
        return true;
    } catch (err) {
        console.error('Error during Data Source initialization:', err);
        process.exitCode = 1;
        return false;
    }
}

if (require.main === module) {
    startServer().then((isReady) => {
        if (!isReady) return;

        app.listen(5000, () => {
            console.log(`Server is running at http://localhost:5000`);
        });
    });
}

module.exports = app;
