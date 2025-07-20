import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid data format. Expected an array of supplier objects.' }, { status: 400 });
    }

    const dataToCreate = body.map(item => {
      const anno = parseInt(String(item.anno), 10);
      
      return {
        fornitore: String(item.fornitore ?? ''),
        anno: isNaN(anno) ? new Date().getFullYear() : anno,
        email: String(item.email ?? ''),
        link_rda: String(item.link_rda ?? ''),
        fornitore_unico: item.fornitore_unico === true || String(item.fornitore_unico).toLowerCase() === 'true',
      };
    });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.supplier.deleteMany({}); // Clear all existing supplier entries

      if (dataToCreate.length > 0) {
        await tx.supplier.createMany({
          data: dataToCreate,
        });
      }
    });

    return NextResponse.json({ message: 'Supplier data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save supplier data:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the Supplier model.' }, { status: 500 });
  }
}
