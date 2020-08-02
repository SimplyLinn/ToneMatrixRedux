/* eslint-disable import/prefer-default-export */

/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-types
export interface Listener<EventMap extends {}, P extends keyof EventMap | string = string> {
  readonly target: {
      readonly on: (
        event: P extends keyof EventMap ? P : string,
        listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
      ) => void;
      readonly off: (
        event: P extends keyof EventMap ? P : string,
        listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
      ) => void;
    } | {
      readonly addListener: (
        event: P extends keyof EventMap ? P : string,
        listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
      ) => void;
      readonly removeListener: (
        event: P extends keyof EventMap ? P : string,
        listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
      ) => void;
    }
    | { readonly addEventListener: (
      event: P extends keyof EventMap ? P : string,
      listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
    ) => void;
    readonly removeEventListener: (
      event: P extends keyof EventMap ? P : string,
      listener: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void,
    ) => void;
  };
  readonly event: keyof(HTMLElementEventMap & IGridRendererEventMap);
  readonly cb: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ITile {
  isEmpty(): boolean;

  getNote(i: number): number;

  hasNote(i: number): boolean;

  addNote(i: number, noteId: number): void;

  removeNote(i: number): void;

  removeAllNotes(): void;
}

export interface IGrid {
  readonly data: readonly ITile[];
  /**
   * The width of the grid in tiles
   */
  readonly width: number;
  /**
   * The height of the grid in tiles
   */
  readonly height: number;

  /**
   * Updates and draws the grid to the canvas
   * @param mouseX - The current x position of the mouse on the canvas element
   * @param mouseY - The current y position of the mouse on the canvas element
   */
  update?(): void;

  /**
   * Get the x position on the grid where the playhead currently is
   * @returns The x position
   */
  getPlayheadX(): number;

    /**
   * Gets whether a grid tile is currently lit up (armed)
   * @param x - The x position, measured in grid tiles
   * @param y - The y position, measured in grid tiles
   * @returns Whether the tile is lit up
   */
  getTileValue(x: number, y: number): boolean;

  /**
   * Sets whether a grid tile is currently lit up (armed)
   * @param x - The x position, measured in grid tiles
   * @param y - The y position, measured in grid tiles
   * @param bool - Whether the tile should be turned on (true) or off (false)
   */
  setTileValue(x: number, y: number, bool: boolean): void;

  /**
   * Turns off all tiles and removes all notes
   */
  clearAllTiles(): void;

  /**
   * Sets whether the ToneMatrix grid is muted.
   * @param muted - True for muted, false for unmuted
   */
  setMuted(muted: boolean): void;

  dispose?(): void
}

export type IGridRendererEventMap = {
  tiledown: {
    x: number, y: number,
  };
  tilemove: {
    x: number, y: number,
  };
  tileup: {
    x: number, y: number,
  } | false;
  tileclick: {
    x: number, y: number,
  };
};

export interface IGridRenderer {

  on<P extends keyof IGridRendererEventMap | string, C = unknown>(
    event: P, listener: Listener<IGridRendererEventMap, P>['cb'], context?: C
  ): this;

  off<P extends keyof IGridRendererEventMap | string, C = unknown>(
    event: P, listener: Listener<IGridRendererEventMap, P>['cb'], context?: C
  ): this;
  /**
   * Update, then draw the current state of the app to the canvas element.
   * @param grid - The grid to be rendered
   * @param mouseX - The x position of the mouse on the canvas
   * @param mouseY - The y position of the mouse on the canvas
   */
  update(grid: IGrid): void

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
  ): { x: number; y: number } | false;

  dispose?(): void
}
