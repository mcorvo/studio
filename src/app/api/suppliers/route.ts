
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

    const suppliersToCreate = body.map(item => {
      return {
        fornitore: String(item.fornitore ?? ''),
        email: String(item.email ?? ''),
      };
    });

    await prisma.$transaction(async (tx) => {
      // We are deleting all suppliers and recreating them
      // so we also need to delete the join table entries first.
      await tx.licensesOnSuppliers.deleteMany({});
      await tx.supplier.deleteMany({});

      if (suppliersToCreate.length > 0) {
        await tx.supplier.createMany({
          data: suppliersToCreate,
        });

        // The relationship is now primarily managed from the license side.
        // After creating suppliers, we can re-link any existing licenses
        // that might reference them.
        const createdSuppliers = await tx.supplier.findMany();
        const allLicenses = await tx.license.findMany();
        
        const supplierMap = new Map(createdSuppliers.map(s => [s.fornitore, s.id]));

        for (const license of allLicenses) {
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

    return NextResponse.json({ message: 'Supplier data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save supplier data:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the Supplier model.' }, { status: 500 });
  }
}
