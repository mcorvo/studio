
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
      const anno = parseInt(String(item.anno), 10);
      
      return {
        fornitore: String(item.fornitore ?? ''),
        anno: isNaN(anno) ? new Date().getFullYear() : anno,
        email: String(item.email ?? ''),
        link_rda: String(item.link_rda ?? ''),
        fornitore_unico: item.fornitore_unico === true || String(item.fornitore_unico).toLowerCase() === 'true',
        Prodotto: String(item.Prodotto ?? ''),
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.licensesOnSuppliers.deleteMany({});
      await tx.supplier.deleteMany({});

      if (suppliersToCreate.length > 0) {
        await tx.supplier.createMany({
          data: suppliersToCreate,
        });

        const createdSuppliers = await tx.supplier.findMany();
        const allLicenses = await tx.license.findMany();
        
        const licenseMap = new Map(allLicenses.map(l => [l.Prodotto, l.id]));

        for (const supplier of createdSuppliers) {
            if (supplier.Prodotto && licenseMap.has(supplier.Prodotto)) {
                const licenseId = licenseMap.get(supplier.Prodotto)!;
                await tx.licensesOnSuppliers.create({
                    data: {
                        licenseId: licenseId,
                        supplierId: supplier.id,
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
