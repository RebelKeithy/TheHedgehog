import type {CubieSelector, ITurn} from "./iturn.ts";
import {Group, Quaternion, Vector3} from "three";
import {Game} from "../game.ts";

export class Turn implements ITurn {
  filter: CubieSelector
  angle: number
  stepRadians: number
  axis: Vector3
  public root: Group
  targets: any[]

  direction: number = 1

  public constructor(axis: Vector3, origin: Vector3, stepSize: number, filter: CubieSelector) {
    this.filter = filter
    this.angle = 0
    this.stepRadians = Math.PI/2 * stepSize
    this.axis = axis
    this.root = new Group()
    this.root.position.copy(origin)
    this.targets = []
  }

  setDirection(direction: number) {
    this.direction = direction
  }

  begin() {
    this.angle = 0
    const rp = this.root.position.clone()
    this.root = new Group()
    this.root.position.copy(rp)
    this.root.setRotationFromAxisAngle(this.axis, this.angle)
    Game.game().cube.cubies.forEach(c => {
      if (this.filter(c)) {
        this.root.attach(c.pivot)
        this.targets.push(c)
      }
    })
    Game.game().scene.add(this.root)
  }

  tick(da: number) {
    this.angle += da * this.direction;
    this.root.setRotationFromAxisAngle(this.axis, this.angle)
  }

  end() {
    this.angle = Math.round(this.angle / (Math.PI / 2)) * (Math.PI/2);
    this.root.setRotationFromAxisAngle(this.axis, this.angle)

    const cube = Game.game().cube
    this.targets.forEach((c) => {
      cube.root.attach(c.pivot)
    })
    this.root.clear()
    cube.cubies.forEach((c) => {
      c.stickers.forEach((s) => {
        s.unification()
      })
    })
    cube.cubies.forEach((c) => {
      c.stickers.forEach((s) => {
        s.cubie.pivot.setRotationFromQuaternion(new Quaternion())
      })
    })
    this.targets = []
  }

  done() {
    return Math.abs(this.angle) >= this.stepRadians
  }
}
