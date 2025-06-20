
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to check if data is an array of objects
function isValidTableData(data: any): data is Record<string, any>[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
}

export async function GET() {
  try {
    const entries = await prisma.tableEntry.findMany({
      orderBy: { createdAt: 'asc' }, // Or any other order you prefer
    });
    // The 'data' field in TableEntry is already JSON, cast to expected type
    const tableData = entries.map(entry => entry.data as Record<string, any>);
    return NextResponse.json(tableData);
  } catch (error) {
    console.error('Failed to fetch table data:', error);
    return NextResponse.json({ message: 'Failed to fetch data from database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidTableData(body)) {
      return NextResponse.json({ message: 'Invalid data format. Expected an array of objects.' }, { status: 400 });
    }

    // This strategy replaces all existing table data with the new data.
    // For multi-user or more complex scenarios, you might want to scope data (e.g., by user ID or session).
    await prisma.$transaction(async (tx) => {
      await tx.tableEntry.deleteMany({}); // Clear all existing entries

      if (body.length > 0) {
        // Prisma's createMany expects an array where each object matches the model.
        // Our TableEntry model has a 'data' field of type Json to store each row.
        const dataToCreate = body.map(rowData => ({
          data: rowData, // rowData itself is the JSON object for the 'data' field
        }));
        await tx.tableEntry.createMany({
          data: dataToCreate,
        });
      }
    });

    return NextResponse.json({ message: 'Data saved successfully to database' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save table data:', error);
    if (error instanceof SyntaxError) { // Check if it's a JSON parsing error from request.json()
        return NextResponse.json({ message: 'Invalid JSON payload provided' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to save data to database' }, { status: 500 });
  }
}
