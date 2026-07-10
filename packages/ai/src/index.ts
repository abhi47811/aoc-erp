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
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
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
