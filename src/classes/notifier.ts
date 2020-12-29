import nodemailer from "nodemailer";
import phone from "phone";
import twilio from "twilio";
import { config as loadEnvVariables } from "dotenv";
import { validate as validateEmail } from "deep-email-validator";
loadEnvVariables();

export default class Notifier {
  private emailClient: any;
  private fromEmail: string = "";
  private smsClient: twilio.Twilio | null;
  private fromPhone: string = "";
  constructor(opts: {
    service?: string;
    email?: string;
    password?: string;
    phone?: string;
  }) {
    try {
      if (!(opts.service && opts.email && opts.password)) {
        throw new Error("Invalid email setup");
      }
      this.fromEmail = opts.email;
      this.emailClient = nodemailer.createTransport({
        service: opts.service,
        auth: { user: opts.email, pass: opts.password },
      });
    } catch (err) {
      this.emailClient = null;
    }
    try {
      if (!opts.phone) {
        throw new Error("Invalid SMS setup");
      }
      this.fromPhone = opts.phone;
      this.smsClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (err) {
      this.smsClient = null;
    }
  }

  sendEmail(emails: string[], subject: string, msg: string) {
    emails.forEach(async (emailAddress) => {
      if (!this.emailClient) return;
      const email = await validateEmail({
        email: emailAddress,
        sender: emailAddress,
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: false,
      });
      if (!email?.valid) return;
      const mailOptions = {
        from: this.fromEmail,
        to: emailAddress,
        subject,
        text: msg,
      };
      this.emailClient.sendMail(mailOptions, (err: Error, info: any) => {
        if (err || !info?.accepted?.includes(email)) {
          console.error(`Error sending email`, err);
        }
      });
    });
  }

  sendSMS(phones: string[], msg: string) {
    phones.forEach((number) => {
      if (!this.smsClient) return;
      const validatedPhone = phone(number);
      if (validatedPhone.length < 1) return;
      this.smsClient.messages
        .create({
          from: this.fromPhone,
          to: validatedPhone[0],
          body: msg,
        })
        .catch((err) => {
          console.error(`Error sending SMS`, err);
        });
    });
  }
}
