#!/usr/bin/env ts-node
// File: scripts/database-restore.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface RestoreOptions {
  dropExisting?: boolean;
  createDatabase?: boolean;
  dataOnly?: boolean;
  schemaOnly?: boolean;
  verbose?: boolean;
}

class DatabaseRestore {
  private dbUrl: string;
  private backupDir: string;

  constructor() {
    this.dbUrl = process.env.DATABASE_URL!;
    this.backupDir = path.join(process.cwd(), 'backups');
    
    if (!this.dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  private parseDbUrl() {
    const url = new URL(this.dbUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password
    };
  }

  async listAvailableBackups(): Promise<string[]> {
    if (!existsSync(this.backupDir)) {
      console.log('❌ No backup directory found');
      return [];
    }

    const files = readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .sort()
      .reverse(); // Most recent first

    console.log('📁 Available backup files:');
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    return files;
  }

  async createPreRestoreBackup(): Promise<string> {
    console.log('🔄 Creating pre-restore backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `pre-restore-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} > "${filepath}"`;
    
    try {
      await execAsync(command, { env });
      console.log(`✅ Pre-restore backup created: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Pre-restore backup failed:', error);
      throw error;
    }
  }

  async dropAllTables(): Promise<void> {
    console.log('🗑️ Dropping all existing tables...');
    
    try {
      // Get all table names
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != '_prisma_migrations'
      `;

      // Drop tables in reverse dependency order
      const dropCommands = tables.map(({ tablename }) => 
        `DROP TABLE IF EXISTS "${tablename}" CASCADE`
      );

      for (const command of dropCommands) {
        await prisma.$executeRawUnsafe(command);
      }

      console.log(`✅ Dropped ${tables.length} tables`);
    } catch (error) {
      console.error('❌ Failed to drop tables:', error);
      throw error;
    }
  }

  async restoreFromFile(backupFile: string, options: RestoreOptions = {}): Promise<void> {
    const filepath = path.isAbsolute(backupFile) 
      ? backupFile 
      : path.join(this.backupDir, backupFile);

    if (!existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    console.log(`🔄 Restoring database from: ${backupFile}`);
    
    // Create pre-restore backup unless explicitly disabled
    if (!options.dataOnly) {
      await this.createPreRestoreBackup();
    }

    // Drop existing tables if requested
    if (options.dropExisting) {
      await this.dropAllTables();
    }

    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    let command = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database}`;
    
    if (options.verbose) {
      command += ' -v ON_ERROR_STOP=1';
    }
    
    if (filepath.endsWith('.gz')) {
      command = `gunzip -c "${filepath}" | ${command}`;
    } else {
      command += ` < "${filepath}"`;
    }

    try {
      console.log('🔄 Executing restore...');
      const { stdout, stderr } = await execAsync(command, { env });
      
      if (options.verbose && stdout) {
        console.log('📝 Restore output:', stdout);
      }
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️ Restore warnings:', stderr);
      }
      
      console.log('✅ Database restore completed successfully');
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async restoreSpecificTables(backupFile: string, tables: string[]): Promise<void> {
    console.log(`🔄 Restoring specific tables: ${tables.join(', ')}`);
    
    const filepath = path.isAbsolute(backupFile) 
      ? backupFile 
      : path.join(this.backupDir, backupFile);

    if (!existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    // Create a temporary filtered backup
    const tempFile = path.join(this.backupDir, `temp-${Date.now()}.sql`);
    const tableArgs = tables.map(table => `-t "${table}"`).join(' ');
    
    const filterCommand = `pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} ${tableArgs} "${filepath}" > "${tempFile}"`;
    
    try {
      await execAsync(filterCommand, { env });
      await this.restoreFromFile(tempFile);
      
      // Clean up temp file
      await execAsync(`rm "${tempFile}"`);
      
      console.log('✅ Specific tables restored successfully');
    } catch (error) {
      console.error('❌ Specific table restore failed:', error);
      throw error;
    }
  }

  async validateRestore(): Promise<boolean> {
    console.log('🔍 Validating restored database...');
    
    try {
      // Check if main tables exist
      const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('User', 'Organization', 'Property', 'Room', 'Reservation')
      `;
      
      const tableCount = Number(tables[0].count);
      
      if (tableCount < 5) {
        console.error(`❌ Validation failed: Expected at least 5 core tables, found ${tableCount}`);
        return false;
      }

      // Check if Prisma migrations table exists
      const migrations = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      `;

      if (Number(migrations[0].count) === 0) {
        console.warn('⚠️ Warning: _prisma_migrations table not found. You may need to run: npx prisma migrate deploy');
      }

      console.log('✅ Database validation passed');
      return true;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}

// CLI Interface
async function main() {
  const restore = new DatabaseRestore();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        await restore.listAvailableBackups();
        break;
        
      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          console.error('❌ Please specify backup file');
          process.exit(1);
        }
        
        const dropExisting = args.includes('--drop');
        const verbose = args.includes('--verbose');
        
        await restore.restoreFromFile(backupFile, { 
          dropExisting, 
          verbose 
        });
        await restore.validateRestore();
        break;
        
      case 'restore-tables':
        const backupFileForTables = args[1];
        const tables = args.slice(2);
        
        if (!backupFileForTables || tables.length === 0) {
          console.error('❌ Please specify backup file and table names');
          process.exit(1);
        }
        
        await restore.restoreSpecificTables(backupFileForTables, tables);
        break;
        
      case 'validate':
        const isValid = await restore.validateRestore();
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log(`
🔄 Database Restore Tool

Usage:
  npm run restore:list                    - List available backups
  npm run restore:restore <file>          - Restore from backup file
  npm run restore:restore <file> --drop   - Restore with drop existing tables
  npm run restore:tables <file> <tables>  - Restore specific tables
  npm run restore:validate                - Validate current database

Examples:
  npx tsx scripts/database-restore.ts list
  npx tsx scripts/database-restore.ts restore full-backup-2024-01-15.sql
  npx tsx scripts/database-restore.ts restore full-backup-2024-01-15.sql --drop --verbose
  npx tsx scripts/database-restore.ts restore-tables data-backup.sql User Organization
        `);
    }
  } catch (error) {
    console.error('❌ Restore operation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseRestore };
