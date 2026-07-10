'use client'

import { useState, useCallback } from 'react'

// --- Types ---
type CutPiece = { id: string; label: string; w: number; h: number; qty: number }
type PlacedPiece = { label: string; x: number; y: number; w: number; h: number; rotated: boolean }
type Sheet = { placed: PlacedPiece[]; waste: number }

// --- First Fit Decreasing bin-packing (guillotine, no rotation for simplicity) ---
function nestPieces(
  sheetW: number,
  sheetH: number,
  pieces: CutPiece[],
  allowRotation: boolean,
  kerf: number
): Sheet[] {
  // Expand qty
  const expanded: { label: string; w: number; h: number }[] = []
  for (const p of pieces) {
    for (let i = 0; i < p.qty; i++) {
      expanded.push({ label: p.label, w: p.w, h: p.h })
    }
  }

  // Sort by area desc (FFD)
  expanded.sort((a, b) => b.w * b.h - a.w * a.h)

  const sheets: Sheet[] = []

  for (const piece of expanded) {
    let placed = false

    for (const sheet of sheets) {
      if (tryPlace(sheet, piece, sheetW, sheetH, kerf, allowRotation)) {
        placed = true
        break
      }
    }

    if (!placed) {
      const newSheet: Sheet = { placed: [], waste: sheetW * sheetH }
      if (tryPlace(newSheet, piece, sheetW, sheetH, kerf, allowRotation)) {
        sheets.push(newSheet)
      }
    }
  }

  return sheets
}

function tryPlace(
  sheet: Sheet,
  piece: { label: string; w: number; h: number },
  sheetW: number,
  sheetH: number,
  kerf: number,
  allowRotation: boolean
): boolean {
  const candidates = [
    { w: piece.w, h: piece.h, rotated: false },
    ...(allowRotation && piece.w !== piece.h ? [{ w: piece.h, h: piece.w, rotated: true }] : []),
  ]

  for (const candidate of candidates) {
    const pos = findPosition(sheet.placed, candidate.w, candidate.h, sheetW, sheetH, kerf)
    if (pos) {
      sheet.placed.push({ label: piece.label, x: pos.x, y: pos.y, w: candidate.w, h: candidate.h, rotated: candidate.rotated })
      const used = sheet.placed.reduce((s, p) => s + p.w * p.h, 0)
      sheet.waste = sheetW * sheetH - used
      return true
    }
  }
  return false
}

function findPosition(
  placed: PlacedPiece[],
  w: number,
  h: number,
  sheetW: number,
  sheetH: number,
  kerf: number
): { x: number; y: number } | null {
  const step = 1 // mm resolution
  const effectiveW = w + kerf
  const effectiveH = h + kerf

  // Try a grid of candidate positions (bottom-left algorithm approximation)
  const candidates: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (const p of placed) {
    candidates.push({ x: p.x + p.w + kerf, y: p.y })
    candidates.push({ x: p.x, y: p.y + p.h + kerf })
  }

  for (const c of candidates) {
    const { x, y } = c
    if (x + w > sheetW || y + h > sheetH) continue
    if (!overlaps(placed, x, y, effectiveW, effectiveH)) {
      return { x, y }
    }
  }
  return null
}

function overlaps(placed: PlacedPiece[], x: number, y: number, w: number, h: number): boolean {
  for (const p of placed) {
    if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) {
      return true
    }
  }
  return false
}

// --- UI ---
const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
]

