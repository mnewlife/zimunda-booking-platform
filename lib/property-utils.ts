import { PropertyType } from '@prisma/client';

/**
 * Get all property types from Prisma enum
 * @returns Array of property type objects with value and label
 */
export function getPropertyTypes() {
  return Object.values(PropertyType).map((type) => ({
    value: type,
    label: formatPropertyTypeLabel(type),
  }));
}

/**
 * Format property type for display
 * @param type - Property type enum value
 * @returns Formatted label
 */
export function formatPropertyTypeLabel(type: PropertyType): string {
  switch (type) {
    case PropertyType.APARTMENT:
      return 'Apartment';
    case PropertyType.CABIN:
      return 'Cabin';
    case PropertyType.COTTAGE:
      return 'Cottage';
    case PropertyType.HOUSE:
      return 'House';
    case PropertyType.PENTHOUSE:
      return 'Penthouse';
    case PropertyType.STUDIO:
      return 'Studio';
    case PropertyType.VILLA:
      return 'Villa';
    default:
      return type;
  }
}

/**
 * Get property type options for form selects
 * @returns Array of options with value and label for form components
 */
export function getPropertyTypeOptions() {
  return getPropertyTypes();
}