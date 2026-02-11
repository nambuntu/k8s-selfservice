import { Sequelize } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import config from './index';

// Create Sequelize instance
export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
}

/**
 * Run SQL migration files
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping...');
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    return;
  }

  console.log(`Found ${migrationFiles.length} migration file(s)`);

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      console.log(`Running migration: ${file}`);
      await sequelize.query(sql);
      console.log(`✓ Migration ${file} completed`);
    } catch (error) {
      console.error(`✗ Migration ${file} failed:`, error);
      throw error;
    }
  }

  console.log('✓ All migrations completed successfully');
}

/**
 * Initialize database: test connection and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  await testConnection();
  await runMigrations();
}
