# Test fixtures — provenance

All fixtures are genuine files in their real format, sourced from public origins — never a
renamed-extension stand-in. Sources:

| File | Real format | Source |
|---|---|---|
| `sample.pdf` | PDF 1.4 | W3C accessibility test suite (`w3.org/WAI/ER/tests/.../dummy.pdf`) |
| `sample.jpg` | JPEG | httpbin.org `/image/jpeg` (WPClipart, public domain) |
| `sample.png` | PNG | python.org static logo |
| `sample.gif` | GIF89a | Wikimedia Commons (`Rotating_earth_(large).gif`) |
| `sample.webp` | WebP | httpbin.org `/image/webp` |
| `sample.dwg` | AutoCAD DWG 2007/2008/2009 | Autodesk official sample files (`download.autodesk.com/us/samplefiles/acad/lineweights.dwg`) |
| `sample_2013.dwg` | AutoCAD DWG 2010/2011/2012 | Autodesk official sample files (`title_block-iso.dwg`) |
| `business_card.jpg` | JPEG | The 1978 Bill Gates / Microsoft business card — a widely-circulated historical artifact, not private data |
| `gst_certificate.png` | PNG | Central University of Tamil Nadu's public GST registration (Form GST REG-06) — a public institution's registration, which by its own printed text must be displayed publicly |
| `glass_drawing.png` | PNG | Genuine glass-fabrication elevation drawing, reused from a prior manual E2E pass with an already-confirmed correct AI extraction result |
| `sample.svg` | SVG | Hand-authored, genuinely valid SVG XML (unsupported MIME, used for negative tests) |
| `sample.zip` | ZIP | Real deflate-compressed archive (unsupported MIME, used for negative tests) |
| `sample.txt` | Plain text | Genuine text file (unsupported MIME, used for negative tests) |
| `eicar_test.txt` | EICAR test string | Industry-standard antivirus test signature (harmless, universally recognized by `file`/AV scanners) |
| `malformed.dwg` | — | Plain text with a `.dwg` extension — deliberately NOT real DWG bytes, for malformed-content tests |
| `malformed.pdf` | — | Real `%PDF-1.4` magic header, garbage body — passes a naive header sniff but isn't a structurally valid PDF |
| `fake_renamed.dwg` | — | Windows PE/EXE header (`MZ...`) saved with a `.dwg` extension — the "malicious file, spoofed extension" attack case |

No fixture contains a real, private individual's personal data.
