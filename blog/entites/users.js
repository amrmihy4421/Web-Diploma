const { EntitySchema } = require("typeorm");

const UserSchema = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    username: {
      type: "varchar",
      length: 80,
      unique: true,
      nullable: false,
    },
    email: {
      type: "varchar",
      length: 255,
      unique: true,
      nullable: false,
    },
    password: {
      type: "varchar",
      nullable: false,
    },
    role: {
      type: "varchar",
      length: 16,
      default: "user",
      nullable: false,
    },
  },
  relations: {
    posts: {
      type: "one-to-many",
      target: "Post",
      inverseSide: "user",
    },
    comments: {
      type: "one-to-many",
      target: "Comment",
      inverseSide: "user",
    },
    shares: {
      type: "one-to-many",
      target: "Share",
      inverseSide: "user",
    },
  },
});

module.exports = UserSchema;
