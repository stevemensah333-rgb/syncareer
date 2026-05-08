declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean };
    jsPDF?: { unit?: string; format?: string; orientation?: string };
    pagebreak?: { mode?: string | string[] };
  }

  interface Html2PdfWorker {
    set: (options: Html2PdfOptions) => Html2PdfWorker;
    from: (element: HTMLElement | string) => Html2PdfWorker;
    save: () => Promise<void>;
    output: (type: string, options?: object) => Promise<Blob | string>;
    then: (callback: () => void) => Html2PdfWorker;
    toPdf: () => Html2PdfWorker;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfWorker;

  export = html2pdf;
}
