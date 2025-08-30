#!/usr/bin/env ts-node
// File: scripts/fix-database-drift.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { config } from 'dotenv';
import { DatabaseBackup } from './database-backup';
import { DatabaseRestore } from './database-restore';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const execAsync = promisify(exec);

class DatabaseDriftFixer {
  private backup: DatabaseBackup;
  private restore: DatabaseRestore;
  private backupFile: string = '';

  constructor() {
    this.backup = new DatabaseBackup();
    this.restore = new DatabaseRestore();
  }

  async checkDriftStatus(): Promise<boolean> {
    console.log('🔍 Checking for database drift...');
    
    try {
      await execAsync('npx prisma migrate status');
      console.log('✅ No database drift detected');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('drift') || errorMessage.includes('reset')) {
        console.log('⚠️ Database drift detected - reset required');
        return true;
      } else {
        console.error('❌ Unknown migration status error:', errorMessage);
        throw error;
      }
    }
  }

  async createDataBackup(): Promise<string> {
    console.log('💾 Creating data backup before reset...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `drift-fix-backup-${timestamp}.sql`;
    
    // Create data-only backup (we'll recreate schema with migrations)
    this.backupFile = await this.backup.createDataBackup();
    
    console.log(`✅ Data backup created: ${this.backupFile}`);
    return this.backupFile;
  }

  async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting database to fix drift...');
    
    try {
      // Force reset without prompting
      await execAsync('npx prisma migrate reset --force');
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🔄 Running migrations to recreate schema...');
    
    try {
      // Deploy all migrations to recreate proper schema
      await execAsync('npx prisma migrate deploy');
      console.log('✅ Migrations deployed successfully');
    } catch (error) {
      console.error('❌ Migration deployment failed:', error);
      throw error;
    }
  }

  async restoreData(): Promise<void> {
    console.log('📥 Restoring data to new schema...');
    
    if (!this.backupFile) {
      throw new Error('No backup file available for restore');
    }

    try {
      // Restore data only (schema already created by migrations)
      await this.restore.restoreFromFile(this.backupFile, { 
        dataOnly: true,
        verbose: true 
      });
      
      console.log('✅ Data restored successfully');
    } catch (error) {
      console.error('❌ Data restore failed:', error);
      console.log(`💡 Manual restore command: npx tsx scripts/database-restore.ts restore "${this.backupFile}"`);
      throw error;
    }
  }

  async generatePrismaClient(): Promise<void> {
    console.log('🔄 Generating Prisma client...');
    
    try {
      await execAsync('npx prisma generate');
      console.log('✅ Prisma client generated');
    } catch (error) {
      console.error('❌ Prisma client generation failed:', error);
      throw error;
    }
  }

  async validateFix(): Promise<boolean> {
    console.log('🔍 Validating drift fix...');
    
    try {
      // Check migration status
      await execAsync('npx prisma migrate status');
      console.log('✅ Migration status: Clean');
      
      // Validate database structure
      const isValid = await this.restore.validateRestore();
      
      if (isValid) {
        console.log('🎉 Database drift fix completed successfully!');
        return true;
      } else {
        console.error('❌ Database validation failed after drift fix');
        return false;
      }
    } catch (error) {
      console.error('❌ Drift fix validation failed:', error);
      return false;
    }
  }

  async fixDrift(): Promise<void> {
    console.log('🚀 Starting database drift fix workflow...\n');
    
    try {
      // Step 1: Check if drift exists
      const hasDrift = await this.checkDriftStatus();
      if (!hasDrift) {
        console.log('✅ No drift detected - no action needed');
        return;
      }

      // Step 2: Create data backup
      await this.createDataBackup();

      // Step 3: Reset database
      await this.resetDatabase();

      // Step 4: Run migrations to recreate schema
      await this.runMigrations();

      // Step 5: Generate Prisma client
      await this.generatePrismaClient();

      // Step 6: Restore data
      await this.restoreData();

      // Step 7: Validate fix
      const isFixed = await this.validateFix();
      
      if (isFixed) {
        console.log('\n🎉 Database drift fix completed successfully!');
        console.log(`📁 Backup file preserved: ${this.backupFile}`);
        console.log('💡 You can now run your migrations normally');
      } else {
        throw new Error('Drift fix validation failed');
      }
      
    } catch (error) {
      console.error('\n❌ Database drift fix failed:', error);
      console.log('\n🔧 Manual recovery steps:');
      console.log('1. Check the backup file:', this.backupFile);
      console.log('2. Manually restore if needed:', `npx tsx scripts/database-restore.ts restore "${this.backupFile}"`);
      console.log('3. Check migration status:', 'npx prisma migrate status');
      throw error;
    }
  }

  async dryRun(): Promise<void> {
    console.log('🔍 DRY RUN - Database drift fix workflow preview:\n');
    
    const hasDrift = await this.checkDriftStatus();
    
    if (!hasDrift) {
      console.log('✅ No drift detected - no action would be taken');
      return;
    }

    console.log('📋 Steps that would be executed:');
    console.log('1. 💾 Create data-only backup');
    console.log('2. 🔄 Run: npx prisma migrate reset --force');
    console.log('3. 🔄 Run: npx prisma migrate deploy');
    console.log('4. 🔄 Run: npx prisma generate');
    console.log('5. 📥 Restore data from backup');
    console.log('6. 🔍 Validate database integrity');
    console.log('\n⚠️  This will temporarily delete all data (but restore it from backup)');
    console.log('💡 Run without --dry-run to execute');
  }
}

// CLI Interface
async function main() {
  const fixer = new DatabaseDriftFixer();
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  try {
    if (isDryRun) {
      await fixer.dryRun();
    } else {
      console.log('⚠️  WARNING: This will reset your database and restore from backup!');
      console.log('💡 Use --dry-run to preview actions without executing\n');
      
      // Give user a moment to cancel
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await fixer.fixDrift();
    }
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseDriftFixer };
