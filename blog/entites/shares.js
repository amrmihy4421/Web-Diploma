const { EntitySchema } = require("typeorm");

const ShareSchema = new EntitySchema({
  name: "Share",
  tableName: "shares",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    createdAt: {
      type: "timestamptz",
      createDate: true,
    },
  },
  relations: {
    post: {
      type: "many-to-one",
      target: "Post",
      inverseSide: "shares",
      joinColumn: {
        name: "postId",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "shares",
      joinColumn: {
        name: "userId",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
  uniques: [
    {
      columns: ["post", "user"],
    },
  ],
});

module.exports = ShareSchema;
