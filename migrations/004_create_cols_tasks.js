exports.up = function(knex) {
  return knex.schema.createTable('cols', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.integer('display_order').defaultTo(0).notNullable();
    table.integer('board_id').unsigned().references('boards.id').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('cols');
};