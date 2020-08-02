/**
 * Like Partial<T>, but recursive.
 */
export type RecursivePartial<T> = {
  [P in keyof T]?:
    | (T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends Record<string | number | symbol, unknown>
        ? RecursivePartial<T[P]>
        : T[P])
    | undefined;
};

export type Particle = {
  life: number;
  x: number;
  vx: number;
  y: number;
  vy: number;
};

export type GridRendererEventMap = {
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
