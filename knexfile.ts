import type { Knex } from "knex"
import dotenv from "dotenv"

dotenv.config()

const config: Record<string, Knex.Config> = {
  development: {
    client: "sqlite3",
    connection: {
      filename: process.env.DATABASE_URL || "./dev.sqlite3",
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./seeds",
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn: any, cb: (err: Error | null, conn: any) => void) => {
        conn.run("PRAGMA foreign_keys = ON", cb)
      },
    },
  },

  test: {
    client: "sqlite3",
    connection: {
      filename: ":memory:",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  production: {
    client: "sqlite3",
    connection: {
      filename:
        process.env.DATABASE_URL ||
        "/var/www/taskmaster/prod.sqlite3",
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./seeds",
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn: any, cb: (err: Error | null, conn: any) => void) => {
        conn.run("PRAGMA journal_mode = WAL;", (err: Error | null) => {
          if (err) return cb(err, conn)
          conn.run("PRAGMA foreign_keys = ON;", cb)
        })
      },
    },
  },
}

export default config