export default function NestingPage() {
  const [sheetW, setSheetW] = useState(3660)
  const [sheetH, setSheetH] = useState(2440)
  const [kerf, setKerf] = useState(5)
  const [allowRotation, setAllowRotation] = useState(true)
  const [pieces, setPieces] = useState<CutPiece[]>([
    { id: '1', label: 'P1', w: 800, h: 600, qty: 2 },
    { id: '2', label: 'P2', w: 1200, h: 900, qty: 1 },
  ])
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [ran, setRan] = useState(false)

  const addPiece = () => {
    const id = String(Date.now())
    setPieces(p => [...p, { id, label: `P${p.length + 1}`, w: 500, h: 400, qty: 1 }])
  }

  const updatePiece = (id: string, k: keyof CutPiece, v: unknown) => {
    setPieces(p => p.map(x => x.id === id ? { ...x, [k]: v } : x))
  }

  const removePiece = (id: string) => setPieces(p => p.filter(x => x.id !== id))

  const runNesting = useCallback(() => {
    const result = nestPieces(sheetW, sheetH, pieces, allowRotation, kerf)
    setSheets(result)
    setRan(true)
  }, [sheetW, sheetH, kerf, allowRotation, pieces])

  const totalArea = sheets.reduce((s, sh) => s + sheetW * sheetH, 0)
  const usedArea = sheets.reduce((s, sh) => s + sh.placed.reduce((ss, p) => ss + p.w * p.h, 0), 0)
  const efficiency = totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : '0'

  const labelColorMap = Object.fromEntries(
    [...new Set(pieces.map(p => p.label))].map((l, i) => [l, COLORS[i % COLORS.length]])
  )

  const SVG_SCALE = 0.1 // 1mm → 0.1px

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Nesting Optimizer</h1>
          <p className="text-sm text-zinc-400 mt-1">First Fit Decreasing algorithm — minimize glass sheet waste</p>
        </div>
        <button
          onClick={runNesting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium"
        >
          Run Nesting
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Sheet & Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Sheet Width (mm)</label>
              <input type="number" value={sheetW} onChange={e => setSheetW(Number(e.target.value))}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-sm border border-zinc-600" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Sheet Height (mm)</label>
              <input type="number" value={sheetH} onChange={e => setSheetH(Number(e.target.value))}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-sm border border-zinc-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Kerf / Gap (mm)</label>
              <input type="number" value={kerf} min={0} onChange={e => setKerf(Number(e.target.value))}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-sm border border-zinc-600" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={allowRotation} onChange={e => setAllowRotation(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500" />
                Allow 90° rotation
              </label>
            </div>
          </div>
        </div>

        {/* Pieces */}
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Cut List</h3>
            <button onClick={addPiece} className="text-blue-400 hover:text-blue-300 text-xs">+ Add Piece</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pieces.map(p => (
              <div key={p.id} className="grid grid-cols-11 gap-1 items-center">
                <div className="col-span-3">
                  <input placeholder="Label" value={p.label} onChange={e => updatePiece(p.id, 'label', e.target.value)}
                    className="w-full bg-zinc-700 text-zinc-100 px-2 py-1 rounded text-xs border border-zinc-600" />
                </div>
                <div className="col-span-3">
                  <input type="number" placeholder="W mm" value={p.w} onChange={e => updatePiece(p.id, 'w', Number(e.target.value))}
                    className="w-full bg-zinc-700 text-zinc-100 px-2 py-1 rounded text-xs border border-zinc-600" />
                </div>
                <div className="col-span-3">
                  <input type="number" placeholder="H mm" value={p.h} onChange={e => updatePiece(p.id, 'h', Number(e.target.value))}
                    className="w-full bg-zinc-700 text-zinc-100 px-2 py-1 rounded text-xs border border-zinc-600" />
                </div>
                <div className="col-span-1">
                  <input type="number" min={1} value={p.qty} onChange={e => updatePiece(p.id, 'qty', Number(e.target.value))}
                    className="w-full bg-zinc-700 text-zinc-100 px-1 py-1 rounded text-xs border border-zinc-600 text-center" />
                </div>
                <div className="col-span-1 text-center">
                  <button onClick={() => removePiece(p.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {ran && sheets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <div className="text-xs text-zinc-400">Sheets Used</div>
              <div className="text-2xl font-bold text-zinc-100">{sheets.length}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <div className="text-xs text-zinc-400">Material Efficiency</div>
              <div className={`text-2xl font-bold ${Number(efficiency) >= 80 ? 'text-green-400' : Number(efficiency) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {efficiency}%
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg px-4 py-3">
              <div className="text-xs text-zinc-400">Total Waste</div>
              <div className="text-2xl font-bold text-zinc-100">
                {((totalArea - usedArea) / 1_000_000).toFixed(2)} m²
              </div>
            </div>
          </div>

          {/* Sheet visualizations */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sheets.map((sheet, si) => {
              const svgW = sheetW * SVG_SCALE
              const svgH = sheetH * SVG_SCALE
              const sheetEff = ((sheet.placed.reduce((s, p) => s + p.w * p.h, 0) / (sheetW * sheetH)) * 100).toFixed(1)
              return (
                <div key={si} className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-zinc-300">Sheet {si + 1}</span>
                    <span className="text-xs text-zinc-400">{sheetEff}% used · {sheet.placed.length} pcs</span>
                  </div>
                  <div className="overflow-auto">
                    <svg
                      width={svgW}
                      height={svgH}
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="border border-zinc-600 rounded"
                      style={{ background: '#3f3f46', maxWidth: '100%' }}
                    >
                      {sheet.placed.map((p, pi) => {
                        const color = labelColorMap[p.label] ?? '#6b7280'
                        const px = p.x * SVG_SCALE
                        const py = p.y * SVG_SCALE
                        const pw = p.w * SVG_SCALE
                        const ph = p.h * SVG_SCALE
                        return (
                          <g key={pi}>
                            <rect x={px} y={py} width={pw} height={ph} fill={color} fillOpacity={0.75} stroke={color} strokeWidth={0.5} />
                            <text
                              x={px + pw / 2} y={py + ph / 2}
                              fontSize={Math.min(pw, ph) > 20 ? 8 : 6}
                              fill="white"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontWeight="bold"
                            >
                              {p.label}{p.rotated ? 'R' : ''}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {sheetW}×{sheetH}mm
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {pieces.map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs text-zinc-300">
                <div className="w-3 h-3 rounded-sm" style={{ background: labelColorMap[p.label] ?? '#6b7280' }} />
                {p.label} ({p.w}×{p.h}mm ×{p.qty})
              </div>
            ))}
          </div>
        </div>
      )}

      {ran && sheets.length === 0 && (
        <div className="text-center py-12 text-zinc-500">No pieces to nest — add cut pieces first.</div>
      )}
    </div>
  )
}
