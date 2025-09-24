import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const addOns = await prisma.addOn.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(addOns);
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch add-ons' },
      { status: 500 }
    );
  }
}