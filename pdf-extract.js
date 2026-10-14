/**
 * PDF text extraction for Phase 2.
 * Uses PDF.js from CDN (no bundler, no Node).
 * OCR for images is an integration point only — not auto-enabled.
 */

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import(PDFJS_CDN);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return pdfjsLib;
}

/**
 * Extract text from a PDF File or ArrayBuffer.
 * @param {File|ArrayBuffer|Uint8Array} source
 * @param {{ maxPages?: number, onProgress?: (msg: string) => void }} [opts]
 * @returns {Promise<{ text: string, pageCount: number, pages: string[] }>}
 */
export async function extractTextFromPdf(source, opts = {}) {
  const maxPages = opts.maxPages ?? 40;
  const onProgress = opts.onProgress || (() => {});

  onProgress('Loading PDF library…');
  const pdfjs = await loadPdfJs();

  let data;
  if (source instanceof File) {
    onProgress(`Reading file “${source.name}”…`);
    data = new Uint8Array(await source.arrayBuffer());
  } else if (source instanceof ArrayBuffer) {
    data = new Uint8Array(source);
  } else {
    data = source;
  }

  onProgress('Parsing PDF…');
  const doc = await pdfjs.getDocument({ data }).promise;
  const pageCount = doc.numPages;
  const limit = Math.min(pageCount, maxPages);
  const pages = [];

  for (let i = 1; i <= limit; i++) {
    onProgress(`Extracting page ${i} of ${limit}…`);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => ('str' in item ? item.str : '')).filter(Boolean);
    pages.push(strings.join(' '));
  }

  if (pageCount > maxPages) {
    onProgress(`Note: only first ${maxPages} of ${pageCount} pages were extracted.`);
  }

  const text = pages.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text, pageCount, pages };
}

/**
 * OCR integration point for textbook photographs.
 * Not enabled by default — requires Tesseract.js (or similar) to be loaded by the host page.
 */
export async function extractTextFromImage(_file, _opts = {}) {
  if (typeof window !== 'undefined' && window.Tesseract && typeof window.Tesseract.recognize === 'function') {
    const result = await window.Tesseract.recognize(_file, 'eng+ben', {
      logger: m => _opts.onProgress?.(m.status || String(m))
    });
    return {
      text: (result?.data?.text || '').trim(),
      engine: 'tesseract'
    };
  }

  throw new Error(
    'OCR is not configured. To enable image text extraction, load Tesseract.js and expose window.Tesseract, ' +
    'or paste text manually. PDF text extraction works without OCR.'
  );
}

/**
 * Validate file for import.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateImportFile(file) {
  if (!file) return { ok: false, reason: 'No file selected.' };
  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, reason: `“${file.name}” is too large (max 12 MB).` };
  }
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
  const isImage =
    type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
  if (!isPdf && !isImage) {
    return {
      ok: false,
      reason: `Unsupported file type: ${file.name || type || 'unknown'}. Use PDF or common image formats.`
    };
  }
  return { ok: true, isPdf, isImage };
}
