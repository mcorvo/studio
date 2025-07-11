
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

const EmailGenInputSchema = z.object({
    Prodotto: z.string(),
    Scadenza: z.string(),
    Rivenditore: z.string(),
    Email_Rivenditore: z.string().email(),
});

const EmailGenOutputSchema = z.object({
    subject: z.string(),
    body: z.string(),
});

const emailPrompt = ai.definePrompt({
    name: 'notifyExpirationEmailPrompt',
    input: { schema: EmailGenInputSchema },
    output: { schema: EmailGenOutputSchema },
    prompt: `You are an assistant responsible for writing professional email notifications about expiring software licenses.
    The tone should be helpful and urgent, but not alarming.
    The email should be sent to the reseller.
    The license for the product "{{Prodotto}}" will expire on {{Scadenza}}.
    The reseller is "{{Rivenditore}}".
    
    Generate a subject and a body for the email to be sent to {{Email_Rivenditore}}.
    The body should be in HTML format.
    The subject should clearly state the product and that its license is expiring soon.
    The body should mention the product name, the expiration date, and suggest that the reseller contact their client to arrange for a renewal.
    `,
});


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
