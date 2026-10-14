const { DataSource } = require("typeorm");
const UserSchema = require("./entites/users");
const PostSchema = require("./entites/posts");
const CommentSchema = require("./entites/comments");
const ShareSchema = require("./entites/shares");

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "blog_db",
  synchronize: true,
  logging: false,
  entities: [UserSchema, PostSchema, CommentSchema, ShareSchema],
});

module.exports = AppDataSource;
