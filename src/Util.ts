/** A static class that provides pure functions */

export default class Util {
  static DEBUG = false;

  /**
   * Converts 2-D coordinates to their corresponding index in a 1-D array representation
   * @param x - The x coordinate
   * @param y - The y coordinate
   * @param gridHeight - The width of the 2-D representation (the grid height)
   * @returns The corresponding index
   */
  static coordToIndex(x: number, y: number, gridHeight: number): number {
    return x * gridHeight + y;
  }

  /**
   * Converts a 1-D array index into an (x, y) coordinate in its corresponding 2-D representation
   * @param index - the 1D array index
   * @param gridHeight - The width of the 2-D representation (the grid height)
   * @returns - The corresponding x and y coordinates
   */
  static indexToCoord(index: number, gridHeight: number): { x: number; y: number } {
    return { x: Math.floor(index / gridHeight), y: index % gridHeight };
  }

  /**
   * Draws a rounded rectangle
   * Adapted from https://stackoverflow.com/a/3368118/2234742
   * @param ctx - The canvas context to draw on
   * @param x - The x coordinate at which to draw the rounded rectangle
   * @param y - The y coordinate at which to draw the rounded rectangle
   * @param width - The width of the rounded rectangle to draw
   * @param height  - The height of the rounded rectangle to draw
   * @param radius - The border radius of the rounded rectangle
   * @param fill - Whether the rectangle should be filled
   * @param stroke - Whether the rectangle should be stroked
   */
  static drawRoundedRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 5,
    fill = false,
    stroke = true,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  private static devicePixelRatio = (function initPixelRatio() {
    const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
    const updatePixelRatio = () => {
      Util.devicePixelRatio = window.devicePixelRatio || 1;
    };
    window
      .matchMedia(mqString)
      .addEventListener('change', updatePixelRatio);
    return window.devicePixelRatio || 1;
  }());

  /**
   * Gets the current devicePixelRatio in a performant way
   * @returns The device pixel ratio
   */
  static getDevicePixelRatio(): number {
    return Util.devicePixelRatio;
  }
}
