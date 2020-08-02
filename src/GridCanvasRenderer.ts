import { EventEmitter } from 'eventemitter3';
import SpriteSheet from './SpriteSheet';
import ParticleSystem from './ParticleSystem';
import Util from './Util';
import { IGridRenderer, IGrid } from './Interfaces';
import { GridRendererEventMap } from './Types';
import { Listener } from './InternalTypes';

/** Renders a Grid to a canvas element */
export default class GridCanvasRenderer extends EventEmitter implements IGridRenderer {
  private spriteSheet: SpriteSheet | null = null;
  private particleSystem: ParticleSystem;
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private internalListeners: Listener<HTMLElementEventMap>[] = [];
  private lastPlayheadX = -1;
  private mouseX = NaN;
  private mouseY = NaN;
  private dragging = false;
  private lastView: {
    gridWidth: number,
    gridHeight: number
    canvasWidth: number,
    canvasHeight: number,
  } | null = null;

  /**
   * @param gridWidth - The width of the grid, in tiles
   * @param gridHeight - The height of the grid, in tiles
   * @param canvas - The canvas DOM element to render to
   */
  constructor(canvas: HTMLCanvasElement) {
    super();
    this.particleSystem = new ParticleSystem(canvas.width, canvas.height);
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get canvas context');
    this.ctx = ctx;

    this.listen(this.canvas, 'mousemove', (e) => {
      this.updateCanvasMousePosition(e);
      if (this.dragging) this.emitTileEvent('tilemove');
    });
    this.listen(this.canvas, 'mouseleave', () => {
      this.resetCanvasMousePosition();
    });
    this.listen(this.canvas, 'mousedown', (e) => {
      this.updateCanvasMousePosition(e);
      // eslint-disable-next-line no-bitwise
      if (!(e.buttons & 1)) return; // Only if left button is held
      this.dragging = true;
      this.emitTileEvent('tiledown');
    });
    this.listen(document, 'mouseup', (e) => {
      this.updateCanvasMousePosition(e);
      // eslint-disable-next-line no-bitwise
      if (!this.dragging || e.buttons & 1) return; // Only if left button is released
      this.dragging = false;
      this.emitTileEvent('tileup');
    });
    this.listen(this.canvas, 'touchstart', (e) => {
      e.preventDefault(); // Prevent emulated click
      if (e.touches.length === 1) {
        this.updateCanvasMousePosition(e.touches[0]);
        this.emitTileEvent('tiledown');
      } else {
        Array.from(e.touches).forEach((touch) => {
          this.updateCanvasMousePosition(touch);
          this.emitTileEvent('tilemove');
        });
      }
    });
    this.listen(this.canvas, 'touchend', (e) => {
      e.preventDefault(); // Prevent emulated click
      this.resetCanvasMousePosition();
      this.emitTileEvent('tileup');
    });
    this.listen(this.canvas, 'touchmove', (e) => {
      e.preventDefault(); // Prevent emulated click
      Array.from(e.touches).forEach((touch) => {
        this.updateCanvasMousePosition(touch);
        this.emitTileEvent('tilemove');
      });
    });
  }

  private emitTileEvent(event: 'tiledown' | 'tileup' | 'tilemove' | 'tileclick'): void {
    if (!this.lastView) return;
    const tile = this.pixelCoordsToTileCoords(
      this.mouseX, this.mouseY, this.lastView.gridWidth, this.lastView.gridHeight,
    );
    if (tile) this.emit(event, { x: tile.x, y: tile.y });
    if (!tile && event === 'tileup') this.emit('tileup', false);
  }

  on(
    event: string | symbol,
    listener: Listener<GridRendererEventMap>['cb'],
  ): this;

  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  off(
    event: string | symbol,
    listener: Listener<GridRendererEventMap>['cb'],
  ): this;

  off(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.off(event, listener);
  }

