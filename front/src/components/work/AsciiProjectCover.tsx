/** Deterministic ASCII sculptures used only when a project has no uploaded cover. */
export function AsciiProjectCover({ seed }: { seed: string }) {
  const hash = Array.from(seed).reduce((n, char) => n + char.charCodeAt(0), 0)
  const kind = hash % 3, cols = 150, rows = 94, depth = new Float32Array(cols * rows), light = new Float32Array(cols * rows)
  depth.fill(-Infinity)
  const yaw = .35 + hash % 7 * .1, cy = Math.cos(yaw), sy = Math.sin(yaw)
  for (let i = 0; i < 100; i++) for (let j = 0; j < 220; j++) {
    const a = i / 100 * Math.PI * (kind === 1 ? 2 : 1), b = j / 220 * Math.PI * 2
    let x: number, y: number, z: number, nx: number, ny: number, nz: number
    if (kind === 1) {
      x = (.67 + .29 * Math.cos(b)) * Math.cos(a); y = (.67 + .29 * Math.cos(b)) * Math.sin(a); z = .29 * Math.sin(b)
      nx = Math.cos(b) * Math.cos(a); ny = Math.cos(b) * Math.sin(a); nz = Math.sin(b)
    } else {
      const r = kind === 2 ? 1 + .13 * Math.sin(b * 5 + a * 4) : 1
      x = Math.sin(a) * Math.cos(b) * r; y = Math.cos(a) * r; z = Math.sin(a) * Math.sin(b) * r
      nx = x; ny = y; nz = z
    }
    const ry = y * .8 - z * .6, rz = y * .6 + z * .8
    const rx = x * cy + rz * sy, dz = -x * sy + rz * cy
    const p = 4 / (4 - dz * .15)
    const sx = Math.floor(cols / 2 + rx * 52 * p), py = Math.floor(rows / 2 + ry * 39 * p)
    if (sx < 0 || py < 0 || sx >= cols || py >= rows) continue
    const at = py * cols + sx
    if (dz > depth[at]) {
      depth[at] = dz
      const lz = -nx * sy + (ny * .6 + nz * .8) * cy
      light[at] = Math.max(.1, Math.min(1, .25 + Math.max(0, -.35 * nx - .4 * ny + .7 * lz) * .75))
    }
  }
  const chars = ' .:~+*#%@'
  const lines = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    const at = y * cols + x
    return depth[at] === -Infinity ? ' ' : chars[Math.min(chars.length - 1, Math.max(1, Math.floor(light[at] * chars.length)))]
  }).join(''))
  const palettes = ['bg-[#dce4e1]', 'bg-[#e5dfd2]', 'bg-[#d9e2e8]']
  return <svg aria-hidden viewBox="0 0 1050 658" className={`h-full w-full ${palettes[hash % palettes.length]}`}>
    <text fill="#3e606b" opacity=".72" fontFamily="monospace" fontSize="10" xmlSpace="preserve">{lines.map((line, i) => <tspan x="0" y={i * 7 + 7} textLength="1050" lengthAdjust="spacingAndGlyphs" key={i}>{line}</tspan>)}</text>
  </svg>
}
