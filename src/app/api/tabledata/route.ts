
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to check if data is an array of objects, suitable for License model
function isValidLicenseData(data: any): data is Partial<Omit<typeof prisma.license.fields, 'id'>>[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    !Array.isArray(item) &&
    'Produttore' in item && // Basic check for one of the fields
    'Prodotto' in item
  );
}

export async function GET() {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { id: 'asc' }, // Order by ID or any other preferred field
    });
    return NextResponse.json(licenses);
  } catch (error) {
    console.error('Failed to fetch licenses:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) { // Looser check, Prisma will validate further
      return NextResponse.json({ message: 'Invalid data format. Expected an array of license objects.' }, { status: 400 });
    }

    const dataToCreate = body.map(item => {
      const numLicenze = parseInt(String(item.Numero_Licenze), 10);
      const bundleVal = parseInt(String(item.Bundle), 10);
      
      return {
        Produttore: String(item.Produttore ?? ''),
        Prodotto: String(item.Prodotto ?? ''),
        Tipo_Licenza: String(item.Tipo_Licenza ?? ''),
        Numero_Licenze: isNaN(numLicenze) ? 0 : numLicenze,
        Bundle: isNaN(bundleVal) ? 0 : bundleVal,
        Borrowable: item.Borrowable === true || String(item.Borrowable).toLowerCase() === 'true',
        // id is not included, it's auto-generated
      };
    });


    await prisma.$transaction(async (tx) => {
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
    // Add more specific error handling for Prisma validation errors if needed
    return NextResponse.json({ message: 'Failed to save data to database. Ensure data matches the License model.' }, { status: 500 });
  }
}
