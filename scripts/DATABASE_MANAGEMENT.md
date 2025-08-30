# Database Management Tools

## 🎯 Overview

Comprehensive database backup, restore, and migration tools for your PMS application. These tools provide safe database operations with automatic backups and validation.

## 🛠️ Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`, `pg_restore`)
- Node.js and npm/yarn
- Environment variables properly configured (DATABASE_URL)

### Install PostgreSQL Client Tools

**Windows:**
```bash
# Install via Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Install via Homebrew
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-client
```

## 🗄️ Backup Operations

### Full Database Backup
```bash
# Create complete backup (schema + data)
npm run backup:full

# Manual execution
npx tsx scripts/database-backup.ts full
```

### Schema-Only Backup
```bash
# Backup database structure only
npm run backup:schema

# Manual execution
npx tsx scripts/database-backup.ts schema
```

### Data-Only Backup
```bash
# Backup data only (no schema)
npm run backup:data

# Manual execution
npx tsx scripts/database-backup.ts data
```

### Custom Table Backup
```bash
# Backup specific tables
npx tsx scripts/database-backup.ts custom User Organization Property

# Backup user-related tables
npx tsx scripts/database-backup.ts custom User UserOrg UserProperty
```

### List Available Backups
```bash
npm run backup:list
```

## 🔄 Restore Operations

### List Available Backups
```bash
npm run restore:list
```

### Restore from Backup
```bash
# Basic restore (keeps existing data)
npm run restore:restore -- full-backup-2024-01-15.sql

# Restore with drop existing tables (DESTRUCTIVE)
npm run restore:restore -- full-backup-2024-01-15.sql --drop

# Verbose restore with detailed output
npm run restore:restore -- full-backup-2024-01-15.sql --drop --verbose
```

### Restore Specific Tables
```bash
# Restore only specific tables
npx tsx scripts/database-restore.ts restore-tables backup-file.sql User Organization Property
```

### Validate Database
```bash
# Check database integrity after restore
npm run restore:validate
```

## 🔄 Migration Operations

### Check Migration Status
```bash
npm run migrate:status
```

### Development Migrations
```bash
# Create and run new migration
npm run migrate:dev -- "add-payment-fields"

# Manual execution
npx tsx scripts/database-migrate.ts dev "add-payment-fields"
```

### Production Deployment
```bash
# Deploy migrations to production
npm run migrate:deploy
```

### Schema Operations
```bash
# Push schema changes (development)
npm run migrate:push

# Validate schema
npm run migrate:validate

# Format schema file
npm run migrate:format

# Generate Prisma client
npm run migrate:generate
```

### Database Reset
```bash
# Reset database (DESTRUCTIVE - creates backup first)
npm run migrate:reset
```

### Seed Database
```bash
# Run database seeding
npm run migrate:seed
```

### Full Migration Workflow
```bash
# Run complete migration workflow with backup
npm run migrate:workflow -- "add-stripe-integration"
```

## 📁 File Structure

```
backups/
├── full-backup-2024-01-15T10-30-00.sql
├── schema-backup-2024-01-15T10-31-00.sql
├── data-backup-2024-01-15T10-32-00.sql
├── pre-migration/
│   └── pre-migration-backup-2024-01-15T10-33-00.sql
└── pre-restore/
    └── pre-restore-backup-2024-01-15T10-34-00.sql

scripts/
├── database-backup.ts      # Backup operations
├── database-restore.ts     # Restore operations
├── database-migrate.ts     # Migration operations
└── DATABASE_MANAGEMENT.md  # This documentation
```

## 🚨 Safety Features

### Automatic Backups
- **Pre-migration backups**: Created before any migration
- **Pre-restore backups**: Created before any restore operation
- **Timestamped files**: All backups include timestamp for easy identification

### Validation
- **Schema validation**: Ensures Prisma schema is valid before operations
- **Database validation**: Checks database integrity after operations
- **Table existence checks**: Verifies core tables exist after restore

### Error Handling
- **Rollback capability**: Pre-operation backups allow easy rollback
- **Detailed error messages**: Clear error reporting for troubleshooting
- **Safe defaults**: Operations default to safe modes unless explicitly overridden

## 🎯 Common Workflows

### Before Major Changes
```bash
# 1. Create full backup
npm run backup:full

# 2. Validate current state
npm run migrate:validate

# 3. Check migration status
npm run migrate:status
```

### Development Migration
```bash
# 1. Run full workflow (includes backup)
npm run migrate:workflow -- "your-migration-name"

# 2. Validate result
npm run restore:validate
```

### Production Deployment
```bash
# 1. Create production backup
npm run backup:full

# 2. Deploy migrations
npm run migrate:deploy

# 3. Validate deployment
npm run restore:validate
```

### Disaster Recovery
```bash
# 1. List available backups
npm run restore:list

# 2. Restore from backup (with drop)
npm run restore:restore -- latest-backup.sql --drop

# 3. Validate restoration
npm run restore:validate

# 4. Re-run migrations if needed
npm run migrate:deploy
```

## ⚠️ Important Notes

### Destructive Operations
- `--drop` flag will **DELETE ALL EXISTING DATA**
- `migrate:reset` will **RESET THE ENTIRE DATABASE**
- Always create backups before destructive operations

### Environment Variables
Ensure these are set in your `.env` or `.env.local`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Permissions
- Database user needs CREATE, DROP, INSERT, UPDATE, DELETE permissions
- For production, use dedicated backup user with appropriate permissions

## 🔧 Troubleshooting

### Common Issues

**"pg_dump: command not found"**
- Install PostgreSQL client tools (see Prerequisites)

**"DATABASE_URL environment variable is required"**
- Check your `.env` files contain DATABASE_URL
- Verify `prisma.config.ts` is loading environment variables

**"Permission denied"**
- Check database user permissions
- Verify connection string credentials

**"Backup file not found"**
- Use `npm run restore:list` to see available backups
- Check file path is correct

### Getting Help
1. Check the error messages - they're designed to be helpful
2. Verify your environment variables are set correctly
3. Ensure PostgreSQL client tools are installed and accessible
4. Check database connectivity with: `npx prisma db pull`

## 📊 Monitoring

### Backup Monitoring
- Backups are stored in `./backups/` directory
- Files are timestamped for easy identification
- Check backup sizes to ensure they're complete

### Migration Monitoring
- Use `npm run migrate:status` to check current state
- Monitor logs during migration operations
- Validate database after major changes

---

**🎯 Remember**: Always test your backup and restore procedures in a development environment before using in production!
