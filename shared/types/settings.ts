// Settings types and validation schemas

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingSettings {
  serviceFeeRate: number;
  taxRate: number;
  defaultRating: number;
  currency: string;
  minimumStay: number;
}

export interface ContactSettings {
  email: string;
  phone: string;
}

export interface SiteSettings {
  name: string;
  description?: string;
  logo?: string;
}

export interface SettingsResponse {
  success: boolean;
  data: Record<string, Setting>;
  message?: string;
}

export interface SettingsUpdateRequest {
  settings: Array<{
    key: string;
    value: string;
    description?: string;
    category: string;
    dataType: 'string' | 'number' | 'boolean' | 'json';
    isEditable?: boolean;
  }>;
}

export interface SettingsCreateRequest {
  key: string;
  value: string;
  description?: string;
  category: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isEditable?: boolean;
}

// Setting categories
export const SETTING_CATEGORIES = {
  PRICING: 'pricing',
  PROPERTY: 'property', 
  BOOKING: 'booking',
  CONTACT: 'contact',
  SITE: 'site',
  SYSTEM: 'system',
} as const;

export type SettingCategory = typeof SETTING_CATEGORIES[keyof typeof SETTING_CATEGORIES];

// Data types
export const SETTING_DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json',
} as const;

export type SettingDataType = typeof SETTING_DATA_TYPES[keyof typeof SETTING_DATA_TYPES];

// Default settings keys
export const SETTING_KEYS = {
  // Pricing
  SERVICE_FEE_RATE: 'pricing.serviceFeeRate',
  TAX_RATE: 'pricing.taxRate',
  CURRENCY: 'pricing.currency',
  
  // Property
  DEFAULT_RATING: 'property.defaultRating',
  
  // Booking
  MINIMUM_STAY: 'booking.minimumStay',
  
  // Contact
  CONTACT_EMAIL: 'contact.email',
  CONTACT_PHONE: 'contact.phone',
  
  // Site
  SITE_NAME: 'site.name',
  SITE_DESCRIPTION: 'site.description',
  SITE_LOGO: 'site.logo',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

// Utility function to parse setting value based on data type
export function parseSettingValue(value: string, dataType: SettingDataType): any {
  switch (dataType) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    case 'string':
    default:
      return value;
  }
}

// Utility function to stringify setting value for storage
export function stringifySettingValue(value: any, dataType: SettingDataType): string {
  switch (dataType) {
    case 'json':
      return JSON.stringify(value);
    case 'boolean':
      return String(Boolean(value));
    case 'number':
      return String(Number(value));
    case 'string':
    default:
      return String(value);
  }
}

// Validation helpers
export function isValidSettingKey(key: string): boolean {
  return Object.values(SETTING_KEYS).includes(key as SettingKey);
}

export function isValidSettingCategory(category: string): boolean {
  return Object.values(SETTING_CATEGORIES).includes(category as SettingCategory);
}

export function isValidSettingDataType(dataType: string): boolean {
  return Object.values(SETTING_DATA_TYPES).includes(dataType as SettingDataType);
}