-- Widen the 'drawings' Storage bucket's allowed_mime_types to accept DWG/CAD
-- files. Previously only image/jpeg, image/png, image/gif, image/webp, and
-- application/pdf were allowed — DWG uploads were rejected by Storage itself
-- ("mime type application/dwg is not supported"), independent of and
-- invisible to any application-level validation.
--
-- AI measurement extraction still cannot read DWG/DXF (Claude has no
-- CAD-capable content-block type) — see the AI_READABLE_TYPES guard in
-- apps/web/server/trpc/routers/drawing.ts, which declines gracefully instead
-- of attempting extraction. This migration only fixes storage/upload.
--
-- Idempotent: safe to reapply against a bucket that already has some or all
-- of these mime types present.
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime_type)
  from unnest(
    coalesce(allowed_mime_types, array[]::text[]) || array[
      'application/dwg',
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'image/vnd.dwg',
      'drawing/dwg',
      'application/x-dwg'
    ]
  ) as mime_type
)
where id = 'drawings';
