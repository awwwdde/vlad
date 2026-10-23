/** A single angular clock. A particle journey preserves its entry pose. */
export class LogoRotation {
  angle: number
  capturedAngle: number | null = null
  private fragmented = false
  private speed: number

  constructor(initialAngle = -.28, speed = .18) {
    this.angle = initialAngle
    this.speed = speed
  }

  advance(seconds: number, fragmented: boolean) {
    if (fragmented) {
      if (!this.fragmented) this.capturedAngle = this.angle
      this.fragmented = true
      return this.capturedAngle ?? this.angle
    }
    if (this.fragmented) {
      // The first complete frame has exactly the same pose as its last particles.
      this.angle = this.capturedAngle ?? this.angle
      this.fragmented = false
    } else {
      this.angle += Math.max(0, seconds) * this.speed
    }
    return this.angle
  }
}
