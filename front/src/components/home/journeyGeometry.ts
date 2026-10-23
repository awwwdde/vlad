import { BRAND_MARK_PATH } from '@/lib/brandMark'

export type Voxel = { x: number; y: number; z: number; nx: number; ny: number; nz: number }
export const clamp = (n: number) => Math.max(0, Math.min(1, n))

export function makeVolume(): Voxel[] {
  const mask = document.createElement('canvas'); mask.width = 704; mask.height = 186
  const ctx = mask.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.scale(2, 2)
  const paths = BRAND_MARK_PATH.match(/M[^M]+/g) ?? []
  paths.forEach((path, i) => { ctx.fillStyle = `rgb(${(i + 1) * 64},0,0)`; ctx.fill(new Path2D(path)) })
  const pixels = ctx.getImageData(0, 0, 704, 186).data
  const index = (x: number, y: number) => (Math.floor(y * 2) * 704 + Math.floor(x * 2)) * 4
  const solid = (x: number, y: number) => x >= 0 && x < 352 && y >= 0 && y < 93 && pixels[index(x, y) + 3] >= 128 ? 1 : 0
  const volume: Voxel[] = []
  for (let y = 1.6; y < 93; y += 3.2) for (let x = 1.6; x < 352; x += 3.2) {
    if (!solid(x, y)) continue
    for (let z = -32; z <= 32; z += 4) {
      let nx = solid(x - 3, y) - solid(x + 3, y), ny = solid(x, y - 3) - solid(x, y + 3), nz = z === -32 ? -1 : z === 32 ? 1 : 0
      if (!nx && !ny && !nz) nz = z < 0 ? -1 : 1
      const length = Math.hypot(nx, ny, nz); nx /= length; ny /= length; nz /= length
      volume.push({ x: x - 176, y: y - 46.5, z, nx, ny, nz })
    }
  }
  return volume
}
