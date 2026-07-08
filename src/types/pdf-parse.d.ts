declare module "pdf-parse" {
  interface PDFParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(buffer: Buffer): Promise<PDFParseResult>;
  export default pdfParse;
}
