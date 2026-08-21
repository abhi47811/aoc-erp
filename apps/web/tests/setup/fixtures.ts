import { readFileSync } from 'node:fs'
import path from 'node:path'

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures')

export interface Fixture {
  name: string
  path: string
  buffer: Buffer
  base64: string
}

export function loadFixture(filename: string): Fixture {
  const filePath = path.join(FIXTURES_DIR, filename)
  const buffer = readFileSync(filePath)
  return { name: filename, path: filePath, buffer, base64: buffer.toString('base64') }
}

// Real-format fixtures, sourced from genuine public files (see tests/fixtures/README.md).
// Never renamed-extension synthetic files.
export const FIXTURES = {
  // Genuine glass-fabrication drawing with a previously-verified correct AI
  // extraction result (see integration/drawing-workflow.test.ts).
  glassDrawingPng: { file: 'glass_drawing.png', mime: 'image/png' },
  pdfDrawing: { file: 'sample.pdf', mime: 'application/pdf' },
  dwgDrawing: { file: 'sample.dwg', mime: 'application/dwg' }, // real Autodesk AutoCAD 2007-2009 sample
  dwg2013: { file: 'sample_2013.dwg', mime: 'application/dwg' }, // real Autodesk AutoCAD 2010-2012 sample

  jpeg: { file: 'sample.jpg', mime: 'image/jpeg' },
  png: { file: 'sample.png', mime: 'image/png' },
  gif: { file: 'sample.gif', mime: 'image/gif' },
  webp: { file: 'sample.webp', mime: 'image/webp' },

  // The 1978 Bill Gates / Microsoft business card — a widely-circulated
  // historical artifact, not private data. Known expected extraction values.
  businessCard: { file: 'business_card.jpg', mime: 'image/jpeg' },
  // A Central University of Tamil Nadu GST registration — a public
  // institution's registration, which by its own text must be displayed
  // publicly. Known GSTIN / legal name.
  gstCertificate: { file: 'gst_certificate.png', mime: 'image/png' },

  // Unsupported-but-genuine formats, for negative MIME testing.
  svg: { file: 'sample.svg', mime: 'image/svg+xml' },
  zip: { file: 'sample.zip', mime: 'application/zip' },
  txt: { file: 'sample.txt', mime: 'text/plain' },
  eicar: { file: 'eicar_test.txt', mime: 'text/plain' },

  // Malformed / adversarial fixtures.
  malformedDwg: { file: 'malformed.dwg', mime: 'application/dwg' }, // plain text, not real DWG bytes
  malformedPdf: { file: 'malformed.pdf', mime: 'application/pdf' }, // real %PDF header, garbage body
  fakeRenamedDwg: { file: 'fake_renamed.dwg', mime: 'application/dwg' }, // Windows EXE header (MZ) mislabeled
} as const

export type FixtureKey = keyof typeof FIXTURES
