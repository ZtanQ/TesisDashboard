// Vitest no lee .env.local por su cuenta. Se carga aqui para que los tests de
// integracion encuentren las credenciales de la base de datos; si el archivo
// no existe, los tests que la necesitan se saltan solos.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local no hay nada que cargar.
}
