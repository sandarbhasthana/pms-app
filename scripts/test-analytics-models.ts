// Test script to verify analytics models are working correctly

import { PrismaClient } from '@prisma/client';
import { MetricsCollectionService } from '../src/lib/services/metrics-collection';
import { ActivityTracker } from '../src/lib/services/activity-tracker';

const prisma = new PrismaClient();

async function testAnalyticsModels() {
  console.log('🧪 Testing Analytics Models...\n');

  try {
    // Test 1: Create system metrics
    console.log('1️⃣ Testing SystemMetrics model...');
    const systemMetrics = await MetricsCollectionService.updateSystemMetrics();
    console.log('✅ SystemMetrics created:', {
      totalOrganizations: systemMetrics.totalOrganizations,
      totalUsers: systemMetrics.totalUsers,
      totalProperties: systemMetrics.totalProperties,
      totalReservations: systemMetrics.totalReservations,
    });

    // Test 2: Create organization metrics
    console.log('\n2️⃣ Testing OrganizationMetrics model...');
    await MetricsCollectionService.updateOrganizationMetrics();
    const orgMetrics = await prisma.organizationMetrics.findMany({
      include: {
        organization: {
          select: { name: true }
        }
      }
    });
    console.log(`✅ OrganizationMetrics created for ${orgMetrics.length} organizations`);
    orgMetrics.forEach(metric => {
      console.log(`   - ${metric.organization.name}: ${metric.totalUsers} users, ${metric.totalProperties} properties`);
    });

    // Test 3: Track system activity
    console.log('\n3️⃣ Testing SystemActivity model...');
    await ActivityTracker.trackActivity('SYSTEM_MAINTENANCE', {
      metadata: { reason: 'Analytics models testing' }
    });
    
    const recentActivities = await ActivityTracker.getRecentActivities(5);
    console.log(`✅ SystemActivity tracked. Recent activities: ${recentActivities.length}`);
    recentActivities.forEach(activity => {
      console.log(`   - ${activity.type}: ${activity.description}`);
    });

    // Test 4: Create onboarding tracking
    console.log('\n4️⃣ Testing OnboardingTracking model...');
    const firstOrg = await prisma.organization.findFirst();
    if (firstOrg) {
      await prisma.onboardingTracking.upsert({
        where: { organizationId: firstOrg.id },
        create: {
          organizationId: firstOrg.id,
          orgDetailsCompleted: true,
          orgDetailsCompletedAt: new Date(),
          adminUserCompleted: true,
          adminUserCompletedAt: new Date(),
          reviewCompleted: true,
          reviewCompletedAt: new Date(),
          completedAt: new Date(),
          timeToComplete: 15, // 15 minutes
        },
        update: {
          orgDetailsCompleted: true,
          adminUserCompleted: true,
          reviewCompleted: true,
        }
      });
      console.log(`✅ OnboardingTracking created for organization: ${firstOrg.name}`);
    }

    // Test 5: Create system health record
    console.log('\n5️⃣ Testing SystemHealth model...');
    await prisma.systemHealth.create({
      data: {
        avgResponseTime: 150.5,
        errorRate: 0.02,
        uptime: 99.9,
        dbConnections: 10,
        dbQueryTime: 25.3,
        memoryUsage: 65.2,
        cpuUsage: 45.8,
        activeUsers: systemMetrics.activeUsers,
        ongoingReservations: 5,
      }
    });
    console.log('✅ SystemHealth record created');

    // Test 6: Create error log
    console.log('\n6️⃣ Testing ErrorLog model...');
    await prisma.errorLog.create({
      data: {
        errorType: 'TEST_ERROR',
        errorMessage: 'This is a test error for analytics validation',
        endpoint: '/api/test',
        method: 'GET',
        isResolved: true,
        resolvedAt: new Date(),
        resolution: 'Test error resolved automatically',
      }
    });
    console.log('✅ ErrorLog record created');

    // Test 7: Get system overview
    console.log('\n7️⃣ Testing system overview...');
    const overview = await MetricsCollectionService.getSystemOverview();
    console.log('✅ System overview retrieved:', {
      organizationCount: overview.organizationCount,
      userCount: overview.userCount,
      propertyCount: overview.propertyCount,
      reservationCount: overview.reservationCount,
      activeUserCount: overview.activeUserCount,
    });

    // Test 8: Get activity statistics
    console.log('\n8️⃣ Testing activity statistics...');
    const activityStats = await ActivityTracker.getActivityStatistics(30);
    console.log(`✅ Activity statistics retrieved for last 30 days: ${activityStats.length} activity types`);
    activityStats.slice(0, 3).forEach(stat => {
      console.log(`   - ${stat.label}: ${stat.count} occurrences`);
    });

    console.log('\n🎉 All analytics models are working correctly!');
    console.log('\n📊 Summary:');
    console.log('   ✅ SystemMetrics - Platform-wide statistics');
    console.log('   ✅ OrganizationMetrics - Per-organization tracking');
    console.log('   ✅ SystemActivity - Audit trail and activity feed');
    console.log('   ✅ OnboardingTracking - Onboarding flow analytics');
    console.log('   ✅ SystemHealth - Performance monitoring');
    console.log('   ✅ ErrorLog - Error tracking and resolution');
    console.log('   ✅ MetricsCollectionService - Data aggregation');
    console.log('   ✅ ActivityTracker - Event tracking');

  } catch (error) {
    console.error('❌ Analytics models test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsModels()
    .then(() => {
      console.log('\n✅ Analytics models test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analytics models test failed:', error);
      process.exit(1);
    });
}

export { testAnalyticsModels };
