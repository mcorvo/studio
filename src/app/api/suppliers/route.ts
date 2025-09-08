
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { id: 'asc' },
      include: {
          licenses: {
            include: {
                license: true
            }
          }
      }
    });
    const formattedSuppliers = suppliers.map(s => ({
        ...s,
        licenses: s.licenses.map(l => l.license)
    }));
    return NextResponse.json(formattedSuppliers);
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

    await prisma.$transaction(async (tx) => {
        for (const item of body) {
            const supplierData = {
              fornitore: String(item.fornitore ?? ''),
              email: String(item.email ?? ''),
            };

            const supplier = await tx.supplier.upsert({
                where: { id: item.id || -1 },
                update: supplierData,
                create: supplierData,
            });

            // After upserting the supplier, ensure relationships are correct.
            // This is simplified because the relationship is primarily managed
            // from the license via the `Rivenditore` string field. We just
            // need to make sure any licenses that point to this supplier by
            // its name `fornitore` are linked.
            const licensesToLink = await tx.license.findMany({
                where: { Rivenditore: supplier.fornitore }
            });

            // First, remove existing links for this supplier to avoid duplicates
            await tx.licensesOnSuppliers.deleteMany({
                where: { supplierId: supplier.id }
            });

            // Then, create the links for all licenses associated with this supplier
            if (licensesToLink.length > 0) {
                await tx.licensesOnSuppliers.createMany({
                    data: licensesToLink.map(license => ({
                        licenseId: license.id,
                        supplierId: supplier.id,
                    }))
                });
            }
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
