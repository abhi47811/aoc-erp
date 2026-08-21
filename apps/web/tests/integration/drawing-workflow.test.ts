import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createTestTenant, createTestProject, type TestTenant } from '../setup/testTenant'
import { getServiceClient } from '../setup/serviceClient'
import { loadFixture, FIXTURES } from '../setup/fixtures'
import { randomUUID } from 'node:crypto'

// Router-level tests mock the actual model call — extraction *accuracy* is
// covered by tests/live/extraction-accuracy.test.ts (real Anthropic calls,
// opt-in, costs tokens). These tests exercise everything around that call:
// Storage bucket enforcement, tRPC validation, the DWG graceful-decline
// guard, persistence, and full post-upload continuation.
const mockExtract = vi.fn()
vi.mock('@aoc/ai', () => ({
  extractGlassMeasurements: (...args: unknown[]) => mockExtract(...args),
}))

const BUCKET = 'drawings'

async function uploadFixture(tenantId: string, fixtureKey: keyof typeof FIXTURES, contentType?: string) {
  const supabase = getServiceClient()
  const fx = FIXTURES[fixtureKey]
  const { buffer } = loadFixture(fx.file)
  const filePath = `${tenantId}/${randomUUID()}-${fx.file}`
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: contentType ?? fx.mime,
  })
  return { filePath, error }
}

