/**
 * Deteccion de secciones en el texto de un articulo.
 *
 * Sirve para dos cosas: dar al modelo el texto etiquetado en vez de un bloque
 * plano, y poder recortar lo que no aporta (sobre todo la bibliografia, que en
 * un articulo largo puede ser un tercio del texto y no se interpreta).
 *
 * Es heuristica, no analisis estructural: los PDF no marcan sus secciones.
 * Cuando no se reconoce ninguna, se devuelve el texto entero como una sola
 * seccion, que es honesto y sigue siendo util.
 */

export type SectionKind =
  | "abstract"
  | "introduction"
  | "methodology"
  | "results"
  | "discussion"
  | "limitations"
  | "conclusion"
  | "references"
  | "other";

export interface Section {
  kind: SectionKind;
  /** Encabezado tal como aparecia en el documento. */
  heading: string;
  text: string;
}

/**
 * Encabezados reconocidos, en ingles y espanol. El orden importa: se prueba de
 * arriba abajo, asi que lo mas especifico va primero ("related work" antes que
 * "results" no colisiona, pero "limitations" debe ganar a "discussion").
 */
const PATRONES: { kind: SectionKind; re: RegExp }[] = [
  { kind: "abstract", re: /^(abstract|resumen)\b/i },
  {
    kind: "introduction",
    re: /^(introduction|introducci[óo]n|background|antecedentes)\b/i,
  },
  {
    kind: "limitations",
    re: /^(limitations?|limitaciones)\b/i,
  },
  {
    kind: "methodology",
    re: /^(methods?|methodology|metodolog[íi]a|m[ée]todos?|materials and methods|materiales y m[ée]todos|experimental setup|approach)\b/i,
  },
  {
    kind: "results",
    re: /^(results?|resultados|findings|hallazgos|evaluation|evaluaci[óo]n)\b/i,
  },
  {
    kind: "discussion",
    re: /^(discussion|discusi[óo]n)\b/i,
  },
  {
    kind: "conclusion",
    re: /^(conclusions?|conclusiones?|concluding remarks)\b/i,
  },
  {
    kind: "references",
    re: /^(references?|bibliography|bibliograf[íi]a|referencias|works cited)\b/i,
  },
];

/** Numeracion de seccion: "3.", "3.2", "IV." */
const NUMERACION = /^(\d+(\.\d+)*\.?|[IVXLC]+\.)\s+/i;

/**
 * Un encabezado es una linea corta, sin punto final, que coincide con alguno
 * de los patrones. Lo de "corta" descarta las frases que mencionan la palabra
 * de paso ("in the results section we show that...").
 */
function reconocerEncabezado(
  linea: string,
): { kind: SectionKind; heading: string } | null {
  const limpia = linea.trim();
  if (limpia.length === 0 || limpia.length > 80) return null;
  if (/[.;,]$/.test(limpia)) return null;

  const sinNumero = limpia.replace(NUMERACION, "").trim();
  if (sinNumero.length === 0) return null;

  for (const { kind, re } of PATRONES) {
    if (re.test(sinNumero)) return { kind, heading: limpia };
  }

  // Encabezado numerado que no reconocemos por su nombre ("3 Model
  // Architecture"). Se acepta igualmente como corte de seccion: sin esto, una
  // seccion conocida se traga todas las siguientes hasta el proximo nombre
  // familiar, y el modelo recibe un bloque enorme mal etiquetado.
  const numerado = NUMERACION.test(limpia);
  if (numerado && /^[A-ZÁÉÍÓÚÑ]/.test(sinNumero) && sinNumero.length <= 60) {
    return { kind: "other", heading: limpia };
  }

  return null;
}

/** Parte el texto limpio en secciones. */
export function detectarSecciones(texto: string): Section[] {
  const lineas = texto.split("\n");
  const secciones: Section[] = [];
  let actual: { kind: SectionKind; heading: string; lineas: string[] } | null =
    null;

  for (const linea of lineas) {
    const encabezado = reconocerEncabezado(linea);

    if (encabezado) {
      if (actual) {
        secciones.push({
          kind: actual.kind,
          heading: actual.heading,
          text: actual.lineas.join("\n").trim(),
        });
      }
      actual = { ...encabezado, lineas: [] };
      continue;
    }

    if (actual) {
      actual.lineas.push(linea);
    } else if (linea.trim().length > 0) {
      // Texto anterior al primer encabezado: portada, autores, filiaciones.
      actual = { kind: "other", heading: "(inicio del documento)", lineas: [linea] };
    }
  }

  if (actual) {
    secciones.push({
      kind: actual.kind,
      heading: actual.heading,
      text: actual.lineas.join("\n").trim(),
    });
  }

  // Un encabezado sin cuerpo propio se conserva ("6 Results" seguido de
  // "6.1 ..."): situa lo que viene despues. Solo se descarta el bloque
  // sintetico de portada cuando esta vacio.
  return secciones.filter(
    (seccion) =>
      seccion.text.length > 0 || seccion.heading !== "(inicio del documento)",
  );
}

/**
 * Texto listo para el modelo: secciones etiquetadas y sin bibliografia.
 *
 * Se quitan las referencias porque son la parte mas voluminosa y la que menos
 * aporta a interpretar el articulo; con `limite` se recorta el resto para no
 * enviar un documento entero cuando no hace falta.
 */
export function textoParaAnalisis(secciones: Section[], limite = 60_000): string {
  const utiles = secciones.filter((seccion) => seccion.kind !== "references");
  const partes = utiles.map(
    (seccion) => `## ${seccion.heading}\n${seccion.text}`,
  );

  const completo = partes.join("\n\n");
  if (completo.length <= limite) return completo;

  return `${completo.slice(0, limite)}\n\n[Texto recortado a ${limite} caracteres.]`;
}
