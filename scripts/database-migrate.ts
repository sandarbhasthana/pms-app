#!/usr/bin/env ts-node
// File: scripts/database-migrate.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { DatabaseBackup } from './database-backup';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface MigrationOptions {
  createBackup?: boolean;
  skipGenerate?: boolean;
  resetDatabase?: boolean;
  seedAfter?: boolean;
  dryRun?: boolean;
}

class DatabaseMigration {
  private backup: DatabaseBackup;

  constructor() {
    this.backup = new DatabaseBackup();
  }

  async checkPrismaStatus(): Promise<void> {
    console.log('🔍 Checking Prisma status...');
    
    try {
      const { stdout } = await execAsync('npx prisma migrate status');
      console.log('📊 Migration status:');
      console.log(stdout);
    } catch (error) {
      console.warn('⚠️ Could not check migration status:', error);
    }
  }

  async createPreMigrationBackup(): Promise<string> {
    console.log('🔄 Creating pre-migration backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = await this.backup.createFullBackup({
      outputDir: path.join(process.cwd(), 'backups', 'pre-migration')
    });
    
    console.log(`✅ Pre-migration backup created: ${backupPath}`);
    return backupPath;
  }

  async generatePrismaClient(): Promise<void> {
    console.log('🔄 Generating Prisma client...');
    
    try {
      await execAsync('npx prisma generate');
      console.log('✅ Prisma client generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate Prisma client:', error);
      throw error;
    }
  }

  async runMigrations(name?: string, options: MigrationOptions = {}): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    // Create backup before migration
    if (options.createBackup !== false) {
      await this.createPreMigrationBackup();
    }

    try {
      let command = 'npx prisma migrate dev';
      
      if (name) {
        command += ` --name "${name}"`;
      }
      
      if (options.skipGenerate) {
        command += ' --skip-generate';
      }

      if (options.dryRun) {
        console.log(`🔍 Would run: ${command}`);
        return;
      }

      const { stdout, stderr } = await execAsync(command);
      
      console.log('📝 Migration output:');
      if (stdout) console.log(stdout);
      if (stderr) console.warn('⚠️ Migration warnings:', stderr);
      
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async deployMigrations(): Promise<void> {
    console.log('🔄 Deploying migrations (production mode)...');
    
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
      
      console.log('📝 Deploy output:');
      if (stdout) console.log(stdout);
      if (stderr) console.warn('⚠️ Deploy warnings:', stderr);
      
      console.log('✅ Migrations deployed successfully');
    } catch (error) {
      console.error('❌ Migration deployment failed:', error);
      throw error;
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting database...');
    
    // Create backup before reset
    await this.createPreMigrationBackup();
    
    try {
      await execAsync('npx prisma migrate reset --force');
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async seedDatabase(): Promise<void> {
    console.log('🌱 Seeding database...');
    
    try {
      await execAsync('npx prisma db seed');
      console.log('✅ Database seeded successfully');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async pushSchema(): Promise<void> {
    console.log('🔄 Pushing schema changes (development mode)...');
    
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push');
      
      console.log('📝 Push output:');
      if (stdout) console.log(stdout);
      if (stderr) console.warn('⚠️ Push warnings:', stderr);
      
      console.log('✅ Schema pushed successfully');
    } catch (error) {
      console.error('❌ Schema push failed:', error);
      throw error;
    }
  }

  async validateSchema(): Promise<boolean> {
    console.log('🔍 Validating Prisma schema...');
    
    try {
      await execAsync('npx prisma validate');
      console.log('✅ Schema validation passed');
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  async formatSchema(): Promise<void> {
    console.log('🔄 Formatting Prisma schema...');
    
    try {
      await execAsync('npx prisma format');
      console.log('✅ Schema formatted successfully');
    } catch (error) {
      console.error('❌ Schema formatting failed:', error);
      throw error;
    }
  }

  async introspectDatabase(): Promise<void> {
    console.log('🔄 Introspecting database...');
    
    try {
      await execAsync('npx prisma db pull');
      console.log('✅ Database introspection completed');
    } catch (error) {
      console.error('❌ Database introspection failed:', error);
      throw error;
    }
  }

  async runFullMigrationWorkflow(migrationName: string): Promise<void> {
    console.log('🚀 Running full migration workflow...');
    
    try {
      // 1. Validate schema
      const isValid = await this.validateSchema();
      if (!isValid) {
        throw new Error('Schema validation failed');
      }

      // 2. Format schema
      await this.formatSchema();

      // 3. Create backup
      await this.createPreMigrationBackup();

      // 4. Run migration
      await this.runMigrations(migrationName);

      // 5. Generate client
      await this.generatePrismaClient();

      // 6. Check status
      await this.checkPrismaStatus();

      console.log('🎉 Full migration workflow completed successfully!');
    } catch (error) {
      console.error('❌ Migration workflow failed:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const migration = new DatabaseMigration();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'status':
        await migration.checkPrismaStatus();
        break;
        
      case 'dev':
        const migrationName = args[1];
        if (!migrationName) {
          console.error('❌ Please provide migration name');
          process.exit(1);
        }
        await migration.runMigrations(migrationName);
        break;
        
      case 'deploy':
        await migration.deployMigrations();
        break;
        
      case 'reset':
        await migration.resetDatabase();
        break;
        
      case 'push':
        await migration.pushSchema();
        break;
        
      case 'seed':
        await migration.seedDatabase();
        break;
        
      case 'generate':
        await migration.generatePrismaClient();
        break;
        
      case 'validate':
        const isValid = await migration.validateSchema();
        process.exit(isValid ? 0 : 1);
        break;
        
      case 'format':
        await migration.formatSchema();
        break;
        
      case 'introspect':
        await migration.introspectDatabase();
        break;
        
      case 'workflow':
        const workflowName = args[1];
        if (!workflowName) {
          console.error('❌ Please provide migration name for workflow');
          process.exit(1);
        }
        await migration.runFullMigrationWorkflow(workflowName);
        break;
        
      default:
        console.log(`
🔄 Database Migration Tool

Usage:
  npm run migrate:status      - Check migration status
  npm run migrate:dev <name>  - Run development migration
  npm run migrate:deploy      - Deploy migrations (production)
  npm run migrate:reset       - Reset database
  npm run migrate:push        - Push schema changes
  npm run migrate:seed        - Seed database
  npm run migrate:generate    - Generate Prisma client
  npm run migrate:validate    - Validate schema
  npm run migrate:format      - Format schema
  npm run migrate:introspect  - Introspect database
  npm run migrate:workflow    - Run full migration workflow

Examples:
  npx tsx scripts/database-migrate.ts dev "add-payment-fields"
  npx tsx scripts/database-migrate.ts workflow "add-stripe-integration"
  npx tsx scripts/database-migrate.ts deploy
        `);
    }
  } catch (error) {
    console.error('❌ Migration operation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseMigration };
