/**
 * Report Caching Layer
 *
 * Redis-based caching for report data and templates
 */

import { getRedisConnection } from "../queue/redis";
import { ReportData } from "./types";
import { ReportTemplate } from "@prisma/client";

const CACHE_PREFIX = "report:";
const TEMPLATE_PREFIX = "template:";

// Cache TTLs (in seconds)
const CACHE_TTL = {
  REPORT_DATA: 300, // 5 minutes
  TEMPLATE: 3600, // 1 hour
  REPORT_LIST: 900 // 15 minutes
};

/**
 * Generate cache key
 */
function getCacheKey(type: string, identifier: string): string {
  return `${CACHE_PREFIX}${type}:${identifier}`;
}

/**
 * Cache report data
 */
export async function cacheReportData(
  reportId: string,
  data: ReportData,
  ttl: number = CACHE_TTL.REPORT_DATA
): Promise<void> {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey("data", reportId);

    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`✅ Cached report data: ${reportId}`);
  } catch (error) {
    console.error("Error caching report data:", error);
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached report data
 */
export async function getCachedReportData(
  reportId: string
): Promise<ReportData | null> {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey("data", reportId);

    const cached = await redis.get(key);
    if (cached) {
      console.log(`✅ Cache hit for report: ${reportId}`);
      return JSON.parse(cached);
    }

    console.log(`❌ Cache miss for report: ${reportId}`);
    return null;
  } catch (error) {
    console.error("Error getting cached report data:", error);
    return null;
  }
}

/**
 * Cache report template
 */
export async function cacheTemplate(
  templateId: string,
  template: ReportTemplate,
  ttl: number = CACHE_TTL.TEMPLATE
): Promise<void> {
  try {
    const redis = getRedisConnection();
    const key = `${TEMPLATE_PREFIX}${templateId}`;

    await redis.setex(key, ttl, JSON.stringify(template));
    console.log(`✅ Cached template: ${templateId}`);
  } catch (error) {
    console.error("Error caching template:", error);
  }
}

/**
 * Get cached template
 */
export async function getCachedTemplate(
  templateId: string
): Promise<ReportTemplate | null> {
  try {
    const redis = getRedisConnection();
    const key = `${TEMPLATE_PREFIX}${templateId}`;

    const cached = await redis.get(key);
    if (cached) {
      console.log(`✅ Cache hit for template: ${templateId}`);
      return JSON.parse(cached);
    }

    console.log(`❌ Cache miss for template: ${templateId}`);
    return null;
  } catch (error) {
    console.error("Error getting cached template:", error);
    return null;
  }
}

/**
 * Invalidate report cache
 */
export async function invalidateReportCache(reportId: string): Promise<void> {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey("data", reportId);

    await redis.del(key);
    console.log(`✅ Invalidated cache for report: ${reportId}`);
  } catch (error) {
    console.error("Error invalidating report cache:", error);
  }
}

/**
 * Invalidate template cache
 */
export async function invalidateTemplateCache(
  templateId: string
): Promise<void> {
  try {
    const redis = getRedisConnection();
    const key = `${TEMPLATE_PREFIX}${templateId}`;

    await redis.del(key);
    console.log(`✅ Invalidated cache for template: ${templateId}`);
  } catch (error) {
    console.error("Error invalidating template cache:", error);
  }
}

/**
 * Clear all report caches
 */
export async function clearAllReportCaches(): Promise<void> {
  try {
    const redis = getRedisConnection();

    // Get all keys matching the pattern
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    const templateKeys = await redis.keys(`${TEMPLATE_PREFIX}*`);

    const allKeys = [...keys, ...templateKeys];

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`✅ Cleared ${allKeys.length} report caches`);
    }
  } catch (error) {
    console.error("Error clearing report caches:", error);
  }
}
