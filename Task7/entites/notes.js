const { EntitySchema } = require("typeorm");

const NoteSchema = new EntitySchema({
  name: "Note",
  tableName: "notes",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    title: {
      type: "varchar",
      // Existing notes may predate the title field.
      nullable: true,
    },
    content: {
      type: "text",
      nullable: false,
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "notes",
      joinColumn: {
        name: "userId",
      },
      // Existing notes predate user ownership and have no userId yet.
      // New notes created through the authenticated API still include a user.
      nullable: true,
    },
  },
});

module.exports = NoteSchema;
