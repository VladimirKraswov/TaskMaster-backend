exports.up = async function(knex) {
  const hasDisplayOrder = await knex.schema.hasColumn('cols', 'display_order');
  if (hasDisplayOrder) {
    await knex.schema.table('cols', table => {
      table.dropColumn('display_order');
    });
  }
  await knex.schema.table('cols', table => {
    table.string('display_order').defaultTo('1').notNullable();
    table.integer('version').defaultTo(0).notNullable();
  });
};

exports.down = async function(knex) {
  const hasDisplayOrder = await knex.schema.hasColumn('cols', 'display_order');
  if (hasDisplayOrder) {
    await knex.schema.table('cols', async (table) => {
        table.dropColumn('display_order');
    });
  }
  await knex.schema.table('cols', table => {
    table.integer('display_order').defaultTo(0).notNullable();
    table.dropColumn('version');
  });
};
