// Script to check SUPER_ADMIN user setup

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  console.log('🔍 Checking SUPER_ADMIN user setup...\n');

  try {
    // Find the superadmin user
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@example.com' },
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!superAdmin) {
      console.log('❌ superadmin@example.com not found');
      return;
    }

    console.log('✅ SUPER_ADMIN user found:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Phone: ${superAdmin.phone}`);
    console.log(`   Has Password: ${superAdmin.password ? 'Yes' : 'No'}`);
    console.log(`   Created: ${superAdmin.createdAt}`);

    console.log(`\n📋 Organization Memberships: ${superAdmin.memberships.length}`);
    
    if (superAdmin.memberships.length === 0) {
      console.log('   ✅ No organization memberships (correct for SUPER_ADMIN)');
      console.log('   → Should redirect to /admin/organizations');
    } else {
      console.log('   ⚠️  Has organization memberships:');
      superAdmin.memberships.forEach((membership, index) => {
        console.log(`   ${index + 1}. ${membership.organization.name} (${membership.role})`);
      });
      console.log('   → Will redirect to /onboarding/select-organization');
    }

    // Test what the auth system would return
    console.log('\n🔐 Auth System Behavior:');
    if (superAdmin.memberships.length === 0) {
      console.log('   Role: SUPER_ADMIN (no org membership)');
      console.log('   OrgId: null');
      console.log('   Redirect: /admin/organizations ✅');
    } else {
      const firstMembership = superAdmin.memberships[0];
      console.log(`   Role: ${firstMembership.role}`);
      console.log(`   OrgId: ${firstMembership.organizationId}`);
      console.log('   Redirect: /onboarding/select-organization');
    }

    console.log('\n🧪 Testing Recommendations:');
    if (!superAdmin.password) {
      console.log('   1. Add password for standard login testing');
      console.log('   2. Test dev login (should work)');
      console.log('   3. Test standard login (after adding password)');
    } else {
      console.log('   1. Test dev login with: superadmin@example.com');
      console.log('   2. Test standard login with: superadmin@example.com / [password]');
    }

  } catch (error) {
    console.error('❌ Error checking SUPER_ADMIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkSuperAdmin();
