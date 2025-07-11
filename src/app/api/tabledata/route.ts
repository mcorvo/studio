
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { id: 'asc' }, // Order by ID or any other preferred field
    });
    // Format DateTime to ISO string without time for consistency
    const formattedLicenses = licenses.map(license => ({
        ...license,
        Scadenza: license.Scadenza ? license.Scadenza.toISOString().split('T')[0] : null,
    }));
    return NextResponse.json(formattedLicenses);
  } catch (error) {
    console.error('Failed to fetch licenses:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid data format. Expected an array of license objects.' }, { status: 400 });
    }

    const dataToCreate = body.map(item => {
      const numLicenze = parseInt(String(item.Numero_Licenze), 10);
      const bundleVal = parseInt(String(item.Bundle), 10);
      //const date = new String(item.Scadenza);
      
      let scadenzaDate: Date | null = null;
      if (item.Scadenza && typeof item.Scadenza === 'string') {
          const date = new Date(item.Scadenza);
          if (!isNaN(date.getTime())) {
              scadenzaDate = date;
          }
      }

      return {
	Scadenza: new Date(String(item.Scadenza) ?? ''), 
        Rivenditore: String(item.Rivenditore ?? ''),
        Contratto: String(item.Contratto ?? ''),
        Produttore: String(item.Produttore ?? ''),
        Prodotto: String(item.Prodotto ?? ''),
        Tipo_Licenza: String(item.Tipo_Licenza ?? ''),
        Numero_Licenze: isNaN(numLicenze) ? 0 : numLicenze,
        Bundle: isNaN(bundleVal) ? 0 : bundleVal,
        Borrowable: item.Borrowable === true || String(item.Borrowable).toLowerCase() === 'true',
        Contratto: String(item.Contratto ?? ''),
        Rivenditore: String(item.Rivenditore ?? ''),
        Scadenza: scadenzaDate,
      };
    });


    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.license.deleteMany({}); // Clear all existing license entries

      if (dataToCreate.length > 0) {
        await tx.license.createMany({
          data: dataToCreate,
        });
      }
    });

    return NextResponse.json({ message: 'License data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save license data:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the License model.' }, { status: 500 });
  }
}
