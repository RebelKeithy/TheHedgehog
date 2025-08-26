import {CubeFace, Cubie, Sticker} from "../cube.ts";
import {Quaternion, Vector3} from "three";
import {Config} from "../config.ts";
import {Vectors} from "../vector_math.ts";
import type {ITurn} from "./iturn.ts";
import {Game} from "../game.ts";

class StickerInterpolator {
  sticker: Sticker
  startingRotation: Quaternion
  endingRotation?: Quaternion
  finalOffset?: Vector3
  finalPosition: Vector3

  constructor(sticker: Sticker, direction: number = 1) {
    const config = Config.config()
    this.sticker = sticker
    this.startingRotation = new Quaternion().setFromEuler(sticker.cube.rotation)
    const face = sticker.getFace()
    const anna = sticker.cubie.inLayer(CubeFace.A)
    const outer = sticker.cubie.inLayer(CubeFace.L)
    const up = sticker.cubie.inLayer(CubeFace.U)
    const front = sticker.cubie.inLayer(CubeFace.F)
    this.finalPosition = sticker.position.clone().setX(-sticker.position.x)


    if (anna && outer || !anna && !outer) {
      if (face == CubeFace.A || face == CubeFace.K) {
        this.finalOffset = Vectors.right()
      }
      if (face == CubeFace.L || face == CubeFace.R) {
        this.finalOffset = Vectors.zero()
      }
    } else {
      if (face == CubeFace.A || face == CubeFace.K) {
        this.finalOffset = Vectors.left()
      }
      if (face == CubeFace.L || face == CubeFace.R) {
        this.finalOffset = Vectors.zero()
      }
    }

    if (!this.finalOffset) {
      this.finalOffset = sticker.offset.clone()
    }

    if (anna && outer || !anna && !outer) {
      console.log("UPDATING STICKER " + face)
      if (face == CubeFace.A || face == CubeFace.K) {
        const axis = new Vector3(1, 0, 0).cross(this.sticker.cubie.pivot.position).normalize()
        this.endingRotation = new Quaternion().setFromAxisAngle(axis, config._h_angle_rad)
      }
      if (face == CubeFace.L || face == CubeFace.R) {
        this.endingRotation = new Quaternion()
      }
      if (face == CubeFace.U || face == CubeFace.D) {
        const axis = Vectors.up().cross(this.sticker.cube.children[0].position).cross(Vectors.up()).normalize()
        const swap = front && up || !front && !up
        this.endingRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, up ? 1 : -1), Math.PI/2).premultiply(new Quaternion().setFromAxisAngle(axis, config._h_angle_rad * (swap ? -1 : 1)))
      }
      if (face == CubeFace.F || face == CubeFace.B) {
        const axis = Vectors.back().cross(this.sticker.cube.children[0].position).cross(Vectors.back()).normalize()
        const swap = front && up || !front && !up
        this.endingRotation = new Quaternion().setFromAxisAngle(new Vector3(0, front ? 1 : -1, 0), Math.PI/2).premultiply(new Quaternion().setFromAxisAngle(axis, config._h_angle_rad * (swap ? 1 : -1)))
      }

    } else {
      if (face == CubeFace.A || face == CubeFace.K) {
        const axis = new Vector3(1, 0, 0).cross(this.sticker.cubie.pivot.position).normalize()
        this.endingRotation = new Quaternion().setFromAxisAngle(axis, -config._h_angle_rad)
      }
      if (face == CubeFace.L || face == CubeFace.R) {
        this.endingRotation = new Quaternion()
      }
      if (face == CubeFace.U || face == CubeFace.D) {
        const axis = Vectors.up().cross(this.sticker.cube.children[0].position).cross(Vectors.up()).normalize()
        const swap = front && up || !front && !up
        this.endingRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, up ? -1 : 1), Math.PI/2).premultiply(new Quaternion().setFromAxisAngle(axis, -config._h_angle_rad * (swap ? -1 : 1)))
      }
      if (face == CubeFace.F || face == CubeFace.B) {
        const axis = Vectors.back().cross(this.sticker.cube.children[0].position).cross(Vectors.back()).normalize()
        const swap = front && up || !front && !up
        this.endingRotation = new Quaternion().setFromAxisAngle(new Vector3(0, front ? -1 : 1, 0), Math.PI/2).premultiply(new Quaternion().setFromAxisAngle(axis, -config._h_angle_rad * (swap ? 1 : -1)))
      }
    }
  }

  public tick(dt: number) {
    if (this.endingRotation) {
      this.sticker.cube.setRotationFromQuaternion(new Quaternion().slerpQuaternions(this.startingRotation, this.endingRotation, dt))
    }
  }

  public stop() {
    this.sticker.update(this.finalPosition, this.finalOffset!)
    Game.game().cube.unification()
  }
}


