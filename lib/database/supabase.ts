import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Conexion a Supabase. Solo servidor: usa la service role key, que salta las
 * politicas de acceso y jamas debe llegar al navegador. El import de
 * "server-only" hace que el build falle si alguien la importa desde un
 * componente cliente, en vez de descubrirlo en produccion.
 *
 * La biblioteca es opcional: PaperLens analiza articulos sin base de datos
 * configurada. Por eso esto devuelve null en lugar de lanzar, y quien lo usa
 * decide como degradar.
 */

let cached: SupabaseClient | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * Comprueba que la base responde de verdad, no solo que hay credenciales.
 *
 * Lo usan los tests de integracion para saltarse solos cuando nadie ha
 * levantado la base: `npm test` debe pasar en una maquina sin Docker.
 */
export async function isDatabaseReachable(timeoutMs = 1500): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}
