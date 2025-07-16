import { z } from 'genkit';
import { ai } from '@/ai/genkit';

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

export const EmailGenInputSchema = z.object({
  Prodotto: z.string(),
  Scadenza: z.string(),
  Rivenditore: z.string(),
  Email_Rivenditore: z.string().email(),
});

export const EmailGenOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export const emailPrompt = ai.definePrompt({
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
The body should mention the product name, the expiration date, and suggest that the reseller contact their client to arrange for a renewal.`,
});

