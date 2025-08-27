import {Group, Quaternion, type Vector3} from "three";
import type {Cubie} from "../cube.ts";
import type {ITurn} from "./iturn.ts";
import {Game} from "../game.ts";
import {Vectors} from "../vector_math.ts";

export class Rotation implements ITurn {
  static U = () => new Rotation(Vectors.down(), Math.PI)
  static D = () => new Rotation(Vectors.up(), Math.PI)
  static F = () => new Rotation(Vectors.back(), Math.PI)
  static B = () => new Rotation(Vectors.front(), Math.PI)
  static R = () => new Rotation(Vectors.left())
  static L = () => new Rotation(Vectors.right())

  axis: Vector3
  root: Group
  angle: number = 0
  direction: number = 1
  maxAngle: number = Math.PI/2

  constructor(axis: Vector3, maxAngle: number = Math.PI/2) {
    this.axis = axis
    this.root = new Group()
    this.maxAngle = maxAngle
  }

  begin(): void {
    Game.game().cube.cubies.forEach((c: Cubie) => {
      this.root.attach(c.pivot)
    })
    Game.game().scene.add(this.root)
  }

  done(): boolean {
    return Math.abs(this.angle) >= this.maxAngle;
  }

  end(): void {
    const cube = Game.game().cube

    this.angle = Math.round(this.angle / (this.maxAngle)) * (this.maxAngle);
    this.root.setRotationFromAxisAngle(this.axis, this.angle)

    cube.cubies.forEach((c: Cubie) => {
      cube.root.attach(c.pivot)
    })
    this.root.clear()
    this.root.setRotationFromQuaternion(new Quaternion())
    Game.game().scene.remove(this.root)
    cube.unification()

    this.angle = 0
    this.direction = 1
  }

  setDirection(direction: number): void {
    this.direction = direction
  }

  tick(dt: number): void {
    this.angle += dt * this.direction;
    this.root.setRotationFromAxisAngle(this.axis, this.angle)
  }
}