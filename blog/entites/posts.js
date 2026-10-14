const { EntitySchema } = require("typeorm");

const PostSchema = new EntitySchema({
  name: "Post",
  tableName: "posts",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    title: {
      type: "varchar",
      length: 200,
      nullable: false,
    },
    content: {
      type: "text",
      nullable: false,
    },
    createdAt: {
      type: "timestamptz",
      createDate: true,
    },
    updatedAt: {
      type: "timestamptz",
      updateDate: true,
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "posts",
      joinColumn: {
        name: "userId",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
    comments: {
      type: "one-to-many",
      target: "Comment",
      inverseSide: "post",
    },
    shares: {
      type: "one-to-many",
      target: "Share",
      inverseSide: "post",
    },
  },
});

module.exports = PostSchema;