  /**
   * Updates the this.mouseX and this.mouseY variables based on where the mouse is on the canvas
   * @param e - The touch or click event that contains the new "mouse" position
   */
  updateCanvasMousePosition(e: MouseEvent | Touch): void {
    const currentRect = this.canvas.getBoundingClientRect(); // abs. size of element
    const scaleX = this.canvas.width / currentRect.width; // relationship bitmap vs. element for X
    const scaleY = this.canvas.height / currentRect.height; // relationship bitmap vs. element for Y

    const x = (e.clientX - currentRect.left) * scaleX;
    const y = (e.clientY - currentRect.top) * scaleY;

    // Update internal position
    this.mouseX = x;
    this.mouseY = y;
  }

  /**
   * Resets the this.mouseX and this.mouseY variables.
   * Call this when the mouse leaves the canvas or the screen is not being touched.
   */
  resetCanvasMousePosition(): void {
    // Update internal position
    this.mouseX = NaN;
    this.mouseY = NaN;
  }

  /**
   * Update, then draw the current state of the app to the canvas element.
   * @param grid - The grid to be rendered
   * @param mouseX - The x position of the mouse on the canvas
   * @param mouseY - The y position of the mouse on the canvas
   */
  update(grid: IGrid): void {
    this.particleSystem.update();
    this.draw(grid, this.mouseX, this.mouseY);
  }

  private getSpriteSheet(grid: IGrid) {
    if (
      !this.spriteSheet
      || !this.lastView
      || this.lastView.gridWidth !== grid.width
      || this.lastView.gridHeight !== grid.height
      || this.lastView.canvasHeight !== this.canvas.width
      || this.lastView.canvasWidth !== this.canvas.height) {
      this.spriteSheet = new SpriteSheet(
        grid.width, grid.height, this.canvas.width, this.canvas.height,
      );
      const lastView = this.lastView || {} as NonNullable<GridCanvasRenderer['lastView']>;
      lastView.gridWidth = grid.width;
      lastView.gridHeight = grid.height;
      lastView.canvasWidth = this.canvas.width;
      lastView.canvasHeight = this.canvas.height;
      this.lastView = lastView;
    }
    return this.spriteSheet;
  }

  /**
   * Draw the current state of the app to the canvas element.
   * @private
   * @param grid - The grid to be rendered
   * @param mouseX - The x position of the mouse on the canvas
   * @param mouseY - The y position of the mouse on the canvas
   */
  private draw(grid: IGrid, mouseX: number, mouseY: number): void {
    const playheadX = grid.getPlayheadX();
    const dpr = Util.getDevicePixelRatio();

    // Defaults
    this.ctx.globalAlpha = 1;
    this.ctx.filter = 'none';

    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'black';
    this.ctx.fill();

    // Get particle heatmap

    const heatmap = this.getParticleHeatMap(grid);
    const spriteSheet = this.getSpriteSheet(grid);

    const mousedOverTile = this.pixelCoordsToTileCoords(mouseX, mouseY,
      grid.width, grid.height);

    // Draw each tile
    for (let i = 0; i < grid.data.length; i += 1) {
      const dx = this.canvas.width / grid.width;
      const dy = this.canvas.height / grid.height;
      const { x: gridx, y: gridy } = Util.indexToCoord(i, grid.height);
      const x = dx * gridx;
      const y = dy * gridy;

      const on = !grid.data[i].isEmpty();

      if (grid.data[i].hasNote(1)) {
        this.ctx.filter = 'brightness(50%) sepia(100) saturate(100) hue-rotate(25deg)';
      } else {
        this.ctx.filter = 'none';
      }
      if (on) {
        if (gridx === playheadX) {
          this.ctx.globalAlpha = 1;
          spriteSheet.drawSprite(2, this.ctx, x, y);
          if (playheadX !== this.lastPlayheadX) {
            // Create particles
            this.particleSystem.createParticleBurst(
              dx * (gridx + 0.5),
              dy * (gridy + 0.5),
              8 * dpr,
              20,
            );
          }
        } else {
          this.ctx.globalAlpha = 0.85;
          spriteSheet.drawSprite(1, this.ctx, x, y);
        }
      } else {
        if (mousedOverTile && gridx === mousedOverTile.x && gridy === mousedOverTile.y) {
          // Highlight moused over tile
          this.ctx.globalAlpha = 0.3;
        } else {
          const BRIGHTNESS = 0.05; // max particle brightness between 0 and 1
          this.ctx.globalAlpha = ((heatmap[i] * BRIGHTNESS * (204 / 255))
              / this.particleSystem.PARTICLE_LIFETIME) + 51 / 255;
        }
        spriteSheet.drawSprite(0, this.ctx, x, y);
      }
    }

    // Draw particles

    if (Util.DEBUG) {
      const ps = this.particleSystem;
      for (let i = 0; i < ps.PARTICLE_POOL_SIZE; i += 1) {
        const p = ps.particles[i];
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(p.x, p.y, 2, 2);
      }
    }

    this.lastPlayheadX = playheadX;
  }

