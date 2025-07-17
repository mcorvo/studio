
'use server';
/**
 * @fileOverview A flow to check for expiring licenses and generate notification emails.
 *
 * - notifyExpiringLicenses - Checks for licenses expiring in the next 4 months and generates notification content.
 * - NotifyExpiringLicensesOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';

export const NotifyExpiringLicensesOutputSchema = z.object({
  sentEmails: z.array(z.object({
    recipient: z.string().email(),
    subject: z.string(),
    body: z.string(),
    licenseId: z.number(),
    product: z.string(),
  })).describe("A list of emails that were generated."),
  errors: z.array(z.string()).describe("A list of errors that occurred."),
});
export type NotifyExpiringLicensesOutput = z.infer<typeof NotifyExpiringLicensesOutputSchema>;

function createEmailContent(license: { Prodotto: string; Scadenza: Date | null; Rivenditore: string; }) {
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
  return notifyExpiringLicensesFlow();
}

const notifyExpiringLicensesFlow = ai.defineFlow(
  {
    name: 'notifyExpiringLicensesFlow',
    outputSchema: NotifyExpiringLicensesOutputSchema,
  },
  async () => {
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
                const emailContent = createEmailContent(license);

                output.sentEmails.push({
                    recipient: license.Email_Rivenditore,
                    subject: emailContent.subject,
                    body: emailContent.body,
                    licenseId: license.id,
                    product: license.Prodotto,
                });
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
