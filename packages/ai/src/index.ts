import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface GlassMeasurementItem {
  description: string
  qty: number
  width_mm: number
  height_mm: number
  glass_type: string
  thickness_mm: number | null
  notes: string | null
}

export interface ExtractionResult {
  items: GlassMeasurementItem[]
  total_area_sqm: number
  drawing_ref: string | null
}

export async function extractGlassMeasurements(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' = 'image/jpeg',
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          mediaType === 'application/pdf'
            ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: imageBase64 } }
            : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          {
            type: 'text',
            text: `You are an expert at reading glass fabrication drawings. Extract all glass measurements from this drawing and return ONLY a JSON object with this exact structure:

{
  "items": [
    {
      "description": "panel description or location",
      "qty": 1,
      "width_mm": 600,
      "height_mm": 900,
      "glass_type": "Clear Float / Toughened / Laminated / etc",
      "thickness_mm": 6,
      "notes": "any special notes or null"
    }
  ],
  "total_area_sqm": 0.54,
  "drawing_ref": "drawing number or reference or null"
}

Rules:
- Convert all measurements to millimeters
- Calculate total_area_sqm as sum of (qty × width_mm × height_mm / 1000000)
- If a field is unknown, use null
- Return ONLY the JSON, no other text`,
          },
        ],
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no valid JSON')
  return JSON.parse(jsonMatch[0]) as ExtractionResult
}

export interface SupplierDocItem {
  description: string
  qty: number
  unit_price: number
}

export interface SupplierDocExtractionResult {
  items: SupplierDocItem[]
  supplier_name: string | null
}

export async function extractSupplierDocItems(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
): Promise<SupplierDocExtractionResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert at reading supplier invoices and quotes for glass fabrication materials and hardware. Extract all line items from this document and return ONLY a JSON object with this exact structure:

{
  "items": [
    {
      "description": "item description",
      "qty": 1,
      "unit_price": 100.00
    }
  ],
  "supplier_name": "supplier company name or null"
}

Rules:
- qty and unit_price must be numbers (unit_price excluding tax if shown separately)
- If a field is unknown, use null
- Return ONLY the JSON, no other text`,
          },
        ],
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no valid JSON')
  return JSON.parse(jsonMatch[0]) as SupplierDocExtractionResult
}

export interface BusinessCardExtraction {
  name: string | null
  company: string | null
  email: string | null
  mobile: string | null
}

export async function extractBusinessCard(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
): Promise<BusinessCardExtraction> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert at reading business cards. Extract the contact's details from this business card and return ONLY a JSON object with this exact structure:

{
  "name": "person's full name or null",
  "company": "company name or null",
  "email": "email address or null",
  "mobile": "phone number or null"
}

Rules:
- If a person has multiple phone numbers, prefer a mobile number over a landline
- If a field is unknown or not visible, use null
- Return ONLY the JSON, no other text`,
          },
        ],
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no valid JSON')
  return JSON.parse(jsonMatch[0]) as BusinessCardExtraction
}

export interface GSTCertificateExtraction {
  gstin: string | null
  legal_name: string | null
  address: string | null
}

export async function extractGSTCertificate(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
): Promise<GSTCertificateExtraction> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert at reading Indian GST registration certificates. Extract the details from this certificate and return ONLY a JSON object with this exact structure:

{
  "gstin": "15-character GSTIN or null",
  "legal_name": "legal name of business or null",
  "address": "principal place of business address or null"
}

Rules:
- gstin must be the 15-character GSTIN exactly as printed, uppercase, no spaces
- If a field is unknown or not visible, use null
- Return ONLY the JSON, no other text`,
          },
        ],
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no valid JSON')
  return JSON.parse(jsonMatch[0]) as GSTCertificateExtraction
}
