import { NextRequest, NextResponse } from 'next/server';
//import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  getSettingsQuerySchema, 
  updateSettingsSchema, 
  createSettingSchema, 
  deleteSettingsSchema,
  validateSettingValue 
} from '@/shared/validations/settings';
import { parseSettingValue } from '@/shared/types/settings';
import prisma from '@/lib/prisma';

// Validation schema for settings update
const settingsUpdateSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    dataType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
    isEditable: z.boolean().optional()
  }))
});

// GET /api/admin/settings - Get all settings or filter by category/key
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
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    if (groupByCategory) {
      const grouped = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push({
          ...setting,
          parsedValue: parseSettingValue(setting.value, setting.dataType),
        });
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        success: true,
        data: grouped,
      });
    }

    // Convert to key-value format for easier access
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        ...setting,
        parsedValue: parseSettingValue(setting.value, setting.dataType),
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: settingsMap,
    });
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

// PUT /api/admin/settings - Update multiple settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    // Validate each setting value
    const validationErrors: string[] = [];
    for (const setting of validatedData.settings) {
      const validation = validateSettingValue(
        setting.key,
        setting.value,
        setting.dataType,
        setting.category
      );
      if (!validation.isValid) {
        validationErrors.push(`${setting.key}: ${validation.error}`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Setting validation failed', 
          errors: validationErrors 
        },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(
      validatedData.settings.map((setting) =>
        prisma.settings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            description: setting.description,
            category: setting.category,
            dataType: setting.dataType,
            isEditable: setting.isEditable ?? true,
            updatedAt: new Date(),
          },
          create: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category,
            dataType: setting.dataType,
            isEditable: setting.isEditable ?? true,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: results,
      message: `Updated ${results.length} settings`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Create a new setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSettingSchema.parse(body);

    // Validate setting value
    const validation = validateSettingValue(
      validatedData.key,
      validatedData.value,
      validatedData.dataType,
      validatedData.category
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Setting validation failed', 
          error: validation.error 
        },
        { status: 400 }
      );
    }

    // Check if setting already exists
    const existingSetting = await prisma.settings.findUnique({
      where: { key: validatedData.key },
    });

    if (existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting with this key already exists' },
        { status: 409 }
      );
    }

    const setting = await prisma.settings.create({
      data: {
        key: validatedData.key,
        value: validatedData.value,
        description: validatedData.description,
        category: validatedData.category,
        dataType: validatedData.dataType,
        isEditable: validatedData.isEditable ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: setting,
      message: 'Setting created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create setting' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings - Delete a setting by key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, message: 'Setting key is required' },
        { status: 400 }
      );
    }

    // Check if setting exists and is editable
    const existingSetting = await prisma.settings.findUnique({
      where: { key },
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: 404 }
      );
    }

    if (!existingSetting.isEditable) {
      return NextResponse.json(
        { success: false, message: 'This setting cannot be deleted' },
        { status: 403 }
      );
    }

    const deletedSetting = await prisma.settings.delete({
      where: { key },
    });

    return NextResponse.json({
      success: true,
      data: deletedSetting,
      message: 'Setting deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}