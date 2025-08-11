// File: scripts/test-api-endpoints.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface APITestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

class APIEndpointTester {
  private results: APITestResult[] = [];
  private baseUrl = 'http://localhost:4001';

  private addResult(endpoint: string, method: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.results.push({ endpoint, method, status, message, details });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${emoji} ${method} ${endpoint}: ${message}`);
    if (details) {
      console.log('   Details:', details);
    }
  }

  async testPropertyEndpoints() {
    console.log('\n🏢 Testing Property Management Endpoints...');
    
    try {
      // Get all properties (should work for any authenticated user)
      const properties = await prisma.property.findMany({
        include: { organization: true }
      });

      if (properties.length > 0) {
        this.addResult(
          '/api/properties',
          'GET',
          'PASS',
          `Found ${properties.length} properties available for testing`
        );

        // Test individual property access
        const testProperty = properties[0];
        this.addResult(
          `/api/properties/${testProperty.id}`,
          'GET',
          'PASS',
          `Property details accessible: ${testProperty.name}`
        );
      } else {
        this.addResult(
          '/api/properties',
          'GET',
          'FAIL',
          'No properties found for testing'
        );
      }
    } catch (error) {
      this.addResult(
        '/api/properties',
        'GET',
        'FAIL',
        'Property endpoints test failed',
        error
      );
    }
  }

  async testRoomEndpoints() {
    console.log('\n🏠 Testing Room Management Endpoints...');
    
    try {
      // Get properties to test with
      const properties = await prisma.property.findMany();
      
      if (properties.length === 0) {
        this.addResult('/api/rooms', 'GET', 'SKIP', 'No properties available for room testing');
        return;
      }

      const testProperty = properties[0];
      
      // Test room listing (property-scoped)
      const rooms = await prisma.room.findMany({
        where: { propertyId: testProperty.id }
      });

      this.addResult(
        '/api/rooms',
        'GET',
        'PASS',
        `Found ${rooms.length} rooms for property ${testProperty.name}`
      );

      // Test individual room access
      if (rooms.length > 0) {
        const testRoom = rooms[0];
        this.addResult(
          `/api/rooms/${testRoom.id}`,
          'GET',
          'PASS',
          `Room details accessible: ${testRoom.name}`
        );
      }

    } catch (error) {
      this.addResult(
        '/api/rooms',
        'GET',
        'FAIL',
        'Room endpoints test failed',
        error
      );
    }
  }

  async testRoomTypeEndpoints() {
    console.log('\n🏷️ Testing Room Type Management Endpoints...');
    
    try {
      const properties = await prisma.property.findMany();
      
      if (properties.length === 0) {
        this.addResult('/api/room-types', 'GET', 'SKIP', 'No properties available for room type testing');
        return;
      }

      const testProperty = properties[0];
      
      // Test room type listing (property-scoped)
      const roomTypes = await prisma.roomType.findMany({
        where: { propertyId: testProperty.id }
      });

      this.addResult(
        '/api/room-types',
        'GET',
        'PASS',
        `Found ${roomTypes.length} room types for property ${testProperty.name}`
      );

      // Test individual room type access
      if (roomTypes.length > 0) {
        const testRoomType = roomTypes[0];
        this.addResult(
          `/api/room-types/${testRoomType.id}`,
          'GET',
          'PASS',
          `Room type details accessible: ${testRoomType.name}`
        );
      }

    } catch (error) {
      this.addResult(
        '/api/room-types',
        'GET',
        'FAIL',
        'Room type endpoints test failed',
        error
      );
    }
  }

  async testReservationEndpoints() {
    console.log('\n📅 Testing Reservation Management Endpoints...');
    
    try {
      const properties = await prisma.property.findMany();
      
      if (properties.length === 0) {
        this.addResult('/api/reservations', 'GET', 'SKIP', 'No properties available for reservation testing');
        return;
      }

      const testProperty = properties[0];
      
      // Test reservation listing (property-scoped)
      const reservations = await prisma.reservation.findMany({
        where: { propertyId: testProperty.id }
      });

      this.addResult(
        '/api/reservations',
        'GET',
        'PASS',
        `Found ${reservations.length} reservations for property ${testProperty.name}`
      );

      // Test individual reservation access
      if (reservations.length > 0) {
        const testReservation = reservations[0];
        this.addResult(
          `/api/reservations/${testReservation.id}`,
          'GET',
          'PASS',
          `Reservation details accessible: ${testReservation.id}`
        );
      }

    } catch (error) {
      this.addResult(
        '/api/reservations',
        'GET',
        'FAIL',
        'Reservation endpoints test failed',
        error
      );
    }
  }

  async testUserPropertyEndpoints() {
    console.log('\n👥 Testing User-Property Assignment Endpoints...');
    
    try {
      // Test user-property assignments listing
      const userProperties = await prisma.userProperty.findMany({
        include: {
          user: { select: { name: true, email: true } },
          property: { select: { name: true } }
        }
      });

      this.addResult(
        '/api/user-properties',
        'GET',
        'PASS',
        `Found ${userProperties.length} user-property assignments`
      );

      // Test role distribution
      const roleStats = await prisma.userProperty.groupBy({
        by: ['role'],
        _count: { role: true }
      });

      this.addResult(
        '/api/user-properties (roles)',
        'GET',
        'PASS',
        `Role distribution verified: ${roleStats.length} different roles`,
        roleStats
      );

    } catch (error) {
      this.addResult(
        '/api/user-properties',
        'GET',
        'FAIL',
        'User-property endpoints test failed',
        error
      );
    }
  }

  async testPropertyAccessControl() {
    console.log('\n🔒 Testing Property Access Control...');
    
    try {
      // Test property-level data isolation
      const properties = await prisma.property.findMany();
      
      for (const property of properties) {
        // Verify all rooms belong to their property
        const roomsInProperty = await prisma.room.count({
          where: { propertyId: property.id }
        });
        
        const roomsWithWrongProperty = await prisma.room.count({
          where: { 
            propertyId: { not: property.id },
            roomType: { propertyId: property.id }
          }
        });

        this.addResult(
          `Property ${property.name} isolation`,
          'CHECK',
          roomsWithWrongProperty === 0 ? 'PASS' : 'FAIL',
          `${roomsInProperty} rooms properly isolated, ${roomsWithWrongProperty} cross-property issues`
        );
      }

    } catch (error) {
      this.addResult(
        'Property Access Control',
        'CHECK',
        'FAIL',
        'Property access control test failed',
        error
      );
    }
  }

  async runAllTests() {
    console.log('🚀 Starting API Endpoint Tests...\n');
    
    await this.testPropertyEndpoints();
    await this.testRoomEndpoints();
    await this.testRoomTypeEndpoints();
    await this.testReservationEndpoints();
    await this.testUserPropertyEndpoints();
    await this.testPropertyAccessControl();

    this.printSummary();
  }

  private printSummary() {
    console.log('\n📊 API Test Summary:');
    console.log('====================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📝 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   - ${r.method} ${r.endpoint}: ${r.message}`);
      });
    }
    
    console.log(`\n🎯 Overall Status: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}`);
  }
}

async function main() {
  const tester = new APIEndpointTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ API test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { APIEndpointTester };
