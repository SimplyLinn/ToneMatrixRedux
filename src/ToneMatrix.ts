import * as Tone from 'tone';
import Grid from './Grid';
import { IGrid, IGridRenderer } from './Interfaces';
import { Listener } from './InternalTypes';
import { GridRendererEventMap } from './Types';
import GridCanvasRenderer from './GridCanvasRenderer';
import Util from './Util';

/** Main class of ToneMatrix Redux, a pentatonic step sequencer */
export default class ToneMatrix {
  /**
   * The main canvas element that ToneMatrix draws to
   */
  private c: HTMLCanvasElement;
  /**
   * The main canvas element's 2d drawing context
   */
  private ctx: CanvasRenderingContext2D;
  /**
   * The width of the grid, measured in grid tiles
   */
  private WIDTH: number;
  /**
   * The height of the grid, measured in grid tiles
   */
  private HEIGHT: number;
  public readonly grid: IGrid;
  public readonly renderer: IGridRenderer;
  private listeners: Listener<(HTMLElementEventMap & GridRendererEventMap)>[] = [];
  private destroyed = false;

  /**
   * Creates a new ToneMatrix Redux instance, and attach it to existing DOM elements
   * @param canvasWrapperEl - The wrapper element that ToneMatrix should inject its
   *    canvas into
   */
  constructor(canvasWrapperEl: HTMLElement, width = 16, height = 16) {
    this.c = document.createElement('canvas');
    canvasWrapperEl.appendChild(this.c);
    const rect = this.c.getBoundingClientRect();

    const ctx = this.c.getContext('2d');
    if (ctx == null) throw new Error('Could not create context');
    this.ctx = ctx;

    this.WIDTH = width;
    this.HEIGHT = height;

    // Get the size of the canvas in CSS pixels.
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    const dpr = devicePixelRatio || 1;
    this.c.height = rect.height * dpr;
    this.c.width = rect.height * (this.WIDTH / this.HEIGHT) * dpr;

    this.grid = new Grid(this.WIDTH, this.HEIGHT);
    this.renderer = new GridCanvasRenderer(this.c);

    // Listen for clicks on the canvas

    // Whether our cursor is currently turning on or turning off tiles
    let arming: boolean | null = null;

    const tileClick = (x: number, y: number) => {
      if (arming === null) arming = !this.grid.getTileValue(x, y);
      this.grid.setTileValue(x, y, arming);
      // Make sure audio context is running
      Tone.context.resume();
    };
    this.listen(this.renderer, 'tilemove', ({ x, y }) => {
      tileClick(x, y);
    });
    this.listen(this.renderer, 'tiledown', ({ x, y }) => {
      arming = null;
      tileClick(x, y);
    });

    Tone.Transport.loopEnd = '1m'; // loop at one measure
    Tone.Transport.loop = true;
    Tone.Transport.start();

    // If Chrome Autoplay Policy is blocking audio,
    // add a play button that encourages user interaction

    if ('ontouchstart' in window || window.location.toString().indexOf('?') >= 0) {
      this.listen(canvasWrapperEl, 'click', () => {
        Tone.context.resume().then(() => {
          document.body.classList.add('playing');
        });
      });
      Tone.context.resume().then(() => {
        document.body.classList.add('playing');
      });
    } else {
      document.body.classList.add('playing');
    }

    // Kick off game loop

    const updateContinuous = () => {
      if (this.destroyed) return;
      this.update();
      requestAnimationFrame(updateContinuous);
    };
    requestAnimationFrame(updateContinuous);
  }

  /**
   * Updates the state of the app, and draws it to the canvas.
   * Called in requestAnimationFrame.
   */
  update(): void {
    if (this.grid.update) this.grid.update();
    this.renderer.update(this.grid);
  }

  /**
   * Clears all notes from the grid and resets the sharing URL.
   */
  clear(): void {
    this.grid.clearAllTiles();
  }

  /**
   * Sets whether the ToneMatrix application is muted.
   * @param muted - True for muted, false for unmuted
   */
  setMuted(muted: boolean): void {
    this.grid.setMuted(muted);
  }

  /**
   * Saves the grid's current state into a savestate string
   * @returns The base64-encoded URL-encoded savestate string,
   *   ready for saving or outputting in a URL
   */
  toBase64(): string {
    let dataflag = false;
    const bytes = new Uint8Array(this.grid.data.length / 8);
    for (let i = 0; i < this.grid.data.length / 8; i += 1) {
      let str = '';
      for (let j = 0; j < 8; j += 1) {
        const tile = !this.grid.data[Util.coordToIndex(i, j, 8)].isEmpty();
        if (tile) {
          str += '1';
          dataflag = true;
        } else {
          str += '0';
        }
      }
      bytes[i] = parseInt(str, 2);
    }
    if (!dataflag) return '';

    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const base64enc = encodeURIComponent(base64);
    return base64enc;
  }

  /**
   * Loads a savestate from a string into the grid
   * @param base64enc - The base64-encoded URL-encoded savestate string
   */
  fromBase64(base64enc: string): void {
    try {
      const base64 = decodeURIComponent(base64enc);
      const binary = atob(base64);

      const bytes = new Uint8Array(this.grid.data.length / 8);
      let str = '';
      for (let i = 0; i < this.grid.data.length / 8; i += 1) {
        const byte = binary.charCodeAt(i);
        bytes[i] = byte;
        let bits = byte.toString(2);
        bits = bits.padStart(8, '0');
        str += bits;
      }

      for (let i = 0; i < str.length; i += 1) {
        const bool = str[i] === '1';
        this.grid.setTileValue(Math.floor(i / this.grid.width), i % this.grid.width, bool);
      }
    } catch (e) {
      // Invalid hash
    }
  }

  /**
   * Cleans up all resources used by this ToneMatrix
   */
  dispose(): void {
    this.destroyed = true;
    if (this.grid.dispose) this.grid.dispose();
    this.listeners.forEach((listener) => {
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
    // restore mute status
    Tone.Destination.mute = false;
    this.listeners = [];
  }

  /**
   * Add an event listener to an HTMLElement and save everything needed
   * for removing it later.
   */
  private listen<P extends ToneMatrix['listeners'][number]['event']>(
    target: ToneMatrix['listeners'][number]['target'],
    event: P,
    listener: Listener<ToneMatrix['listeners'][number] extends Listener<infer M> ? M : never, P>['cb'],
  ): this {
    this.listeners.push({
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
}
