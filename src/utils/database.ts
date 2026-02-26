import Knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const db = Knex(knexConfig[environment]);

export default db;