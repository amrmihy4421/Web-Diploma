const { EntitySchema } = require("typeorm");

const CommentSchema = new EntitySchema({
  name: "Comment",
  tableName: "comments",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    content: {
      type: "text",
      nullable: false,
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
      inverseSide: "comments",
      joinColumn: {
        name: "postId",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "comments",
      joinColumn: {
        name: "userId",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});

module.exports = CommentSchema;