class GyroComponent {
  cubie: Cubie
  startingPosition: Vector3
  endPosition: Vector3
  currentPosition: Vector3 = Vectors.zero()

  stickerInterpolators: StickerInterpolator[] = []

  constructor(cubie: Cubie, direction: number = 1) {
    const config = Config.config()
    const x0 = -config.w_center_x - config.cubie_gap/2 - config.cube_size
    const x1 = -config.w_center_x + config.cubie_gap/2 + config.cube_size
    const x2 = config.w_center_x - config.cubie_gap/2 - config.cube_size
    const x3 = config.w_center_x + config.cubie_gap/2 + config.cube_size

    this.cubie = cubie
    this.startingPosition = cubie.pivot.position.clone()

    if (direction > 0) {
      // Forward direction (original behavior)
      if (cubie.inLayer(CubeFace.A)) {
        if (cubie.inLayer(CubeFace.L)) {
          this.endPosition = this.startingPosition.clone().setX(x3)
        } else {
          this.endPosition = this.startingPosition.clone().setX(x0)
        }
      } else {
        if (cubie.inLayer(CubeFace.R)) {
          this.endPosition = this.startingPosition.clone().setX(x1)
        } else {
          this.endPosition = this.startingPosition.clone().setX(x2)
        }
      }
    } else {
      // Reverse direction
      if (cubie.inLayer(CubeFace.A)) {
        if (cubie.inLayer(CubeFace.L)) {
          this.endPosition = this.startingPosition.clone().setX(x1)
        } else {
          this.endPosition = this.startingPosition.clone().setX(x2)
        }
      } else {
        if (cubie.inLayer(CubeFace.R)) {
          this.endPosition = this.startingPosition.clone().setX(x3)
        } else {
          this.endPosition = this.startingPosition.clone().setX(x0)
        }
      }
    }
    cubie.stickers.forEach((s) => this.stickerInterpolators.push(new StickerInterpolator(s, direction)))
  }

  public update(t: number) {
    this.currentPosition.lerpVectors(this.startingPosition.clone(), this.endPosition.clone(), t)
    this.cubie.pivot.position.copy(this.currentPosition)
    this.stickerInterpolators.forEach((s) => s.tick(t))
  }

  public stop() {
    this.stickerInterpolators.forEach((s) => s.stop())
  }
}

export class Gyro implements ITurn {
  components: GyroComponent[]
  ticks: number = 0
  maxTicks: number = 2
  direction: number = 1
  axis?: Vector3

  constructor() {
    this.components = []
    this.axis = undefined
  }

  public tick(dt: number) {
    console.log(this.ticks/this.maxTicks)
    this.ticks += dt
    this.components.forEach((c) => c.update(Math.min(1, this.ticks/this.maxTicks)))
  }

  setDirection(direction: number) {
    this.direction = direction
  }

  public done() {
    return this.ticks >= this.maxTicks
  }

  public begin() {
    Game.game().cube.cubies.forEach((c) => {
      this.components.push(new GyroComponent(c, this.direction))
    })
  }

  public end() {
    this.components.forEach((c) => c.stop())
  }
}