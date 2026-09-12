import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Las acciones de servidor aceptan 1 MB de cuerpo por defecto, y un PDF
       * de un articulo pasa de eso con facilidad. Se sube al mismo tope que
       * MAX_PDF_BYTES en lib/pdf/extract.ts: si se cambia uno, cambiar el otro.
       */
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
