
import { NextResponse } from 'next/server';
import { NotifyExpiringLicensesOutput } from '@/ai/flows/notifyExpiringLicensesTypes';
import { notifyExpiringLicenses } from '@/ai/flows/notify-expirations-flow';

export const dynamic = 'force-dynamic'; // defaults to auto

// To secure this endpoint, you could add authentication checks here.
// For example, using headers, API keys, or session validation.
// A simple way is to use a "cron secret" that must be passed in the request.

export async function GET(request: Request) {
    const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result: NotifyExpiringLicensesOutput = await notifyExpiringLicenses();
        
        if (result.errors.length > 0) {
            console.error('Errors during expiration check:', result.errors);
        }

        const message = `Processing complete. Generated ${result.sentEmails.length} notification(s). Check server logs for details.`;
        
        return NextResponse.json({ 
            message,
            details: result 
        });

    } catch (error) {
        console.error('Failed to run expiration notification flow:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ message: 'Failed to run expiration check', error: errorMessage }, { status: 500 });
    }
}
