import {Group, Quaternion, type Vector3} from "three";
import {CubeFace, type Cubie} from "../cube.ts";
import type {ITurn} from "./iturn.ts";
import {Game} from "../game.ts";
import {Config} from "../config.ts";
import {Vectors} from "../vector_math.ts";

export class WRotation implements ITurn {
  static U = new WRotation(Vectors.down())
  static D = new WRotation(Vectors.up())
  static F = new WRotation(Vectors.back())
  static B = new WRotation(Vectors.front())
  static R = new WRotation(Vectors.left())
  static L = new WRotation(Vectors.right())

  axis: Vector3
  annaCubies: Group
  kataCubies: Group
  angle: number = 0
  direction: number = 1

  constructor(axis: Vector3) {
    this.axis = axis
    this.annaCubies = new Group()
    this.kataCubies = new Group()
    this.annaCubies.position.x -= Config.config().w_center_x
    this.kataCubies.position.x += Config.config().w_center_x
  }

  begin(): void {
    Game.game().cube.cubies.forEach((c: Cubie) => {
      if(c.inLayer(CubeFace.A)) {
        this.annaCubies.attach(c.pivot)
      } else {
        this.kataCubies.attach(c.pivot)
      }
    })
    Game.game().scene.add(this.annaCubies)
    Game.game().scene.add(this.kataCubies)
  }

  done(): boolean {
    return Math.abs(this.angle) >= Math.PI/2;
  }

  end(): void {
    const cube = Game.game().cube

    this.angle = Math.round(this.angle / (Math.PI / 2)) * (Math.PI/2);
    this.annaCubies.setRotationFromAxisAngle(this.axis, this.angle)
    this.kataCubies.setRotationFromAxisAngle(this.axis, -this.angle)

    cube.cubies.forEach((c: Cubie) => {
      cube.root.attach(c.pivot)
    })
    this.annaCubies.clear()
    this.kataCubies.clear()
    this.annaCubies.setRotationFromQuaternion(new Quaternion())
    this.kataCubies.setRotationFromQuaternion(new Quaternion())
    Game.game().scene.remove(this.annaCubies)
    Game.game().scene.remove(this.kataCubies)

    cube.unification()

    this.angle = 0
    this.direction = 1
  }

  setDirection(direction: number): void {
    this.direction = direction
  }

  tick(dt: number): void {
    this.angle += dt * this.direction;
    this.annaCubies.setRotationFromAxisAngle(this.axis, this.angle)
    this.kataCubies.setRotationFromAxisAngle(this.axis, -this.angle)
  }
}