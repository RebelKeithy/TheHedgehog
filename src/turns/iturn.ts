import {CubeFace, Cubie} from "../cube.ts";

export type CubieSelector = (c: Cubie) => boolean

export interface ITurn {
  begin: () => void;
  end: () => void;
  done: () => boolean;
  setDirection: (direction: number) => void;
  tick: (dt: number) => void;
}

export class SliceSelectors {
  static U: CubieSelector = (c) => c.inLayer(CubeFace.U)
  static D: CubieSelector = (c) => c.inLayer(CubeFace.D)
  static F: CubieSelector = (c) => c.inLayer(CubeFace.F)
  static B: CubieSelector = (c) => c.inLayer(CubeFace.B)
  static K: CubieSelector = (c) => c.inLayer(CubeFace.K)
  static A: CubieSelector = (c) => c.inLayer(CubeFace.A)
  static O: CubieSelector = (c) => c.inLayer(CubeFace.L)
  static I: CubieSelector = (c) => c.inLayer(CubeFace.R)
}