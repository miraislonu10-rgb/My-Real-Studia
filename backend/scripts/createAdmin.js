#!/usr/bin/env node
/**
 * STUDIA - Creacion segura de la cuenta de administrador
 * ------------------------------------------------------------------
 * El administrador NO puede crearse desde el formulario publico de
 * estudiantes (el servicio de registro fuerza role = 'student'). Esta cuenta
 * inicial se crea con este script, que debe ejecutarse en el servidor por una
 * persona con acceso al proyecto.
 *
 * USO
 *   npm run create:admin
 *   npm run create:admin -- --email=admin@studia.mx --firstName=Ada --lastName=Lovelace
 *
 * La contraseña se solicita de forma interactiva (sin mostrarla en pantalla).
 * Tambien puede definirse en la variable de entorno ADMIN_PASSWORD para
 * entornos automatizados. Nunca se imprime ni se guarda en texto plano: solo
 * se almacena su hash bcrypt.
 */

import readline from 'node:readline';
import crypto from 'node:crypto';

import { pool, closePool } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/utils/security.js';
import * as userModel from '../src/models/user.model.js';

/** Lee los argumentos --clave=valor. */
const parseArgs = (argv) => {
  const args = {};
  for (const item of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(item);
    if (match) args[match[1]] = match[2];
  }
  return args;
};

/** Solicita un valor por consola sin mostrarlo por pantalla. */
const promptHidden = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    const onData = (char) => {
      const text = char.toString();
      if (text === '\n' || text === '\r' || text === '\u0004') {
        process.stdin.removeListener('data', onData);
      } else {
        // Reescribe el prompt ocultando lo tecleado
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };

    process.stdin.on('data', onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

const promptVisible = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

/** Valida que la contraseña cumpla la politica minima del backend. */
const assertStrongPassword = (password) => {
  const min = env.auth.minPasswordLength;
  if (!password || password.length < min) {
    throw new Error(`La contraseña debe tener al menos ${min} caracteres.`);
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe incluir al menos una letra y un numero.');
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const email = (args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const firstName = (args.firstName || process.env.ADMIN_FIRST_NAME || '').trim();
  const lastName = (args.lastName || process.env.ADMIN_LAST_NAME || '').trim();

  let password = args.password || process.env.ADMIN_PASSWORD || '';

  if (!email) {
    console.error('[admin]  Falta el correo. Usa --email=... o la variable ADMIN_EMAIL.');
    process.exit(1);
  }

  if (!password) {
    password = await promptHidden('Contraseña del administrador (no se mostrara): ');
    const confirmation = await promptHidden('Confirma la contraseña: ');
    if (password !== confirmation) {
      console.error('[admin]  Las contraseñas no coinciden.');
      process.exit(1);
    }
  }

  try {
    assertStrongPassword(password);
  } catch (error) {
    console.error(`[admin]  ${error.message}`);
    process.exit(1);
  }

  const finalFirstName = firstName || (await promptVisible('Nombre: '));
  const finalLastName = lastName || (await promptVisible('Apellido: '));

  if (!finalFirstName || !finalLastName) {
    console.error('[admin]  El nombre y el apellido son obligatorios.');
    process.exit(1);
  }

  const existing = await userModel.findByEmail(email);
  const passwordHash = await hashPassword(password);

  if (existing) {
    if (existing.role !== 'admin') {
      console.error(
        `[admin]  El correo ${email} ya pertenece a una cuenta con rol "${existing.role}". ` +
          'No se convertira en administrador por seguridad.'
      );
      process.exit(1);
    }

    // Cuenta de administrador existente: se actualiza la contraseña y se
    // reactiva la cuenta si estuviera suspendida.
    await userModel.updatePassword(existing.id, passwordHash);
    await userModel.updateStatus(existing.id, 'active');
    console.log(`[admin]  Contraseña actualizada para el administrador existente ${email}.`);
  } else {
    const id = await userModel.createUser({
      uuid: crypto.randomUUID(),
      email,
      passwordHash,
      firstName: finalFirstName,
      lastName: finalLastName,
      role: 'admin',
      status: 'active',
    });
    console.log(`[admin]  Cuenta de administrador creada (id=${id}, correo=${email}).`);
  }

  console.log('[admin]  La contraseña se guardo unicamente como hash bcrypt.');
  console.log('[admin]  Inicia sesion en la aplicacion con estas credenciales.');
};

main()
  .catch((error) => {
    console.error(`[admin]  Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
