
'use server';
/**
 * @fileOverview A flow to check for expiring licenses and generate notification emails.
 *
 * - notifyExpiringLicenses - Checks for licenses expiring in the next 4 months and generates notification content.
 * - NotifyExpiringLicensesOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { NotifyExpiringLicensesOutputSchema, EmailGenInputSchema, EmailGenOutputSchema, emailPrompt } from './notifyExpiringLicensesTypes';
import type { NotifyExpiringLicensesOutput } from './notifyExpiringLicensesTypes';

export async function notifyExpiringLicenses(): Promise<NotifyExpiringLicensesOutput> {
  return notifyExpiringLicensesFlow();
}

const notifyExpiringLicensesFlow = ai.defineFlow(
  {
    name: 'notifyExpiringLicensesFlow',
    outputSchema: NotifyExpiringLicensesOutputSchema,
  },
  async () => {
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
        if (license.Email_Rivenditore) {
            try {
                const { output: emailContent } = await emailPrompt({
                    Prodotto: license.Prodotto,
                    Scadenza: format(license.Scadenza!, 'yyyy-MM-dd'),
                    Rivenditore: license.Rivenditore,
                    Email_Rivenditore: license.Email_Rivenditore,
                });

                if (emailContent) {
                    output.sentEmails.push({
                        recipient: license.Email_Rivenditore,
                        subject: emailContent.subject,
                        body: emailContent.body,
                        licenseId: license.id,
                        product: license.Prodotto,
                    });
                }
            } catch (error) {
                 const errorMessage = error instanceof Error ? error.message : String(error);
                 output.errors.push(`Failed to generate email for license ID ${license.id}: ${errorMessage}`);
            }
        }
    }
    
    // In a real application, you would add a step here to send the emails
    // using a service like SendGrid, Resend, or AWS SES.
    // For this example, we are just returning the generated content.

    return output;
  }
);
