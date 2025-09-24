import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSettingsQuerySchema } from '@/shared/validations/settings';
import { parseSettingValue, SettingsResponse } from '@/shared/types/settings';
import { z } from 'zod';

// Cache settings for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let settingsCache: { data: any; timestamp: number } | null = null;

// GET /api/settings - Get settings (public endpoint with caching)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      category: searchParams.get('category') || undefined,
      keys: searchParams.get('keys') || undefined,
      groupByCategory: searchParams.get('groupByCategory') || undefined,
    };

    // Validate query parameters
    const validatedQuery = getSettingsQuerySchema.parse(queryParams);
    const { category, keys, groupByCategory } = validatedQuery;
    
    // Check cache first
    const now = Date.now();
    const cacheKey = `${category || 'all'}-${keys || 'all'}-${groupByCategory || false}`;
    
    if (settingsCache && 
        settingsCache.data[cacheKey] && 
        (now - settingsCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: settingsCache.data[cacheKey],
        cached: true,
      });
    }

    const whereClause: any = {};
    if (category) {
      whereClause.category = category;
    }
    if (keys) {
      const keyArray = keys.split(',').filter(Boolean);
      if (keyArray.length > 0) {
        whereClause.key = { in: keyArray };
      }
    }

    const settings = await prisma.settings.findMany({
      where: whereClause,
      select: {
        key: true,
        value: true,
        dataType: true,
        category: true,
        description: true,
      },
    });

    let result: any;
    if (groupByCategory) {
      result = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = {
          value: parseSettingValue(setting.value, setting.dataType),
          description: setting.description,
        };
        return acc;
      }, {} as Record<string, Record<string, any>>);
    } else {
      result = settings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: parseSettingValue(setting.value, setting.dataType),
          category: setting.category,
          description: setting.description,
        };
        return acc;
      }, {} as Record<string, any>);
    }

    // Update cache
    if (!settingsCache) {
      settingsCache = { data: {}, timestamp: now };
    }
    settingsCache.data[cacheKey] = result;
    settingsCache.timestamp = now;

    const response: SettingsResponse = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Helper function to get specific settings (can be used by other API routes)
export async function getSettings(keys: string[]): Promise<Record<string, any>> {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: { in: keys }
      },
      select: {
        key: true,
        value: true,
        dataType: true
      }
    });

    return settings.reduce((acc, setting) => {
      let parsedValue: any = setting.value;
      
      try {
        switch (setting.dataType) {
          case 'number':
            parsedValue = parseFloat(setting.value);
            break;
          case 'boolean':
            parsedValue = setting.value.toLowerCase() === 'true';
            break;
          case 'json':
            parsedValue = JSON.parse(setting.value);
            break;
          default:
            parsedValue = setting.value;
        }
      } catch (error) {
        console.warn(`Failed to parse setting ${setting.key}:`, error);
        parsedValue = setting.value;
      }
      
      acc[setting.key] = parsedValue;
      return acc;
    }, {} as Record<string, any>);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
}