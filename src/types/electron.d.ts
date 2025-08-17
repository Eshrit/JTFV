// src/types/electron.d.ts
export {};

declare global {
  interface Window {
    electron?: {
      /** Print an A4 invoice to Canon (expects a data: URL of HTML) */
      printCanonA4: (
        dataUrl: string,
        opts?: { landscape?: boolean }
      ) => Promise<{ ok: boolean; error?: string }>;

      /** Print a 50mm label to Citizen (expects a data: URL of HTML) */
      printCitizen50: (
        dataUrl: string,
        opts?: Record<string, unknown>
      ) => Promise<{ ok: boolean; error?: string }>;

      /** Get available printers from main */
      listPrinters: () => Promise<any[]>;
    };
  }
}
