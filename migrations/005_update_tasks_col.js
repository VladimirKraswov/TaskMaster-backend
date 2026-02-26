exports.up = function(knex) {
  return knex.schema.table('tasks', function(table) {
    // 1. Добавляем поле для порядка сортировки
    table.integer('display_order').defaultTo(0).notNullable();

    // 2. Добавляем новую колонку col_id (сначала разрешаем NULL,
    //    чтобы можно было заполнить её данными после миграции)
    table.integer('col_id').unsigned().references('cols.id').onDelete('CASCADE');

    // 3. Удаляем старую колонку board_id (вместе с её внешним ключом)
    table.dropColumn('board_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('tasks', function(table) {
    // 1. Возвращаем колонку board_id с внешним ключом на boards
    table.integer('board_id').unsigned().references('boards.id').onDelete('CASCADE');

    // 2. Удаляем добавленные колонки
    table.dropColumn('col_id');
    table.dropColumn('display_order');
  });
};