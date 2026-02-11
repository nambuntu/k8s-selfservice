import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sequelize } from '../config/database';

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Get migration files
    const migrationsDir = join(__dirname, '../../migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration file(s)`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await sequelize.query(statement);
      }
      
      console.log(`✓ Migration completed: ${file}`);
    }

    console.log('✓ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
