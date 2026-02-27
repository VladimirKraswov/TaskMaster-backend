exports.up = async function(knex) {
  await knex.schema.table('tasks', table => {
    table.integer('contentVersion').defaultTo(0).notNullable();
    table.integer('positionVersion').defaultTo(0).notNullable();
    table.dropColumn('version');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('tasks', table => {
    table.integer('version').defaultTo(0).notNullable();
    table.dropColumn('contentVersion');
    table.dropColumn('positionVersion');
  });
};
