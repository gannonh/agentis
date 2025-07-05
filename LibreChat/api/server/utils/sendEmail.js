import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { isEnabled } from './handleText.js';
import logger from '../../config/winston.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sends an email using the specified template, subject, and payload.
 *
 * @async
 * @function sendEmail
 * @param {Object} params - The parameters for sending the email.
 * @param {string} params.email - The recipient's email address.
 * @param {string} params.subject - The subject of the email.
 * @param {Record<string, string>} params.payload - The data to be used in the email template.
 * @param {string} params.template - The filename of the email template.
 * @param {boolean} [throwError=true] - Whether to throw an error if the email sending process fails.
 * @returns {Promise<Object>} - A promise that resolves to the info object of the sent email or the error if sending the email fails.
 *
 * @example
 * const emailData = {
 *   email: 'recipient@example.com',
 *   subject: 'Welcome!',
 *   payload: { name: 'Recipient' },
 *   template: 'welcome.html'
 * };
 *
 * sendEmail(emailData)
 *   .then(info => console.log('Email sent:', info))
 *   .catch(error => console.error('Error sending email:', error));
 *
 * @throws Will throw an error if the email sending process fails and throwError is `true`.
 */
const sendEmail = async ({ email, subject, payload, template, throwError = true }) => {
  try {
    let transporterOptions;

    // Use MailHog for testing and development environments
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'ci' ||
      process.env.NODE_ENV === 'development' ||
      process.env.USE_MAILHOG === 'true'
    ) {
      transporterOptions = {
        host: process.env.MAILHOG_HOST || 'localhost',
        port: process.env.MAILHOG_PORT || 1025,
        secure: false,
        auth: false,
        tls: {
          rejectUnauthorized: false,
        },
      };
    } else {
      // Production/development email configuration
      transporterOptions = {
        // Use STARTTLS by default instead of obligatory TLS
        secure: process.env.EMAIL_ENCRYPTION === 'tls',
        // If explicit STARTTLS is set, require it when connecting
        requireTls: process.env.EMAIL_ENCRYPTION === 'starttls',
        tls: {
          // Whether to accept unsigned certificates
          rejectUnauthorized: !isEnabled(process.env.EMAIL_ALLOW_SELFSIGNED),
        },
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      };

      if (process.env.EMAIL_ENCRYPTION_HOSTNAME) {
        // Check the certificate against this name explicitly
        transporterOptions.tls.servername = process.env.EMAIL_ENCRYPTION_HOSTNAME;
      }

      // Mailer service definition has precedence
      if (process.env.EMAIL_SERVICE) {
        transporterOptions.service = process.env.EMAIL_SERVICE;
      } else {
        transporterOptions.host = process.env.EMAIL_HOST;
        transporterOptions.port = process.env.EMAIL_PORT ?? 25;
      }
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    const source = fs.readFileSync(path.join(__dirname, 'emails', template), 'utf8');
    const compiledTemplate = handlebars.compile(source);
    const options = () => {
      return {
        // Header address should contain name-addr
        from:
          `"${process.env.EMAIL_FROM_NAME || process.env.APP_TITLE}"` +
          `<${process.env.EMAIL_FROM}>`,
        to: `"${payload.name}" <${email}>`,
        envelope: {
          // Envelope from should contain addr-spec
          // Mistake in the Nodemailer documentation?
          from: process.env.EMAIL_FROM,
          to: email,
        },
        subject: subject,
        html: compiledTemplate(payload),
      };
    };

    // Send email
    return await transporter.sendMail(options());
  } catch (error) {
    if (throwError) {
      throw error;
    }
    logger.error('[sendEmail]', error);
    return error;
  }
};

export default sendEmail;
