exports.up = async function(knex) {
  const hasDisplayOrder = await knex.schema.hasColumn('tasks', 'display_order');
  if (hasDisplayOrder) {
    await knex.schema.table('tasks', table => {
      table.dropColumn('display_order');
    });
  }
  await knex.schema.table('tasks', function(table) {
    table.string('display_order').defaultTo("1").notNullable();
    table.text('description');
    table.string('tags');
    table.integer('version').defaultTo(0).notNullable();
    table.integer('user_id').unsigned().references('users.id').onDelete('SET NULL');
  });
};

exports.down = async function(knex) {
  const hasDisplayOrder = await knex.schema.hasColumn('tasks', 'display_order');
  if (hasDisplayOrder) {
    await knex.schema.table('tasks', table => {
      table.dropColumn('display_order');
    });
  }
  await knex.schema.table('tasks', function(table) {
    table.dropColumn('description');
    table.dropColumn('tags');
    table.dropColumn('user_id');
    table.dropColumn('version');
    table.integer('display_order').defaultTo(0).notNullable();
  });
};