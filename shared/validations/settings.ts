import { z } from 'zod';
import { SETTING_CATEGORIES, SETTING_DATA_TYPES } from '../types/settings';

// Base setting schema
export const settingSchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
  value: z.string(),
  description: z.string().optional(),
  category: z.enum([
    SETTING_CATEGORIES.PRICING,
    SETTING_CATEGORIES.PROPERTY,
    SETTING_CATEGORIES.BOOKING,
    SETTING_CATEGORIES.CONTACT,
    SETTING_CATEGORIES.SITE,
    SETTING_CATEGORIES.SYSTEM,
  ]),
  dataType: z.enum([
    SETTING_DATA_TYPES.STRING,
    SETTING_DATA_TYPES.NUMBER,
    SETTING_DATA_TYPES.BOOLEAN,
    SETTING_DATA_TYPES.JSON,
  ]),
  isEditable: z.boolean().default(true),
});

// Schema for creating a new setting
export const createSettingSchema = settingSchema;

// Schema for updating settings (bulk update)
export const updateSettingsSchema = z.object({
  settings: z.array(settingSchema).min(1, 'At least one setting is required'),
});

// Schema for deleting settings
export const deleteSettingsSchema = z.object({
  keys: z.array(z.string().min(1)).min(1, 'At least one key is required'),
});

// Schema for getting settings query parameters
export const getSettingsQuerySchema = z.object({
  category: z.string().optional(),
  keys: z.string().optional(), // Comma-separated list of keys
  groupByCategory: z.string().optional().transform(val => val === 'true'),
});

// Specific validation schemas for different setting types
export const pricingSettingSchema = z.object({
  serviceFeeRate: z.number().min(0).max(1, 'Service fee rate must be between 0 and 1'),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
});

export const propertySettingSchema = z.object({
  defaultRating: z.number().min(0).max(5, 'Rating must be between 0 and 5'),
});

export const bookingSettingSchema = z.object({
  minimumStay: z.number().int().min(1, 'Minimum stay must be at least 1 night'),
});

export const contactSettingSchema = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number is required'),
});

export const siteSettingSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  description: z.string().optional(),
  logo: z.string().url().optional(),
});

// Validation function for setting values based on their data type and category
export function validateSettingValue(key: string, value: string, dataType: string, category: string): { isValid: boolean; error?: string } {
  try {
    // Parse value based on data type
    let parsedValue: any;
    switch (dataType) {
      case 'number':
        parsedValue = Number(value);
        if (isNaN(parsedValue)) {
          return { isValid: false, error: 'Invalid number format' };
        }
        break;
      case 'boolean':
        parsedValue = value === 'true' || value === 'false' ? value === 'true' : null;
        if (parsedValue === null) {
          return { isValid: false, error: 'Boolean value must be "true" or "false"' };
        }
        break;
      case 'json':
        try {
          parsedValue = JSON.parse(value);
        } catch {
          return { isValid: false, error: 'Invalid JSON format' };
        }
        break;
      case 'string':
      default:
        parsedValue = value;
        break;
    }

    // Validate specific settings based on key
    switch (key) {
      case 'pricing.serviceFeeRate':
      case 'pricing.taxRate':
        if (typeof parsedValue !== 'number' || parsedValue < 0 || parsedValue > 1) {
          return { isValid: false, error: 'Rate must be a number between 0 and 1' };
        }
        break;
      case 'property.defaultRating':
        if (typeof parsedValue !== 'number' || parsedValue < 0 || parsedValue > 5) {
          return { isValid: false, error: 'Rating must be a number between 0 and 5' };
        }
        break;
      case 'booking.minimumStay':
        if (typeof parsedValue !== 'number' || !Number.isInteger(parsedValue) || parsedValue < 1) {
          return { isValid: false, error: 'Minimum stay must be a positive integer' };
        }
        break;
      case 'contact.email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof parsedValue !== 'string' || !emailRegex.test(parsedValue)) {
          return { isValid: false, error: 'Invalid email format' };
        }
        break;
      case 'pricing.currency':
        if (typeof parsedValue !== 'string' || parsedValue.length !== 3) {
          return { isValid: false, error: 'Currency must be a 3-letter code' };
        }
        break;
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Validation error occurred' };
  }
}

// Export types
export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type DeleteSettingsInput = z.infer<typeof deleteSettingsSchema>;
export type GetSettingsQuery = z.infer<typeof getSettingsQuerySchema>;
export type PricingSettingInput = z.infer<typeof pricingSettingSchema>;
export type PropertySettingInput = z.infer<typeof propertySettingSchema>;
export type BookingSettingInput = z.infer<typeof bookingSettingSchema>;
export type ContactSettingInput = z.infer<typeof contactSettingSchema>;
export type SiteSettingInput = z.infer<typeof siteSettingSchema>;