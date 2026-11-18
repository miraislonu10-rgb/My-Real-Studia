/**
 * STUDIA - Utilidad para generar hashes de contraseña (bcrypt)
 * ------------------------------------------------------------------
 * Uso:  npm run hash:password -- "MiContraseñaSegura"
 * Sirve para crear el hash que se guardara en users.password_hash
 * (la base de datos nunca almacena contraseñas en texto plano).
 */

import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash:password -- "MiContraseñaSegura"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, env.bcryptSaltRounds);
console.log(`Rondas bcrypt : ${env.bcryptSaltRounds}`);
console.log(`Hash generado : ${hash}`);
