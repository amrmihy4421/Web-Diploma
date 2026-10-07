const { DataSource } = require('typeorm');
const User = require('./user');
const Product = require('./product');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '123321qwe',
  database: 'notes_db',
  synchronize: false,
  logging: false,
  entities: [User, Product],
  migrations: [],
  subscribers: [],
});

module.exports = AppDataSource;
