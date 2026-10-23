export type Shape = 'ribbon' | 'signal'
export type Vertex = { x: number; y: number; z: number; nx: number; ny: number; nz: number }

export function ribbonGeometry(): Vertex[] {
  const vertices: Vertex[] = []
  const point = (u: number, v: number) => {
    const r = 1 + .42 * v * Math.cos(u / 2)
    return [r * Math.cos(u), r * Math.sin(u), .65 * v * Math.sin(u / 2)]
  }
  for (let i = 0; i < 240; i++) for (let j = 0; j < 40; j++) {
    const u = i / 240 * Math.PI * 2, v = j / 39 * 2 - 1, p = point(u, v), a = point(u + .01, v), b = point(u, v + .01)
    const du = a.map((n, k) => n - p[k]), dv = b.map((n, k) => n - p[k])
    const nx = du[1] * dv[2] - du[2] * dv[1], ny = du[2] * dv[0] - du[0] * dv[2], nz = du[0] * dv[1] - du[1] * dv[0], len = Math.hypot(nx, ny, nz)
    vertices.push({ x: p[0], y: p[1], z: p[2], nx: nx / len, ny: ny / len, nz: nz / len })
  }
  return vertices
}

export function signalGeometry(): Vertex[] {
  const vertices: Vertex[] = [], source = document.createElement('canvas'); source.width = source.height = 100
  const ctx = source.getContext('2d', { willReadFrequently: true })!
  ctx.font = 'bold 100px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('@', 50, 51)
  const mask = ctx.getImageData(0, 0, 100, 100).data
  const alpha = (x: number, y: number) => x < 0 || y < 0 || x >= 100 || y >= 100 ? 0 : mask[(y * 100 + x) * 4 + 3]
  for (let y = 1; y < 99; y += 1.5) for (let x = 1; x < 99; x += 1.5) {
    const xx = Math.floor(x), yy = Math.floor(y)
    if (alpha(xx, yy) < 100) continue
    const px = (x - 50) / 35, py = (y - 50) / 35
    vertices.push({ x: px, y: py, z: .15, nx: 0, ny: 0, nz: 1 }, { x: px, y: py, z: -.15, nx: 0, ny: 0, nz: -1 })
    const nx = alpha(xx - 2, yy) - alpha(xx + 2, yy), ny = alpha(xx, yy - 2) - alpha(xx, yy + 2), len = Math.hypot(nx, ny)
    if (len > 80) for (let z = -.15; z <= .15; z += .05) vertices.push({ x: px, y: py, z, nx: nx / len, ny: ny / len, nz: 0 })
  }
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 260; i++) for (let j = 0; j < 6; j++) {
    const u = i / 260 * Math.PI * 2, v = j / 6 * Math.PI * 2, radius = 1.5 + Math.cos(v) * .028
    const x = radius * Math.cos(u), y = radius * Math.sin(u), z = Math.sin(v) * .028, a = ring ? -.85 : .85
    vertices.push({ x, y: y * Math.cos(a) - z * Math.sin(a), z: y * Math.sin(a) + z * Math.cos(a), nx: Math.cos(u) * Math.cos(v), ny: Math.sin(u) * Math.cos(v), nz: Math.sin(v) })
  }
  return vertices
}
