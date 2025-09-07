
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const requests = await prisma.requests.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Failed to fetch Requests:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid data format. Expected an array of Request objects.' }, { status: 400 });
    }
    
    // Separate records into new and existing ones
    const newRecords = body.filter(item => !item.id);
    const existingRecords = body.filter(item => item.id);

    await prisma.$transaction(async (tx) => {
      // Create new records
      if (newRecords.length > 0) {
        const recordsToCreate = newRecords.map(item => ({
            Richiedente: String(item.Richiedente ?? ''),
            Prodotto: String(item.Prodotto ?? ''),
            Quantita: parseInt(String(item.Quantita), 10) || 0,
            Budget: parseFloat(String(item.Budget)) || 0,
            Anno: parseInt(String(item.Anno), 10) || new Date().getFullYear(),
        }));
        await tx.requests.createMany({
          data: recordsToCreate,
        });
      }

      // Update existing records
      for (const item of existingRecords) {
        await tx.requests.update({
          where: { id: item.id },
          data: {
            Richiedente: String(item.Richiedente ?? ''),
            Prodotto: String(item.Prodotto ?? ''),
            Quantita: parseInt(String(item.Quantita), 10) || 0,
            Budget: parseFloat(String(item.Budget)) || 0,
            Anno: parseInt(String(item.Anno), 10) || new Date().getFullYear(),
          },
        });
      }
    });

    return NextResponse.json({ message: 'Request data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save Request data:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0];
        return NextResponse.json({ message: `Failed to save data. Duplicate value for field: ${field}`}, { status: 409 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the Request model.' }, { status: 500 });
  }
}
