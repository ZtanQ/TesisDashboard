import { describe, expect, it } from "vitest";
import {
  bestQuartile,
  normalizeIssn,
  parseScimagoCsv,
} from "@/lib/academic/scimago";

describe("ISSN", () => {
  it("iguala las grafías de SCImago y OpenAlex", () => {
    // SCImago los publica sin guion; OpenAlex, con él.
    expect(normalizeIssn("08997667")).toBe("08997667");
    expect(normalizeIssn("0899-7667")).toBe("08997667");
  });

  it("conserva la X final en mayúscula", () => {
    expect(normalizeIssn("1530-888x")).toBe("1530888X");
  });
});

describe("cuartil por categoría", () => {
  it("toma el mejor cuartil y dice en qué categoría lo alcanza", () => {
    // Decir solo "Q1" daría una idea más favorable que la real en las demás.
    expect(bestQuartile("Education (Q2); Computer Science (Q1)")).toEqual({
      quartile: "Q1",
      category: "Computer Science",
    });
  });

  it("funciona con una sola categoría", () => {
    expect(bestQuartile("Neuroscience (Q3)")).toEqual({
      quartile: "Q3",
      category: "Neuroscience",
    });
  });

  it("devuelve indefinido si ninguna categoría trae cuartil", () => {
    expect(bestQuartile("Education; Computer Science")).toBeUndefined();
    expect(bestQuartile("")).toBeUndefined();
    expect(bestQuartile(undefined)).toBeUndefined();
  });
});

describe("CSV de SCImago", () => {
  const csv = [
    "Rank;Sourceid;Title;Type;Issn;SJR;SJR Best Quartile;H index;Country;Publisher;Categories",
    '1;123;Neural Computation;journal;08997667, 1530888X;2,604;Q1;249;United States;MIT Press;Computer Science (Q1); Neuroscience (Q2)',
    '2;456;Revista Sin Cuartil;journal;12345678;-;-;12;Spain;Editorial;Educación',
  ].join("\n");

  it("emite un registro por cada ISSN de la revista", () => {
    // Papel y electrónico: cualquiera de los dos debe encontrarla.
    const filas = parseScimagoCsv(csv, 2024);
    const neural = filas.filter((f) => f.title === "Neural Computation");
    expect(neural.map((f) => f.issn).sort()).toEqual(["08997667", "1530888X"]);
  });

  it("lee el decimal con coma", () => {
    const [fila] = parseScimagoCsv(csv, 2024);
    expect(fila.sjr).toBe(2.604);
  });

  it("registra el año que se le indica, no el actual", () => {
    // Un cuartil de 2024 mostrado como de 2026 sería falsear la métrica.
    expect(parseScimagoCsv(csv, 2024)[0].year).toBe(2024);
    expect(parseScimagoCsv(csv, 2019)[0].year).toBe(2019);
  });

  it("trata el guion como ausencia de dato", () => {
    const fila = parseScimagoCsv(csv, 2024).find(
      (f) => f.title === "Revista Sin Cuartil",
    );
    expect(fila?.sjr).toBeUndefined();
    expect(fila?.quartile).toBeUndefined();
    expect(fila?.hIndex).toBe(12);
  });

  it("descarta ISSN que no tengan ocho dígitos", () => {
    const filas = parseScimagoCsv(
      "Title;Issn;Categories\nRevista;0000;Educación (Q1)",
      2024,
    );
    expect(filas).toEqual([]);
  });

  it("devuelve vacío si el CSV no tiene las columnas esperadas", () => {
    expect(parseScimagoCsv("uno;dos\na;b", 2024)).toEqual([]);
    expect(parseScimagoCsv("", 2024)).toEqual([]);
  });

  it("acepta también CSV separado por comas con campos entrecomillados", () => {
    const filas = parseScimagoCsv(
      'Title,Issn,SJR,Categories\n"Journal, The",08997667,1.5,"Education (Q1)"',
      2024,
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].title).toBe("Journal, The");
    expect(filas[0].quartile).toBe("Q1");
  });
});
