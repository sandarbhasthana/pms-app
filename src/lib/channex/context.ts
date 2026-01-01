/**
 * Multi-Tenant Channex Context Helper (Option A)
 *
 * NOTE: API key is NOT stored per org/property.
 * All API calls use the master key from process.env.CHANNEX_API_KEY
 *
 * This helper resolves Channex Group and Property IDs for multi-tenant operations.
 */

import { prisma } from "@/lib/prisma";
import type { ChannexOrgContext, ChannexPropertyContext } from "./types";

/**
 * Get Channex Group context for an organization
 */
export async function getChannexOrgContext(
  organizationId: string
): Promise<ChannexOrgContext | null> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId }
  });

  if (!channexOrg || !channexOrg.isActive) {
    return null;
  }

  return {
    organizationId,
    channexGroupId: channexOrg.channexGroupId
  };
}

/**
 * Get Channex Property context (includes org's group ID)
 */
export async function getChannexPropertyContext(
  propertyId: string
): Promise<ChannexPropertyContext | null> {
  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId },
    include: {
      channexOrg: true,
      property: {
        select: { organizationId: true }
      }
    }
  });

  if (!channexProperty || !channexProperty.isActive) {
    return null;
  }

  const { channexOrg } = channexProperty;
  if (!channexOrg.isActive) {
    return null;
  }

  return {
    organizationId: channexProperty.property.organizationId,
    channexGroupId: channexOrg.channexGroupId,
    propertyId,
    channexPropertyId: channexProperty.channexPropertyId
  };
}

/**
 * Get all active Channex properties for an organization
 */
export async function getChannexPropertiesForOrg(
  organizationId: string
): Promise<ChannexPropertyContext[]> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId },
    include: {
      properties: {
        where: { isActive: true },
        include: {
          property: { select: { organizationId: true } }
        }
      }
    }
  });

  if (!channexOrg || !channexOrg.isActive) {
    return [];
  }

  return channexOrg.properties.map((cp) => ({
    organizationId,
    channexGroupId: channexOrg.channexGroupId,
    propertyId: cp.propertyId,
    channexPropertyId: cp.channexPropertyId
  }));
}

/**
 * Check if organization has Channex enabled
 */
export async function isChannexEnabledForOrg(
  organizationId: string
): Promise<boolean> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId },
    select: { isActive: true }
  });
  return channexOrg?.isActive ?? false;
}

/**
 * Check if property has Channex enabled and sync is active
 */
export async function isChannexEnabledForProperty(
  propertyId: string
): Promise<boolean> {
  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId },
    select: { isActive: true, syncEnabled: true }
  });
  return (channexProperty?.isActive && channexProperty?.syncEnabled) ?? false;
}

/**
 * Get room type mapping for a PMS room type
 */
export async function getChannexRoomTypeMapping(
  pmsRoomTypeId: string
): Promise<{ channexPropertyId: string; channexRoomTypeId: string } | null> {
  const mapping = await prisma.channexRoomTypeMapping.findFirst({
    where: {
      roomTypeId: pmsRoomTypeId,
      isActive: true,
      channexRoomTypeId: { not: null }
    },
    select: {
      channexProperty: {
        select: { channexPropertyId: true }
      },
      channexRoomTypeId: true
    }
  });

  if (!mapping || !mapping.channexRoomTypeId) return null;

  return {
    channexPropertyId: mapping.channexProperty.channexPropertyId,
    channexRoomTypeId: mapping.channexRoomTypeId
  };
}

/**
 * Get all room type mappings for a property (only those with channexRoomTypeId set)
 */
export async function getChannexRoomTypeMappingsForProperty(
  propertyId: string
): Promise<Array<{ pmsRoomTypeId: string; channexRoomTypeId: string }>> {
  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId },
    include: {
      roomTypeMappings: {
        where: {
          isActive: true,
          channexRoomTypeId: { not: null }
        },
        select: {
          roomTypeId: true,
          channexRoomTypeId: true
        }
      }
    }
  });

  if (!channexProperty) return [];

  return channexProperty.roomTypeMappings
    .filter(
      (m): m is typeof m & { channexRoomTypeId: string } =>
        m.channexRoomTypeId !== null
    )
    .map((m) => ({
      pmsRoomTypeId: m.roomTypeId,
      channexRoomTypeId: m.channexRoomTypeId
    }));
}
