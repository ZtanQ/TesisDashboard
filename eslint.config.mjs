import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * La regla de abajo es la que sostiene la arquitectura del proyecto: la
 * interfaz habla con `lib/paper-service` y con nadie mas. Sin ella, el primer
 * arreglo rapido que importe un cliente academico desde un componente pasa
 * inadvertido y la separacion se pierde sin que nadie lo note.
 */
const capasDelDominio = {
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/lib/academic/*", "**/lib/academic/*"],
            message:
              "La interfaz no puede hablar con una fuente académica directamente. Usa getPaperByDoi de @/lib/paper-service.",
          },
          {
            group: ["@/lib/normalization/*", "**/lib/normalization/*"],
            message:
              "Los normalizadores son un detalle interno de la capa de datos. La interfaz solo conoce el tipo Paper.",
          },
        ],
      },
    ],
  },
};

/** Un normalizador convierte datos; no debe salir a la red por su cuenta. */
const normalizadoresPuros = {
  files: ["lib/normalization/**/*.ts"],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "fetch", message: "Un normalizador solo transforma datos ya obtenidos." },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  capasDelDominio,
  normalizadoresPuros,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
