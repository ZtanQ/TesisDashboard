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

/** Tope por intento: acota una conexion que se quede colgada. */
const ATTEMPT_TIMEOUT_MS = 4000;

/**
 * Tope para la operacion completa, reintentos incluidos.
 *
 * Hace falta ademas del anterior porque `supabase-js` reintenta por su cuenta:
 * con la base caida hacia cuatro intentos, cada uno fallando en ~1,7 s (en
 * Windows, conectar a un puerto cerrado no se rechaza al instante), y ninguno
 * llegaba a agotar su tope individual. El resultado eran 7 segundos en cada
 * analisis. La biblioteca es secundaria: mas vale darla por no disponible que
 * hacer esperar por ella.
 */
export const OPERATION_TIMEOUT_MS = 2500;

const TIMED_OUT = Symbol("db-timeout");

/** Corta una operacion que tarde demasiado, sin dejar el temporizador vivo. */
export async function withDeadline<T>(
  work: PromiseLike<T>,
  ms: number = OPERATION_TIMEOUT_MS,
): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });

  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function timedOut<T>(value: T | typeof TIMED_OUT): value is typeof TIMED_OUT {
  return value === TIMED_OUT;
}

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
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
        return fetch(input, {
          ...init,
          // Se respeta la senal que traiga la peticion, si la hay.
          signal: init?.signal
            ? AbortSignal.any([init.signal, timeout])
            : timeout,
        });
      },
    },
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
