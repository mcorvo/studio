
'use server';
/**
 * @fileOverview A flow to check for expiring licenses and generate notification emails.
 *
 * - notifyExpiringLicenses - Checks for licenses expiring in the next 4 months and generates notification content.
 * - NotifyExpiringLicensesOutput - The return type for the flow.
 */

import { NextResponse } from 'next/server';
import cron from "node-cron";
import { ai } from '@/ai/genkit';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';
import { NotifyExpiringLicensesOutputSchema, EmailGenInputSchema, EmailGenOutputSchema, emailPrompt } from './notifyExpiringLicensesTypes';
import type { NotifyExpiringLicensesOutput } from './notifyExpiringLicensesTypes';

//export async function notifyExpiringLicenses(): Promise<NotifyExpiringLicensesOutput> {
//  return notifyExpiringLicensesFlow();
//}

function createEmailContent(license: { Prodotto: string; Scadenza: Date | null; Rivenditore: string | null; }) {
    const expirationDate = license.Scadenza ? format(license.Scadenza, 'yyyy-MM-dd') : 'N/A';
    
    const subject = `License Expiration Notice for ${license.Prodotto}`;
    
    const body = `
Dear ${license.Rivenditore},

This is a notification that the software license for the following product is expiring soon:

Product: ${license.Prodotto}
Expiration Date: ${expirationDate}

Please contact your client to arrange for a renewal.

Thank you,
License Management System
    `.trim();

    return { subject, body };
}

export async function notifyExpiringLicenses(): Promise<NotifyExpiringLicensesOutput> {
  const recipient: string = process.env.EMAIL_RECIPIENT!;
  const today = new Date();
  const fourMonthsFromNow = new Date();
  fourMonthsFromNow.setMonth(today.getMonth() + 4);

  const expiringLicenses = await prisma.license.findMany({
    where: {
      Scadenza: {
        gte: today,
        lte: fourMonthsFromNow,
      },
      Email_Rivenditore: {
        not: null,
        contains: '@',
      }
    },
  });

  const output: NotifyExpiringLicensesOutput = { sentEmails: [], errors: [] };

  for (const license of expiringLicenses) {
    if (process.env.EMAIL_RECIPIENT) {
      try {
            const emailContent = createEmailContent(license);

            output.sentEmails.push({
              recipient: process.env.EMAIL_RECIPIENT,
              subject: emailContent.subject,
              body: emailContent.body,
              licenseId: license.id,
              product: license.Prodotto,
            });
            await sendEmail({ to: process.env.EMAIL_RECIPIENT, subject: emailContent.subject, html: emailContent.body});

      } catch (error) {
             const errorMessage = error instanceof Error ? error.message : String(error);
             output.errors.push(`Failed to generate email for license ID ${license.id}: ${errorMessage}`);
      }
    }
  }
  return output;
}

cron.schedule("0 0 * * *", async () => {
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
})