  /**
   * Gets the "heat" of every tile by calculating how many particles are on top of the tile
   * @returns An array of numbers from 0 to 1, representing the "heat" of each tile
   */
  private getParticleHeatMap(grid: IGrid): readonly number[] {
    const heatmap = Array(grid.width * grid.height).fill(0);
    const ps = this.particleSystem;
    for (let i = 0; i < ps.PARTICLE_POOL_SIZE; i += 1) {
      const p = ps.particles[i];
      if (p.life > 0) {
        const tile = this.pixelCoordsToTileCoords(p.x, p.y, grid.width, grid.height);
        if (tile) heatmap[Util.coordToIndex(tile.x, tile.y, grid.height)] += p.life;
      }
    }
    return heatmap;
  }

  /**
   * Converts coordinates in "pixel space" to coordinates in "tile space".
   * In essence, if you pass in an (x, y) position on the canvas,
   * this returns the corresponding (x, y) position on the grid.
   * @param x - The x position, in pixels, to get the corresponding grid position for
   * @param y - The y position, in pixels, to get the corresponding grid position for
   * @param gridWidth - The width of the grid, in grid tiles
   * @param gridHeight - The height of the grid, in grid tiles
   * @param canvasWidth - The width of the pixel space,
   *  typically the width of the canvas
   * @param canvasHeight - The height of the pixel space,
   *  typically the height of the canvas
   */
  pixelCoordsToTileCoords(
    x: number,
    y: number,
    gridWidth: number,
    gridHeight: number,
  ): { x: number; y: number } | false {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const dx = canvasWidth / gridWidth;
    const dy = canvasHeight / gridHeight;
    const xCoord = Math.floor(x / dx);
    const yCoord = Math.floor(y / dy);
    if (
      xCoord >= gridWidth
            || yCoord >= gridWidth
            || xCoord < 0
            || yCoord < 0
    ) {
      return false;
    }
    return { x: xCoord, y: yCoord };
  }

  /**
   * Add an event listener to an HTMLElement and save everything needed
   * for removing it later.
   */
  private listen<P extends GridCanvasRenderer['internalListeners'][number]['event']>(
    target: GridCanvasRenderer['internalListeners'][number]['target'],
    event: P,
    listener: Listener<GridCanvasRenderer['internalListeners'][number] extends Listener<infer M> ? M : never, P>['cb'],
  ): this {
    this.internalListeners.push({
      target,
      event,
      cb: listener,
    });
    if ('on' in target) {
      target.on(event, listener);
    } else if ('addEventListener' in target) {
      target.addEventListener(event, listener);
    } else {
      target.addListener(event, listener);
    }
    return this;
  }

  dispose(): void {
    this.removeAllListeners();
    this.internalListeners.forEach((listener) => {
      if ('off' in listener.target) {
        listener.target.off(
          listener.event,
          listener.cb as () => void,
        );
      } else if ('removeEventListener' in listener.target) {
        listener.target.removeEventListener(
          listener.event,
          listener.cb as () => void,
        );
      } else {
        listener.target.removeListener(
          listener.event,
          listener.cb as () => void,
        );
      }
    });
  }
}
