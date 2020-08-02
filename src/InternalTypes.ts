/**
 * Used internally to help keep track of event listeners
 * that need to be disposed
 * @internal
 */
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
  readonly event: keyof EventMap;
  readonly cb: P extends keyof EventMap ? ((ev: EventMap[P]) => void) : (...args: any[]) => void
}
/* eslint-enable @typescript-eslint/no-explicit-any */
