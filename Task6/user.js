const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true
        },
        email: {
            type: 'varchar',
            unique: true
        },
        username: {
            type: 'varchar',
            unique: true
        }
    }
});
