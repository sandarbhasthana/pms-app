# Performance Monitoring System Implementation

## 📊 Overview

The Performance Monitoring System provides comprehensive real-time monitoring and alerting for the PMS application, tracking API performance, database metrics, queue health, and system resources.

## 🏗️ Architecture

### Core Components

1. **Performance Monitoring Service** (`src/lib/performance-monitoring/performance-service.ts`)
   - Central service for collecting and analyzing performance metrics
   - Buffered metric collection for optimal performance
   - Real-time alerting based on configurable thresholds
   - Dashboard data aggregation and trend analysis

2. **System Health Monitor** (`src/lib/performance-monitoring/system-health.ts`)
   - Automated system resource monitoring (CPU, memory, disk)
   - Application-specific metrics (active users, ongoing reservations)
   - Database performance tracking
   - Health snapshot generation with status indicators

3. **Performance Middleware** (`withPerformanceTracking`)
   - Automatic API response time tracking
   - Error rate monitoring
   - Request/response instrumentation

## 📋 Database Schema

### Performance Metrics Table
```sql
model PerformanceMetric {
  id            String              @id @default(cuid())
  metricType    PerformanceMetricType
  name          String
  value         Float
  unit          String
  tags          Json?
  service       String?
  endpoint      String?
  operation     String?
  timestamp     DateTime            @default(now())
  duration      Int?
  organizationId String?
  propertyId     String?
  userId         String?
  organization   Organization?       @relation(fields: [organizationId], references: [id])
  property       Property?           @relation(fields: [propertyId], references: [id])
  user           User?               @relation(fields: [userId], references: [id])
  @@index([metricType, timestamp])
  @@index([service, timestamp])
  @@map("performance_metrics")
}
```

### Queue Metrics Table
```sql
model QueueMetric {
  id            String              @id @default(cuid())
  queueName     String
  jobId         String?
  jobType       String
  status        QueueJobStatus
  createdAt     DateTime            @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  failedAt      DateTime?
  duration      Int?
  waitTime      Int?
  attempts      Int                 @default(1)
  maxAttempts   Int                 @default(3)
  priority      Int                 @default(0)
  delay         Int?
  errorMessage  String?             @db.Text
  stackTrace    String?             @db.Text
  data          Json?
  result        Json?
  organizationId String?
  propertyId     String?
  organization   Organization?       @relation(fields: [organizationId], references: [id])
  property       Property?           @relation(fields: [propertyId], references: [id])
  @@index([queueName, status, createdAt])
  @@map("queue_metrics")
}
```

### System Health Table
```sql
model SystemHealth {
  id                  String   @id @default(cuid())
  timestamp           DateTime @default(now())
  avgResponseTime     Float
  errorRate           Float
  uptime              Float
  dbConnections       Int
  dbQueryTime         Float
  memoryUsage         Float
  cpuUsage            Float
  activeUsers         Int
  ongoingReservations Int
  createdAt           DateTime @default(now())
  @@index([timestamp])
  @@map("system_health")
}
```

## 🚀 Key Features

### 1. Comprehensive Metric Collection
- **API Performance**: Response times, throughput, error rates
- **Database Performance**: Query execution times, connection pool usage
- **Queue Monitoring**: Job processing times, queue depth, failure rates
- **System Resources**: CPU, memory, disk usage
- **Application Metrics**: Active users, ongoing reservations

### 2. Real-time Alerting
- **Response Time Alerts**: Configurable thresholds (default: 2s warning, 5s critical)
- **Error Rate Monitoring**: Alert on error rates > 5%
- **Queue Depth Alerts**: Monitor job backlogs > 50 jobs
- **Database Performance**: Slow query detection (> 500ms)
- **System Resource Alerts**: CPU > 80%, Memory > 85%

### 3. Performance Dashboard
- **API Metrics**: Average response time, requests per minute, slowest endpoints
- **Database Metrics**: Query performance, connection usage, slow query percentage
- **Queue Health**: Processing times, queue depths, failure rates by queue
- **System Health**: Resource usage, uptime, active connections
- **Trend Analysis**: Historical performance data with time-series charts

### 4. Intelligent Monitoring
- **Buffered Collection**: Metrics batched for optimal database performance
- **Automatic Cleanup**: Configurable data retention (default: 30 days)
- **Multi-tenant Support**: Organization and property-level filtering
- **Performance Tracking Middleware**: Automatic instrumentation for API routes

## 🔧 Usage Examples

### Basic Metric Recording
```typescript
import { performanceMonitoringService } from '@/lib/performance-monitoring/performance-service';

// Record API response time
await performanceMonitoringService.recordMetric({
  metricType: PerformanceMetricType.API_RESPONSE_TIME,
  name: 'api_endpoint_performance',
  value: 250, // milliseconds
  unit: 'ms',
  service: 'api',
  endpoint: '/api/reservations',
  organizationId: 'org-123'
});
```

