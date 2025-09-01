
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const rdas = await prisma.rda.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(rdas);
  } catch (error) {
    console.error('Failed to fetch RDAs:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid data format. Expected an array of RDA objects.' }, { status: 400 });
    }

    const allLicenses = await prisma.license.findMany({
      select: { id: true, Prodotto: true }
    });
    const licenseMap = new Map(allLicenses.map(l => [l.Prodotto, l.Prodotto]));

    const rdasToCreate: Prisma.RdaCreateManyInput[] = body.map(item => {
      const anno = parseInt(String(item.anno), 10);
      const licenseId = licenseMap.get(item.prodotto)!;
      
      return {
        rda: String(item.rda ?? ''),
        prodotto: String(item.prodotto ?? ''),
        anno: isNaN(anno) ? new Date().getFullYear() : anno,
        rivenditore: String(item.rivenditore ?? ''),
        licenseId: licenseId,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.rda.deleteMany({});

      if (rdasToCreate.length > 0) {
        await tx.rda.createMany({
          data: rdasToCreate,
        });
      }
    });

    return NextResponse.json({ message: 'RDA data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save RDA data:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0];
        return NextResponse.json({ message: `Failed to save data. Duplicate value for field: ${field}`}, { status: 409 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the RDA model.' }, { status: 500 });
  }
}
