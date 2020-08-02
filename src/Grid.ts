import * as Tone from 'tone';
import Util from './Util';
import SynthInstrument from './SynthInstrument';
import Tile from './Tile';
import { IGrid, ITile } from './Interfaces';

/** A 2-D matrix that keeps track of notes and can enable, disable, and play them */
export default class Grid implements IGrid {
  public readonly data: readonly ITile[];
  /**
   * The width of the grid in tiles
   */
  public readonly width: number;
  /**
   * The height of the grid in tiles
   */
  public readonly height: number;
  public readonly currentInstrument = 0;
  private instruments: SynthInstrument[] = [];

  /**
   * Creates a new Grid
   * @param width - The width of the grid in tiles
   * @param height  - The height of the grid in tiles
   * @param renderer - The renderer to use to render the grid
   */
  constructor(width: number, height: number) {
    this.data = Array.from({ length: width * height }, () => new Tile());
    this.width = width;
    this.height = height;
    this.currentInstrument = 0;
    this.instruments.push(new SynthInstrument(width, height, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
    },
    {
      frequency: 1100,
      rolloff: -12,
    }));
    this.instruments.push(new SynthInstrument(width, height, {
      oscillator: {
        type: 'sawtooth',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 2,
      },
    },
    {
      frequency: 1100,
      rolloff: -12,
    }));
  }

  getPlayheadX(): number {
    return this.instruments[this.currentInstrument].getPlayheadX();
  }

  /**
   * Gets whether a grid tile is currently lit up (armed)
   * @param x - The x position, measured in grid tiles
   * @param y - The y position, measured in grid tiles
   * @returns Whether the tile is lit up
   */
  getTileValue(x: number, y: number): boolean {
    return this.data[Util.coordToIndex(x, y, this.height)].hasNote(this.currentInstrument);
  }

  /**
   * Sets whether a grid tile is currently lit up (armed)
   * @param x - The x position, measured in grid tiles
   * @param y - The y position, measured in grid tiles
   * @param bool - Whether the tile should be turned on (true) or off (false)
   */
  setTileValue(x: number, y: number, bool: boolean): void {
    if (bool) {
      if (this.getTileValue(x, y)) return;
      // Turning on, schedule note

      this.data[Util.coordToIndex(x, y, this.height)].addNote(this.currentInstrument,
        this.instruments[this.currentInstrument]
          .scheduleNote(x, y));
    } else {
      if (!this.getTileValue(x, y)) return;
      // Turning off, unschedule note
      this.instruments[this.currentInstrument]
        .unscheduleNote(this.data[Util.coordToIndex(x, y, this.height)]
          .getNote(this.currentInstrument));
      this.data[Util.coordToIndex(x, y, this.height)].removeNote(this.currentInstrument);
    }
  }

  /**
   * Toggles whether a grid tile is currently lit up (armed)
   * @param x - The x position, measured in grid tiles
   * @param y - The y position, measured in grid tiles
   */
  toggleTileValue(x: number, y: number): void {
    this.setTileValue(x, y, !this.getTileValue(x, y));
  }

  /**
   * Turns off all tiles and removes all notes
   */
  clearAllTiles(): void {
    this.data.forEach((e) => e.removeAllNotes());
    this.instruments.forEach((inst) => inst.clearNotes());
    Tone.Transport.cancel();
  }

  setCurrentInstrument(instrumentId: number): void {
    if (instrumentId >= this.instruments.length) {
      // eslint-disable-next-line no-console
      console.warn('tried to switch to nonexistent instrument');
    } else {
      (this.currentInstrument as number) = instrumentId;
    }
  }

  /**
   * Sets whether the ToneMatrix grid is muted.
   * @param muted - True for muted, false for unmuted
   */
  // eslint-disable-next-line class-methods-use-this
  setMuted(muted: boolean): void {
    Tone.Destination.mute = muted;
  }

  /**
   * Dispose of all resources used by this grid object.
   */
  dispose(): void {
    Tone.Transport.cancel();
    this.instruments.forEach((inst) => inst.dispose());
    (this.data as Tile[]).length = 0;
    this.instruments.length = 0;
  }
}