### Using Performance Middleware
```typescript
import { withPerformanceTracking } from '@/lib/performance-monitoring/performance-service';

const trackedFunction = withPerformanceTracking(
  async (data) => {
    // Your function logic
    return await processReservation(data);
  },
  {
    name: 'process_reservation',
    service: 'reservations',
    operation: 'create',
    organizationId: 'org-123'
  }
);
```

### System Health Monitoring
```typescript
import { systemHealthMonitor } from '@/lib/performance-monitoring/system-health';

// Start automated monitoring (every 60 seconds)
systemHealthMonitor.startMonitoring(60000);

// Get current health snapshot
const health = await systemHealthMonitor.getHealthSnapshot();
console.log(`System Status: ${health.status}`);
console.log(`CPU Usage: ${health.metrics.cpu}%`);
```

## 🧪 Test API

The system includes a comprehensive test API at `/api/performance/test` with the following actions:

- **setup**: Initialize performance monitoring with test data
- **test-metrics**: Generate sample performance metrics
- **test-queue**: Create test queue job metrics
- **health**: Get current system health snapshot
- **dashboard**: Retrieve complete dashboard data
- **start-monitoring**: Begin automated system monitoring
- **stop-monitoring**: Stop automated monitoring
- **cleanup**: Remove old metrics data

### Example Usage
```bash
# Initialize the system
curl http://localhost:4001/api/performance/test?action=setup

# Generate test metrics
curl http://localhost:4001/api/performance/test?action=test-metrics

# Get system health
curl http://localhost:4001/api/performance/test?action=health

# Get dashboard data
curl http://localhost:4001/api/performance/test?action=dashboard
```

## 📈 Performance Alerts

### Alert Types and Thresholds

1. **Response Time Alerts**
   - Warning: > 2000ms
   - Critical: > 5000ms
   - Spike Detection: Recent avg > 1.5x overall avg

2. **Error Rate Alerts**
   - Medium: > 5%
   - High: > 10%
   - Critical: > 15%

3. **Database Performance**
   - Slow Queries: > 500ms average
   - Critical: > 2000ms average
   - Slow Query Percentage: > 20%

4. **Queue Monitoring**
   - Queue Depth: > 50 jobs (medium), > 100 (high), > 200 (critical)
   - Job Failure Rate: > 10% (medium), > 15% (high), > 25% (critical)

5. **System Resources**
   - CPU Usage: > 80% (high), > 95% (critical)
   - Memory Usage: > 85% (high), > 95% (critical)

## 🔄 Integration Points

### Error Tracking Integration
- Performance alerts integrate with the error tracking system
- Critical performance issues automatically create error logs
- Circuit breaker patterns prevent cascade failures

### Notification System Integration
- Performance alerts trigger notifications to relevant staff
- Role-based alert routing (PROPERTY_MGR, ADMIN)
- Multi-channel notifications (In-App, Email, SMS)

### Business Rules Integration
- Performance metrics can trigger business rule evaluations
- Dynamic pricing adjustments based on system load
- Automatic capacity management

## 🛠️ Configuration

### Environment Variables
```env
# Performance monitoring settings
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_BUFFER_SIZE=100
PERFORMANCE_FLUSH_INTERVAL=30000
PERFORMANCE_RETENTION_DAYS=30

# System health monitoring
SYSTEM_HEALTH_INTERVAL=60000
SYSTEM_HEALTH_ENABLED=true

# Alert thresholds
PERFORMANCE_RESPONSE_TIME_WARNING=2000
PERFORMANCE_RESPONSE_TIME_CRITICAL=5000
PERFORMANCE_ERROR_RATE_THRESHOLD=5
PERFORMANCE_QUEUE_DEPTH_THRESHOLD=50
```

## 📊 Metrics and KPIs

### Key Performance Indicators
- **Average Response Time**: Target < 500ms
- **Error Rate**: Target < 1%
- **Queue Processing Time**: Target < 2s
- **System Uptime**: Target > 99.9%
- **Database Query Time**: Target < 100ms

### Monitoring Dashboards
- Real-time performance metrics
- Historical trend analysis
- Alert status and resolution tracking
- Resource utilization trends
- Queue health monitoring

## 🔮 Future Enhancements

1. **Advanced Analytics**
   - Machine learning-based anomaly detection
   - Predictive performance modeling
   - Capacity planning recommendations

2. **Enhanced Alerting**
   - Smart alert correlation
   - Alert fatigue reduction
   - Escalation policies

3. **Integration Expansions**
   - Third-party monitoring tools (DataDog, New Relic)
   - Custom webhook integrations
   - Slack/Teams notifications

4. **Performance Optimization**
   - Automatic query optimization suggestions
   - Resource scaling recommendations
   - Performance bottleneck identification

---

## ✅ Implementation Status: COMPLETED

The Performance Monitoring System is fully implemented and ready for production use. All core features are functional, including:

- ✅ Comprehensive metric collection
- ✅ Real-time alerting system
- ✅ System health monitoring
- ✅ Performance dashboard data
- ✅ Test API for validation
- ✅ Multi-tenant support
- ✅ Integration with existing systems

**Next Steps**: Move to Task 2.4.4 - Automated Notifications
