/** A particle system which contains particles that update themselves */

export type Particle = {
  life: number;
  x: number;
  vx: number;
  y: number;
  vy: number;
};

function buildParticleObject(): Particle {
  return {
    life: 0,
    x: 0,
    vx: 0,
    y: 0,
    vy: 0,
  };
}

export default class ParticleSystem {
  public readonly PARTICLE_POOL_SIZE = 2000;
  public readonly PARTICLE_LIFETIME = 40;
  private width: number;
  private height: number
  private oldestParticle = 0;
  private lastUpdate = 0;
  public readonly particles: readonly Readonly<Particle>[];

  /**
   * @param width - Height of the particle system, typically in pixels
   * @param height - Width of the particle system, typically in pixels
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.particles = Array.from({ length: this.PARTICLE_POOL_SIZE }, buildParticleObject);
  }

  /**
   * Updates all particle positions based on their current position,
   * velocity, and the amount of time that's passed.
   */
  update(): void {
    if (this.lastUpdate !== 0) {
      const now = Date.now();
      const deltaTime = (now - this.lastUpdate) / 16.67; // 60fps is a time factor of 1
      for (let i = 0; i < this.PARTICLE_POOL_SIZE; i += 1) {
        const p = this.particles[i] as Particle;
        if (p.life > 0) {
          const pvx = p.vx * deltaTime;
          const pvy = p.vy * deltaTime;
          p.x += pvx;
          if (p.x > this.width || p.x < 0) {
            // x overflow/underflow
            p.vx = -p.vx;
            p.x += pvx;
          }
          p.y += pvy;
          if (p.y > this.height || p.y < 0) {
            // y overflow/underflow
            p.vy = -p.vy;
            p.y += pvy;
          }
          p.life -= deltaTime;
        }
      }
      this.lastUpdate = now;
    } else {
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Creates a new particle
   * @param x - Particle's x position, in pixels
   * @param y - Particle's y position, in pixels
   * @param vx - Particle's x velocity, in pixels per 1/60th of a second
   * @param vy - Particle's y velocity, in pixels per 1/60th of a second
   */
  createParticle(x: number, y: number, vx: number, vy: number): void {
    const p = this.particles[this.oldestParticle] as Particle;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = this.PARTICLE_LIFETIME;
    this.oldestParticle += 1;
    if (this.oldestParticle >= this.PARTICLE_POOL_SIZE) this.oldestParticle = 0;
  }

  /**
   * Creates a burst of particles exploding out in a circle from a single point
   * @param x - The x coordinate of the emanation point
   * @param y - The y coordinate of the emanation point
   * @param v - The velocity of the particles, in pixels per 1/60th of a second
   * @param n - The number of particles to create
   */
  createParticleBurst(x: number, y: number, v: number, n: number): void {
    const randomOffset = Math.random() * 2 * Math.PI;
    for (let j = 0; j < 2 * Math.PI; j += (2 * Math.PI) / n) {
      const pvx = Math.cos(j + randomOffset) * v;
      const pvy = Math.sin(j + randomOffset) * v;
      this.createParticle(x, y, pvx, pvy);
    }
  }
}
