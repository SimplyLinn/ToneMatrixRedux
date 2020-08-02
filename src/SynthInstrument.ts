import * as Tone from 'tone';
import Util, { RecursivePartial } from './Util';

/** Allows the audio playback of notes */
export default class SynthInstrument {
  private gridWidth: number;
  private gridHeight: number;
  private numVoices: number;
  private scale: string[];
  private noteOffset: number;
  private polyphony: number[];
  private players: Tone.Player[];
  private currentPlayer = 0;
  private notes: Map<number, { x: number; y: number }>;

  private destroyed = false;

  /**
   * Creates a synth instrument
   * @param {number} gridWidth - The width of the grid, in tiles
   * @param {number} gridHeight - The height of the grid, in tiles
   */
  constructor(
    gridWidth: number,
    gridHeight: number,
    options?: RecursivePartial<Tone.SynthOptions>,
    filterOptions?: Partial<Tone.FilterOptions>,
  ) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    // Construct scale array

    const pentatonic = ['B#', 'D', 'F', 'G', 'A'];
    const octave = 3; // base octave
    const octaveoffset = 4;
    const scale = Array.from(
      { length: gridHeight },
      (_, i) => pentatonic[i % pentatonic.length]
        + (octave + Math.floor((i + octaveoffset) / pentatonic.length)),
    );
    this.scale = scale.reverse(); // higher notes at lower y values, near the top

    // Pre-render synth

    this.numVoices = 3; // Number of voices (players) *per note*
    this.noteOffset = (Tone.Time('1m').toSeconds() / gridWidth) * 6; // Total note duration, including release. Used to offset the sound sprites

    this.players = [];

    // Init polyphony tracker. More notes playing at the same time
    // means that each note needs to play quieter

    this.polyphony = Array<number>(gridWidth).fill(0);
    this.notes = new Map(); // Sparse array

    // Keep track of resources used to prebuild the tones.
    const toDispose: { readonly dispose: () => void }[] = [];
    Tone.Offline(() => {
      const filter = new Tone.Filter(filterOptions).toDestination();
      const synth = new Tone.Synth(options).connect(filter);
      toDispose.push(filter, synth);
      this.scale.forEach((el, idx) => {
        synth.triggerAttackRelease(el, Tone.Time('1m').toSeconds() / this.gridWidth, idx * this.noteOffset);
      });
    }, this.noteOffset * this.scale.length).then((buffer) => {
      toDispose.forEach((d) => d.dispose()); // clean up resources only needed for building
      for (let i = 0; i < this.scale.length * this.numVoices; i += 1) {
        Tone.setContext(Tone.context); // Hopefully there's no weird asynchronicity issue here
        const player = new Tone.Player(buffer);
        Tone.connect(player, Tone.Destination);
        this.players.push(player);
      }
    });
  }

  /**
   * Schedules a note at an (x, y) grid coordinate
   * to automatically play at the appropriate time and pitch
   * @param gridX - The x position of the note, in grid tiles
   * @param gridY  - The y position of the note, in grid tiles
   * @returns The id of the note that's been scheduled, for use with unscheduleNote()
   */
  scheduleNote(gridX: number, gridY: number): number {
    if (this.destroyed) {
      throw new Error('Cannot schedule note on destroyed Instrument');
    }
    // Cycle through the voices
    const noteDuration = Tone.Time('1m').toSeconds() / this.gridWidth;
    const playEvent = Tone.Transport.schedule((time) => {
      const highVolume = -10; // When one note is playing
      const lowVolume = -20; // When all notes are playing (lower volume to prevent peaking)

      const volume = ((this.gridHeight - this.polyphony[gridX]) / this.gridHeight)
        * (highVolume - lowVolume) + lowVolume;
      try {
        this.players[this.currentPlayer].volume.setValueAtTime(volume, time);
        this.players[this.currentPlayer].start(
          time, gridY * this.noteOffset, this.noteOffset,
        );
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
      } catch (e) {
        // eslint-disable-next-line no-console
        if (Util.DEBUG) console.warn('Note play failure:', e);
      }
    }, gridX * noteDuration);
    this.notes.set(playEvent, { x: gridX, y: gridY });
    this.polyphony[gridX] += 1;
    return playEvent;
  }

  /**
   * Unschedules a note so that it will no longer play
   * @param id - The id of the note to unschedule
   */
  unscheduleNote(id: number): void {
    if (this.notes.has(id)) {
      const { x } = this.notes.get(id) as { x: number; y: number };
      this.notes.delete(id);
      this.polyphony[x] -= 1;
      Tone.Transport.clear(id);
    }
  }

  /**
   * Clear all notes from polyphony and stuff.
   */
  clearNotes(): void {
    this.notes.clear();
    this.polyphony.fill(0);
  }

  /**
   * Get the x position on the grid where the playhead currently is
   * @returns The x position
   */
  getPlayheadX(): number {
    const loopEnd = typeof Tone.Transport.loopEnd === 'number'
      ? Tone.Transport.loopEnd
      : Tone.Time(Tone.Transport.loopEnd).toSeconds();
    const loopStart = typeof Tone.Transport.loopStart === 'number'
      ? Tone.Transport.loopStart
      : Tone.Time(Tone.Transport.loopStart).toSeconds();
    const adjustedSeconds: number = Tone.Transport.seconds % (loopEnd - loopStart);
    const adjustedProgress = adjustedSeconds / (loopEnd - loopStart);
    return Math.floor(adjustedProgress * this.gridWidth);
  }

  dispose(): void {
    this.players.forEach((player) => player.dispose);
    this.players.length = 0;
    this.clearNotes();
    this.destroyed = true;
  }
}
