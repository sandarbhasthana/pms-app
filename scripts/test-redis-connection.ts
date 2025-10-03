/**
 * Test Redis Connection
 * 
 * Simple script to test Redis connection for BullMQ setup
 */

import { redisConnection } from '../src/lib/queue/redis';

async function testRedisConnection() {
  console.log('🔌 Testing Redis connection...\n');
  
  try {
    // Test basic connection
    console.log('1️⃣ Connecting to Redis...');
    await redisConnection.ping();
    console.log('✅ Redis PING successful\n');
    
    // Test basic operations
    console.log('2️⃣ Testing basic operations...');
    
    // Set a test key
    await redisConnection.set('test:bullmq', 'connection-test', 'EX', 60);
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await redisConnection.get('test:bullmq');
    console.log(`✅ GET operation successful: ${value}`);
    
    // Test list operations (used by BullMQ)
    await redisConnection.lpush('test:queue', 'job1', 'job2');
    const queueLength = await redisConnection.llen('test:queue');
    console.log(`✅ LIST operations successful: queue length = ${queueLength}`);
    
    // Clean up test data
    await redisConnection.del('test:bullmq', 'test:queue');
    console.log('✅ Cleanup successful\n');
    
    // Test Redis info
    console.log('3️⃣ Redis server info...');
    const info = await redisConnection.info('server');
    const lines = info.split('\r\n').filter(line => 
      line.includes('redis_version') || 
      line.includes('redis_mode') || 
      line.includes('tcp_port')
    );
    lines.forEach(line => console.log(`📊 ${line}`));
    
    console.log('\n🎉 Redis connection test completed successfully!');
    console.log('✅ BullMQ should work properly with this Redis setup');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Make sure Redis is running in WSL');
      console.log('   2. Check if port forwarding is enabled: netsh interface portproxy show all');
      console.log('   3. Verify Redis is listening on 0.0.0.0:6379 (not just 127.0.0.1)');
      console.log('   4. Check Windows Firewall settings');
    }
    
    if (error.message?.includes('WRONGPASS')) {
      console.log('\n💡 Authentication issue:');
      console.log('   1. Check if the password "Sandhu123" is correct');
      console.log('   2. Verify Redis AUTH configuration in redis.conf');
    }
    
  } finally {
    // Close connection
    await redisConnection.quit();
    console.log('\n🔌 Redis connection closed');
    process.exit(0);
  }
}

// Run the test
testRedisConnection();
