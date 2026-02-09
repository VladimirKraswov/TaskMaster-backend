require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL || './dev.sqlite3',
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      },
    },
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL || '/var/www/taskmaster/prod.sqlite3',
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        // Включаем WAL режим для лучшей производительности и включаем foreign keys
        conn.run('PRAGMA journal_mode = WAL;', (err) => {
          if (err) return cb(err);
          conn.run('PRAGMA foreign_keys = ON;', cb);
        });
      }
    },
  },
};