import nodemailer from "nodemailer";
import { config as loadEnvVariables } from "dotenv";
import twilio from "twilio";
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
  notify(contacts: string[], msg: string, subject: string = "") {
    contacts.forEach((contact) => {
      if (contact?.includes("@") && this.emailClient) {
        const mailOptions = {
          from: this.fromEmail,
          to: contact,
          subject,
          text: msg,
        };
        this.emailClient.sendMail(mailOptions, (err: Error, info: any) => {
          if (err || !info?.accepted?.includes(contact)) {
            console.error(`Error sending email`, err);
          }
        });
      } else if (contact?.includes("+1") && this.smsClient) {
        this.smsClient.messages
          .create({
            from: this.fromPhone,
            to: contact,
            body: msg,
          })
          .catch((err) => {
            console.error(`Error sending SMS`, err);
          });
      }
    });
  }
}
