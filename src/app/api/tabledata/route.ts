
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { id: 'asc' },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
    // Format DateTime to ISO string without time for consistency
    const formattedLicenses = licenses.map(license => ({
        ...license,
        suppliers: license.suppliers.length, // Just return a count for now
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

    const licensesToCreate = body.map(item => {
      const numLicenze = parseInt(String(item.Numero_Licenze), 10);
      const bundleVal = parseInt(String(item.Bundle), 10);
      
      let scadenzaDate: Date | null = null;
      if (item.Scadenza && typeof item.Scadenza === 'string') {
          const date = new Date(item.Scadenza);
          if (!isNaN(date.getTime())) {
              scadenzaDate = date;
          }
      }

      return {
        Contratto: String(item.Contratto ?? ''),
        Produttore: String(item.Produttore ?? ''),
        Prodotto: String(item.Prodotto ?? ''),
        Tipo_Licenza: String(item.Tipo_Licenza ?? ''),
        Numero_Licenze: isNaN(numLicenze) ? 0 : numLicenze,
        Bundle: isNaN(bundleVal) ? 0 : bundleVal,
        Borrowable: item.Borrowable === true || String(item.Borrowable).toLowerCase() === 'true',
        Rivenditore: String(item.Rivenditore ?? ''),
        Email_Rivenditore: String(item.Email_Rivenditore ?? ''),
        Scadenza: scadenzaDate,
      };
    });


    await prisma.$transaction(async (tx) => {
      await tx.licensesOnSuppliers.deleteMany({});
      await tx.license.deleteMany({});

      if (licensesToCreate.length > 0) {
        await tx.license.createMany({
          data: licensesToCreate,
        });

        // After creation, link them up
        const createdLicenses = await tx.license.findMany();
        const allSuppliers = await tx.supplier.findMany();
        
        // Create a map for quick supplier lookup by their name
        const supplierMap = new Map(allSuppliers.map(s => [s.fornitore, s.id]));

        for (const license of createdLicenses) {
            if (license.Rivenditore && supplierMap.has(license.Rivenditore)) {
                const supplierId = supplierMap.get(license.Rivenditore)!;
                await tx.licensesOnSuppliers.create({
                    data: {
                        licenseId: license.id,
                        supplierId: supplierId,
                    }
                });
            }
        }
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
