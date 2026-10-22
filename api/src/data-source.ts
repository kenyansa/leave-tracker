import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { migrations } from './migrations';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity.js'],
  migrations,
});