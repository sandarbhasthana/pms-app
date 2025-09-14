#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting deployment process...');

try {
  // First, try to initialize the migration system
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Try to deploy migrations, if it fails, use db push
  console.log('🔄 Attempting to deploy migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations deployed successfully');
  } catch (migrationError) {
    console.log('⚠️  Migration deploy failed, falling back to db push...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema pushed successfully');
    } catch (pushError) {
      console.log('❌ Both migration deploy and db push failed');
      throw pushError;
    }
  }

  // Build the application
  console.log('🏗️  Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('🎉 Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
