exports.up = function(knex) {
  return knex.schema.createTable('boards', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('boards');
};