describe('Drawing upload → storage → extract workflow', () => {
  let tt: TestTenant
  let projectId: string

  beforeAll(async () => {
    tt = await createTestTenant('owner')
    const project = await createTestProject(tt.ctx, tt.tenantId)
    projectId = project.id
  })

  afterAll(async () => {
    await tt.cleanup()
  })

  describe('Supabase Storage bucket MIME enforcement (server-side, independent of any app code)', () => {
    it('accepts a real PNG drawing', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'glassDrawingPng')
      expect(error).toBeNull()
    })

    it('accepts a real PDF drawing', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'pdfDrawing')
      expect(error).toBeNull()
    })

    it('accepts a real DWG (the bug fixed in this project — was previously rejected)', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'dwgDrawing')
      expect(error).toBeNull()
    })

    it('rejects a genuinely unsupported real format (SVG)', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'svg')
      expect(error).not.toBeNull()
    })

    it('rejects a genuinely unsupported real format (ZIP)', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'zip')
      expect(error).not.toBeNull()
    })

    it('rejects a genuinely unsupported real format (plain text)', async () => {
      const { error } = await uploadFixture(tt.tenantId, 'txt')
      expect(error).not.toBeNull()
    })

    it('documents a real limitation: the bucket allowlist checks the declared Content-Type, not the file bytes — a Windows executable mislabeled as application/dwg is accepted', async () => {
      // This is not a bug introduced by the DWG fix — Supabase Storage's
      // allowlist has never sniffed content. Recorded here so it's a known,
      // tested limitation rather than a silent gap. Anything executed from
      // these files is out of scope (they're never executed — only base64'd
      // to an LLM or served back for download).
      const { error } = await uploadFixture(tt.tenantId, 'fakeRenamedDwg')
      expect(error).toBeNull()
    })
  })

  describe('drawing.create + drawing.extract — real image (mocked model call)', () => {
    it('completes the full workflow: upload → create → extract → done, with real extracted data persisted', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)

      const { filePath } = await uploadFixture(tt.tenantId, 'glassDrawingPng')
      const drawing = await caller.create({
        project_id: projectId,
        title: 'Test PNG Drawing',
        file_path: filePath,
        mime_type: 'image/png',
      })
      expect(drawing.id).toBeTruthy()

      const mockResult = {
        items: [{ description: 'Test Panel', qty: 1, width_mm: 500, height_mm: 500, glass_type: 'Clear', thickness_mm: 6, notes: null }],
        total_area_sqm: 0.25,
        drawing_ref: null,
      }
      mockExtract.mockResolvedValueOnce(mockResult)

      const result = await caller.extract(drawing.id)
      expect(result).toEqual(mockResult)
      expect(mockExtract).toHaveBeenCalledWith(expect.any(String), 'image/png')

      // Post-upload continuation: the persisted row actually reflects success,
      // not just that the mutation returned without throwing.
      const supabase = getServiceClient()
      const { data: row } = await supabase.from('drawings').select('ai_status, ai_extracted, ai_error').eq('id', drawing.id).single()
      expect(row?.ai_status).toBe('done')
      expect(row?.ai_extracted).toEqual(mockResult)
      expect(row?.ai_error).toBeNull()
    })

    it('sends the document content-block branch for a real PDF (mocked at the API layer, real branch in extract())', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)

      const { filePath } = await uploadFixture(tt.tenantId, 'pdfDrawing')
      const drawing = await caller.create({ project_id: projectId, title: 'Test PDF', file_path: filePath, mime_type: 'application/pdf' })

      mockExtract.mockResolvedValueOnce({ items: [], total_area_sqm: 0, drawing_ref: null })
      await caller.extract(drawing.id)
      expect(mockExtract).toHaveBeenCalledWith(expect.any(String), 'application/pdf')
    })

    it('propagates a real model failure into ai_status=failed with the actual error message (not swallowed, not faked success)', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)

      const { filePath } = await uploadFixture(tt.tenantId, 'glassDrawingPng')
      const drawing = await caller.create({ project_id: projectId, title: 'Will fail', file_path: filePath, mime_type: 'image/png' })

      mockExtract.mockRejectedValueOnce(new Error('AI returned no valid JSON'))
      await expect(caller.extract(drawing.id)).rejects.toThrow('AI returned no valid JSON')

      const supabase = getServiceClient()
      const { data: row } = await supabase.from('drawings').select('ai_status, ai_error').eq('id', drawing.id).single()
      expect(row?.ai_status).toBe('failed')
      expect(row?.ai_error).toContain('AI returned no valid JSON')
    })
  })

  describe('drawing.extract — DWG graceful decline (the core fix under test)', () => {
    it('never calls the model for a DWG, sets ai_status=failed with the exact honest message, and the drawing stays viewable', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)

      const { filePath } = await uploadFixture(tt.tenantId, 'dwgDrawing')
      const drawing = await caller.create({ project_id: projectId, title: 'Test DWG', file_path: filePath, mime_type: 'application/dwg' })

      mockExtract.mockClear()
      await expect(caller.extract(drawing.id)).rejects.toMatchObject({
        message: expect.stringContaining("AI measurement extraction isn't available for CAD files"),
      })
      expect(mockExtract).not.toHaveBeenCalled()

      const supabase = getServiceClient()
      const { data: row } = await supabase.from('drawings').select('ai_status, ai_error').eq('id', drawing.id).single()
      expect(row?.ai_status).toBe('failed')
      expect(row?.ai_error).toBe(
        "AI measurement extraction isn't available for CAD files (DWG/DXF) yet - only raster images and PDFs can be read. The file is stored and viewable, but measurements need to be entered manually or from an exported PDF/image."
      )

      // Complete post-upload continuation check: the file is still
      // retrievable — the workflow doesn't dead-end just because AI failed.
      const view = await caller.getViewUrl(drawing.id)
      expect(view.url).toContain('http')
    })

    it('declines the same way for a malformed .dwg (bogus bytes) — the guard checks the stored mime_type, not the file content, so it never even attempts to read the garbage bytes', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)

      const { filePath, error: uploadErr } = await uploadFixture(tt.tenantId, 'malformedDwg')
      expect(uploadErr).toBeNull()
      const drawing = await caller.create({ project_id: projectId, title: 'Malformed DWG', file_path: filePath, mime_type: 'application/dwg' })

      mockExtract.mockClear()
      await expect(caller.extract(drawing.id)).rejects.toThrow(/CAD files/)
      expect(mockExtract).not.toHaveBeenCalled()
    })
  })

  describe('boundary / negative input validation', () => {
    it('rejects create with a non-uuid project_id (zod boundary)', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)
      await expect(
        caller.create({ project_id: 'not-a-uuid', title: 'x', file_path: 'x' } as never)
      ).rejects.toThrow()
    })

    it('rejects create with an empty title (zod min-length boundary)', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)
      await expect(
        caller.create({ project_id: projectId, title: '', file_path: 'x' })
      ).rejects.toThrow()
    })

    it('extract on a nonexistent drawing id returns NOT_FOUND', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(tt.ctx)
      await expect(caller.extract(randomUUID())).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('rejects tenantProcedure calls with no tenantId (cross-tenant / onboarding-incomplete boundary)', async () => {
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const noTenantCtx = { ...tt.ctx, tenantId: null } as never
      const caller = drawingRouter.createCaller(noTenantCtx)
      await expect(caller.list(projectId)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('rate limiting (isolated tenant so earlier tests in this file cannot pollute the bucket)', () => {
    it('throws TOO_MANY_REQUESTS after 10 extract calls within the window', async () => {
      const rl = await createTestTenant('owner')
      const rlProject = await createTestProject(rl.ctx, rl.tenantId)
      const { drawingRouter } = await import('@/server/trpc/routers/drawing')
      const caller = drawingRouter.createCaller(rl.ctx)

      mockExtract.mockResolvedValue({ items: [], total_area_sqm: 0, drawing_ref: null })

      try {
        for (let i = 0; i < 10; i++) {
          const { filePath } = await uploadFixture(rl.tenantId, 'glassDrawingPng')
          const drawing = await caller.create({ project_id: rlProject.id, title: `RL ${i}`, file_path: filePath, mime_type: 'image/png' })
          await caller.extract(drawing.id)
        }
        const { filePath } = await uploadFixture(rl.tenantId, 'glassDrawingPng')
        const drawing = await caller.create({ project_id: rlProject.id, title: 'RL 11', file_path: filePath, mime_type: 'image/png' })
        await expect(caller.extract(drawing.id)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
      } finally {
        await rl.cleanup()
      }
    })
  })
})
