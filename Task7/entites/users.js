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
      nullable: true,
    },
    email: {
      type: "varchar",
      unique: true,
      // Existing rows predate email-based accounts and have no email yet.
      nullable: true,
    },
    password: {
      type: "varchar",
      // Existing users may predate password-based authentication.
      // New registrations still store a bcrypt hash.
      nullable: true,
    },
  },
  relations: {
    notes: {
      type: "one-to-many",
      target: "Note",
      inverseSide: "user",
    },
  },
});

module.exports = UserSchema;
