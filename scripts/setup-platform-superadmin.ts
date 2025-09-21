// Script to set up proper platform-level SUPER_ADMIN

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function setupPlatformSuperAdmin() {
  console.log('🚀 Setting up platform-level SUPER_ADMIN...\n');

  try {
    console.log('1️⃣ Checking current superadmin@example.com setup...');
    
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@example.com' },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (existingSuperAdmin && existingSuperAdmin.memberships.length > 0) {
      console.log(`   ⚠️  Current superadmin has ${existingSuperAdmin.memberships.length} org membership(s)`);
      console.log('   → This makes them org-level admin, not platform-level');
      
      console.log('\n2️⃣ Creating separate platform-level SUPER_ADMIN...');
      
      // Create new platform-level super admin
      const platformAdmin = await prisma.user.create({
        data: {
          name: 'Platform Administrator',
          email: 'platform@example.com',
          password: await hash('PlatformAdmin123!', 12),
        }
      });

      console.log(`   ✅ Created platform admin: ${platformAdmin.email}`);
      console.log(`   📧 Email: platform@example.com`);
      console.log(`   🔑 Password: PlatformAdmin123!`);
      console.log(`   🎯 No organization memberships → Goes to /admin/organizations`);

      // Also add password to existing superadmin for org-level testing
      if (!existingSuperAdmin.password) {
        await prisma.user.update({
          where: { id: existingSuperAdmin.id },
          data: { password: await hash('SuperAdmin123!', 12) }
        });
        console.log(`\n   ✅ Added password to existing org-level superadmin`);
        console.log(`   📧 Email: superadmin@example.com`);
        console.log(`   🔑 Password: SuperAdmin123!`);
        console.log(`   🏢 Organization: ${existingSuperAdmin.memberships[0].organization.name}`);
      }

    } else if (existingSuperAdmin && existingSuperAdmin.memberships.length === 0) {
      console.log('   ✅ Existing superadmin has no org memberships (correct setup)');
      
      // Just add password if missing
      if (!existingSuperAdmin.password) {
        await prisma.user.update({
          where: { id: existingSuperAdmin.id },
          data: { password: await hash('SuperAdmin123!', 12) }
        });
        console.log(`   ✅ Added password to platform superadmin`);
        console.log(`   📧 Email: superadmin@example.com`);
        console.log(`   🔑 Password: SuperAdmin123!`);
      } else {
        console.log(`   ✅ Platform superadmin already has password`);
      }

    } else {
      console.log('   ❌ No existing superadmin found');
      
      console.log('\n2️⃣ Creating platform-level SUPER_ADMIN...');
      
      const platformAdmin = await prisma.user.create({
        data: {
          name: 'Platform Administrator',
          email: 'superadmin@example.com',
          password: await hash('SuperAdmin123!', 12),
        }
      });

      console.log(`   ✅ Created platform admin: ${platformAdmin.email}`);
      console.log(`   🔑 Password: SuperAdmin123!`);
    }

    console.log('\n🧪 Testing Instructions:');
    console.log('');
    console.log('📋 Platform-Level Admin (goes to /admin/organizations):');
    if (existingSuperAdmin && existingSuperAdmin.memberships.length > 0) {
      console.log('   📧 Email: platform@example.com');
      console.log('   🔑 Password: PlatformAdmin123!');
    } else {
      console.log('   📧 Email: superadmin@example.com');
      console.log('   🔑 Password: SuperAdmin123!');
    }
    console.log('   🎯 Expected: Redirect to /admin/organizations');
    console.log('');
    console.log('🏢 Organization-Level Admin (goes to org dashboard):');
    console.log('   📧 Email: admin@example.com');
    console.log('   🔑 Password: TestPass123!');
    console.log('   🎯 Expected: Redirect to /onboarding/select-organization');

    if (existingSuperAdmin && existingSuperAdmin.memberships.length > 0) {
      console.log('');
      console.log('🏢 Organization-Level SUPER_ADMIN:');
      console.log('   📧 Email: superadmin@example.com');
      console.log('   🔑 Password: SuperAdmin123!');
      console.log('   🎯 Expected: Redirect to /onboarding/select-organization');
    }

  } catch (error) {
    console.error('❌ Error setting up platform SUPER_ADMIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setupPlatformSuperAdmin();
