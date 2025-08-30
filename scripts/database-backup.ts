#!/usr/bin/env ts-node
// File: scripts/database-backup.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const execAsync = promisify(exec);

interface BackupOptions {
  outputDir?: string;
  includeData?: boolean;
  compress?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
  tables?: string[];
}

class DatabaseBackup {
  private dbUrl: string;
  private backupDir: string;

  constructor() {
    this.dbUrl = process.env.DATABASE_URL!;
    this.backupDir = path.join(process.cwd(), 'backups');
    
    if (!this.dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
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

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  async createFullBackup(options: BackupOptions = {}): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `full-backup-${timestamp}.sql`;
    const filepath = path.join(options.outputDir || this.backupDir, filename);
    
    console.log('🔄 Creating full database backup...');
    
    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    let command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database}`;
    
    if (options.schemaOnly) {
      command += ' --schema-only';
    } else if (options.dataOnly) {
      command += ' --data-only';
    }
    
    if (options.compress) {
      command += ' --compress=9';
      filepath.replace('.sql', '.sql.gz');
    }
    
    command += ` > "${filepath}"`;
    
    try {
      await execAsync(command, { env });
      console.log(`✅ Full backup created: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async createSchemaBackup(): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `schema-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    console.log('🔄 Creating schema-only backup...');
    
    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --schema-only > "${filepath}"`;
    
    try {
      await execAsync(command, { env });
      console.log(`✅ Schema backup created: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Schema backup failed:', error);
      throw error;
    }
  }

  async createDataBackup(tables?: string[]): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `data-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    console.log('🔄 Creating data-only backup...');
    
    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    let command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} --data-only`;
    
    if (tables && tables.length > 0) {
      const tableArgs = tables.map(table => `-t "${table}"`).join(' ');
      command += ` ${tableArgs}`;
    }
    
    command += ` > "${filepath}"`;
    
    try {
      await execAsync(command, { env });
      console.log(`✅ Data backup created: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Data backup failed:', error);
      throw error;
    }
  }

  async createCustomBackup(tables: string[]): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `custom-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    console.log(`🔄 Creating custom backup for tables: ${tables.join(', ')}`);
    
    const dbConfig = this.parseDbUrl();
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const tableArgs = tables.map(table => `-t "${table}"`).join(' ');
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} ${tableArgs} > "${filepath}"`;
    
    try {
      await execAsync(command, { env });
      console.log(`✅ Custom backup created: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Custom backup failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`ls -la "${this.backupDir}"`);
      console.log('📁 Available backups:');
      console.log(stdout);
      return stdout.split('\n').filter(line => line.includes('.sql'));
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }
}

// CLI Interface
async function main() {
  const backup = new DatabaseBackup();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'full':
        await backup.createFullBackup();
        break;
      case 'schema':
        await backup.createSchemaBackup();
        break;
      case 'data':
        await backup.createDataBackup();
        break;
      case 'custom':
        const tables = args.slice(1);
        if (tables.length === 0) {
          console.error('❌ Please specify tables for custom backup');
          process.exit(1);
        }
        await backup.createCustomBackup(tables);
        break;
      case 'list':
        await backup.listBackups();
        break;
      default:
        console.log(`
🗄️  Database Backup Tool

Usage:
  npm run backup:full     - Create full database backup
  npm run backup:schema   - Create schema-only backup  
  npm run backup:data     - Create data-only backup
  npm run backup:custom   - Create custom table backup
  npm run backup:list     - List available backups

Examples:
  npx tsx scripts/database-backup.ts full
  npx tsx scripts/database-backup.ts schema
  npx tsx scripts/database-backup.ts custom User Organization Property
        `);
    }
  } catch (error) {
    console.error('❌ Backup operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseBackup };
