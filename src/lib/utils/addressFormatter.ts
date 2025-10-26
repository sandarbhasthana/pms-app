/**
 * Format address components in the correct order
 * Order: Apt/Suite #, Street, City, State, Zip, Country
 */
export function formatAddress(
  suite?: string | null,
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zipCode?: string | null,
  country?: string | null
): string {
  const parts = [suite, street, city, state, zipCode, country].filter(Boolean);
  return parts.join(", ");
}

/**
 * Format address from a combined address string and separate fields
 * This handles the case where address field contains "street, suite" combined
 */
export function formatAddressFromProperty(property: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}): string {
  const parts = [
    property.address,
    property.city,
    property.state,
    property.zipCode,
    property.country
  ].filter(Boolean);
  return parts.join(", ");
}

