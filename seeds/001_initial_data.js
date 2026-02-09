exports.seed = async function(knex) {
  await knex('tasks').del();
  await knex('boards').del();
  await knex('users').del();
  
  const [userId] = await knex('users').insert([
    {
      username: 'testuser',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      refresh_token: null,
    },
  ]);
  
  const [boardId] = await knex('boards').insert([
    { name: 'Personal Tasks', user_id: userId },
    { name: 'Work Projects', user_id: userId },
  ]);
  
  await knex('tasks').insert([
    { title: 'Learn Fastify', completed: false, board_id: boardId },
    { title: 'Setup Swagger documentation', completed: true, board_id: boardId },
    { title: 'Deploy application', completed: false, board_id: boardId },
  ]);
};