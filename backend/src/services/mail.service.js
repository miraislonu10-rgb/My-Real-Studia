/**
 * STUDIA - Servicio de correo
 * ------------------------------------------------------------------
 * El sistema de recuperacion de contraseña NO depende de un proveedor
 * concreto: se define una interfaz (sendMail) y dos adaptadores.
 *
 *   MAIL_TRANSPORT=console  -> escribe el correo en la consola del servidor.
 *                              Es el modo por defecto en desarrollo: permite
 *                              probar el flujo sin configurar nada.
 *   MAIL_TRANSPORT=smtp     -> envia por SMTP. Requiere instalar nodemailer
 *                              (`npm install nodemailer`) y definir SMTP_HOST,
 *                              SMTP_PORT, SMTP_USER y SMTP_PASSWORD.
 *
 * Para conectar un proveedor real (Gmail, Outlook, SendGrid, Mailgun, Resend)
 * basta con completar las variables SMTP del archivo .env: el resto del codigo
 * no cambia.
 */

import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/** Escapa el contenido dinamico antes de insertarlo en el HTML del correo. */
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Adaptador de desarrollo: imprime el correo en la consola. */
const sendViaConsole = async ({ to, subject, text }) => {
  const divider = '='.repeat(70);
  console.log(`\n${divider}\n[mail]  Para: ${to}\n[mail]  Asunto: ${subject}\n${divider}\n${text}\n${divider}\n`);
  return { provider: 'console', delivered: true };
};

/** Adaptador SMTP real (carga nodemailer solo si se va a usar). */
const sendViaSmtp = async ({ to, subject, text, html }) => {
  if (!env.mail.smtpHost || !env.mail.smtpUser || !env.mail.smtpPassword) {
    throw AppError.serviceUnavailable(
      'El envio de correo por SMTP no esta configurado (revisa SMTP_HOST, SMTP_USER y SMTP_PASSWORD).'
    );
  }

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    throw AppError.serviceUnavailable(
      'Falta la dependencia "nodemailer". Instalala con: npm install nodemailer'
    );
  }

  const transporter = nodemailer.createTransport({
    host: env.mail.smtpHost,
    port: env.mail.smtpPort,
    secure: env.mail.smtpPort === 465,
    auth: { user: env.mail.smtpUser, pass: env.mail.smtpPassword },
  });

  await transporter.sendMail({ from: env.mail.from, to, subject, text, html });
  return { provider: 'smtp', delivered: true };
};

/**
 * Envia un correo usando el transporte configurado.
 * @param {{to:string, subject:string, text:string, html?:string}} message
 */
export const sendMail = async (message) =>
  env.mail.transport === 'smtp' ? sendViaSmtp(message) : sendViaConsole(message);

/**
 * Correo de recuperacion de contraseña con el enlace de un solo uso.
 * @param {{to:string, firstName:string, resetUrl:string, ttlMinutes:number}} data
 */
export const sendPasswordResetEmail = async ({ to, firstName, resetUrl, ttlMinutes }) => {
  const safeName = escapeHtml(firstName || 'estudiante');
  const subject = 'STUDIA - Restablece tu contraseña';

  const text = [
    `Hola ${firstName || 'estudiante'},`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de STUDIA.',
    `Abre este enlace para elegir una contraseña nueva (caduca en ${ttlMinutes} minutos):`,
    '',
    resetUrl,
    '',
    'Si no solicitaste este cambio, ignora este mensaje: tu contraseña seguira siendo la misma.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2 style="color:#4f46e5">Restablece tu contraseña de STUDIA</h2>
      <p>Hola <strong>${safeName}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;
                  border-radius:6px;text-decoration:none">Elegir nueva contraseña</a>
      </p>
      <p style="color:#6b7280">El enlace caduca en ${ttlMinutes} minutos y solo puede usarse una vez.</p>
      <p style="color:#6b7280">Si no solicitaste este cambio, ignora este mensaje.</p>
    </div>`;

  return sendMail({ to, subject, text, html });
};

export default { sendMail, sendPasswordResetEmail };
