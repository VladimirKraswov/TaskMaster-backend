exports.up = function(knex) {
  return knex.schema.createTable('tasks', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.boolean('completed').defaultTo(false);
    table.integer('board_id').unsigned().references('boards.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tasks');
};