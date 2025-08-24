import {Group, Quaternion, Vector2, Vector3} from "three";
import {CubeFace, Cubie, Sticker} from "./cube.ts";
import {Vectors} from "./vector_math.ts";
import {Game} from "./game.ts";
import {Config} from "./config.ts";


export class Turn {
    filter
    angle: number
    stepAngle: number
    axis: Vector3
    public root: Group
    targets: any[]

    public constructor(axis, origin, stepSize, filter) {
        this.filter = filter
        this.angle = 0
        this.stepAngle = Math.PI/2 * stepSize
        this.axis = axis
        this.root = new Group()
        this.root.position.copy(origin)
        this.targets = []
    }

    start() {
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

    update(da) {
        this.angle += da;
        this.root.setRotationFromAxisAngle(this.axis, this.angle)
    }

    stop() {
        this.angle = Math.round(this.angle / (Math.PI / 2)) * (Math.PI/2)
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
}


class StickerInterpolator {
    sticker: Sticker
    startingRotation: Quaternion
    endingRotation: Quaternion
    finalOffset: Vector3
    finalPosition: Vector3

    constructor(sticker: Sticker) {
        const config = Config.config()
        this.sticker = sticker
        this.startingRotation = new Quaternion().setFromEuler(sticker.cube.rotation)
        const face = sticker.getFace()
        const anna = sticker.cubie.inLayer(CubeFace.A)
        const outer = sticker.cubie.inLayer(CubeFace.L)
        const up = sticker.cubie.inLayer(CubeFace.U)
        const front = sticker.cubie.inLayer(CubeFace.F)
        this.finalPosition = sticker.position.clone()

        if (this.finalPosition.x == 1)
            this.finalPosition.setX(-1)
        else if (this.finalPosition.x == -1)
            this.finalPosition.setX(1)


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

    public tick(t) {
        if (this.endingRotation) {
            this.sticker.cube.setRotationFromQuaternion(new Quaternion().slerpQuaternions(this.startingRotation, this.endingRotation, t))
        }
    }

    public stop() {
        this.sticker.update(this.finalPosition, this.finalOffset)
    }
}


class GyroComponent {
    cubie: Cubie
    startingPosition: Vector3
    endPosition: Vector3
    currentPosition: Vector3 = Vectors.zero()

    stickerInterpolators: StickerInterpolator[] = []

    constructor(cubie: Cubie) {
        const config = Config.config()
        const x0 = -config.w_center_x - config.cubie_gap/2 - config.cube_size
        const x1 = -config.w_center_x + config.cubie_gap/2 + config.cube_size
        const x2 = config.w_center_x - config.cubie_gap/2 - config.cube_size
        const x3 = config.w_center_x + config.cubie_gap/2 + config.cube_size

        this.cubie = cubie
        this.startingPosition = cubie.pivot.position.clone()
        if (cubie.inLayer(CubeFace.A)) {
            if (cubie.inLayer(CubeFace.L)) {
                // Moves from L to R side.
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
        cubie.stickers.forEach((s) => this.stickerInterpolators.push(new StickerInterpolator(s)))
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

class Gyro {
    components: [GyroComponent]
    ticks: number = 0
    maxTicks: number = 40

    constructor() {
        this.components = []
        //this.components.push(new GyroComponent(Game.game().cube.cubies[0]))
        Game.game().cube.cubies.forEach((c) => {
            this.components.push(new GyroComponent(c))
        })
    }

    public tick() {
        console.log(this.ticks/this.maxTicks)
        this.ticks++
        this.components.forEach((c) => c.update(Math.min(1, this.ticks/this.maxTicks)))
    }

    public done() {
        return this.ticks >= this.maxTicks
    }

    public stop() {
        this.components.forEach((c) => c.stop())
    }
}

type SliceSelector = (c) => boolean

export class SliceSelectors {
    static U: SliceSelector = (c) => c.inLayer(CubeFace.U)
    static D: SliceSelector = (c) => c.inLayer(CubeFace.D)
    static F: SliceSelector = (c) => c.inLayer(CubeFace.F)
    static B: SliceSelector = (c) => c.inLayer(CubeFace.B)
    static K: SliceSelector = (c) => c.inLayer(CubeFace.K)
    static A: SliceSelector = (c) => c.inLayer(CubeFace.A)
    static O: SliceSelector = (c) => c.inLayer(CubeFace.L)
    static I: SliceSelector = (c) => c.inLayer(CubeFace.R)
}

export class TurnRegistry {
    static AR = new Turn(Vectors.left(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AL = new Turn(Vectors.right(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AU = new Turn(Vectors.down(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AD = new Turn(Vectors.up(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AF = new Turn(Vectors.back(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AB = new Turn(Vectors.front(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static KR = new Turn(Vectors.right(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KL = new Turn(Vectors.left(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KU = new Turn(Vectors.down(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KD = new Turn(Vectors.up(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KF = new Turn(Vectors.back(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KB = new Turn(Vectors.front(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)

    static U = new Turn(Vectors.down(), Vectors.zero(), 2, SliceSelectors.U)
    static D = new Turn(Vectors.up(), Vectors.zero(), 2, SliceSelectors.D)
    static F = new Turn(Vectors.back(), Vectors.zero(), 2, SliceSelectors.F)
    static B = new Turn(Vectors.front(), Vectors.zero(), 2, SliceSelectors.B)
    static I = new Turn(Vectors.right(), Vectors.zero(), 1, SliceSelectors.I)
    static O = new Turn(Vectors.left(), Vectors.zero(), 1, SliceSelectors.O)

    static TURNS = [TurnRegistry.AR, TurnRegistry.AL, TurnRegistry.AU, TurnRegistry.AD, TurnRegistry.AF, TurnRegistry.AB,
        TurnRegistry.KR, TurnRegistry.KL, TurnRegistry.KU, TurnRegistry.KD, TurnRegistry.KF, TurnRegistry.KB,
        TurnRegistry.U, TurnRegistry.D, TurnRegistry.F, TurnRegistry.B, TurnRegistry.I, TurnRegistry.O
    ]
    public static random(): Turn {
        return TurnRegistry.TURNS[Math.floor(Math.random() * TurnRegistry.TURNS.length)]
    }
}

export class TurnController {
    scene: any
    cube: any
    turning: boolean
    _gyro?: Gyro
    initialClick?: Vector2
    sticker: Sticker
    turn?: Turn
    direction: number
    shift: boolean

    turn_mode: string = "click"

    speed: number = 1

    scrambling: boolean = false
    _scramble_remaining = 0;
    _scramble_prev_axis = Vectors.zero();

    constructor(scene, cube) {
        this.scene = scene
        this.cube = cube
    }

    public scramble() {
        this.scrambling = true
        this._scramble_remaining = 100
        this.speed = 3
    }

    public gyro() {
        if (!this._gyro) {
            this._gyro = new Gyro()
        }
    }

    public setShift(enabled: boolean) {
        this.shift = enabled
    }

    public clickStart(sticker, position: Vector2, leftClick: boolean, rightClick: boolean) {
        if (this.turning) return

        this.turning = false
        this.sticker = sticker
        this.initialClick = position

        if (this.turn_mode == "click") {
            const face = this.sticker.getFace()
            const kata = this.sticker.cubie.inLayer(CubeFace.K)
            this.turn = undefined
            this.direction = leftClick ? 1 : -1
            switch(face) {
                case CubeFace.U:
                    if (this.shift) {
                        this.turn = TurnRegistry.U
                    } else if (kata) {
                        this.turn = TurnRegistry.KU
                    } else {
                        this.turn = TurnRegistry.AU
                    }
                    break
                case CubeFace.D:
                    if (this.shift) {
                        this.turn = TurnRegistry.D
                    } else if (kata) {
                        this.turn = TurnRegistry.KD
                    } else {
                        this.turn = TurnRegistry.AD
                    }
                    break
                case CubeFace.F:
                    if (this.shift) {
                        this.turn = TurnRegistry.F
                    } else if (kata) {
                        this.turn = TurnRegistry.KF
                    } else {
                        this.turn = TurnRegistry.AF
                    }
                    break
                case CubeFace.B:
                    if (this.shift) {
                        this.turn = TurnRegistry.B
                    } else if (kata) {
                        this.turn = TurnRegistry.KB
                    } else {
                        this.turn = TurnRegistry.AB
                    }
                    break
                case CubeFace.L:
                    if (this.shift) {
                        this.turn = TurnRegistry.O
                    } else if (kata) {
                        this.turn = TurnRegistry.KL
                    } else {
                        this.turn = TurnRegistry.AL
                    }
                    break
                case CubeFace.R:
                    if (this.shift) {
                        this.turn = TurnRegistry.I
                    } else if (kata) {
                        this.turn = TurnRegistry.KR
                    } else {
                        this.turn = TurnRegistry.AR
                    }
                    break
            }
            if (this.turn) {
                this.turn.start()
                this.turning = true
            }
        }
    }

    public mouseMove(position: Vector2) {
        if (!this.initialClick) return

        // if (position.distanceTo(this.initialClick) > 0.1) {
        //     const direction = position.sub(this.initialClick)
        //     const face = this.sticker.getFace()
        //     const vertical = VectorMath.isVertical(direction)
        //     const horizontal = VectorMath.isHorizontal(direction)
        //     this.direction = 1
        //     if (this.shift) {
        //         switch (face) {
        //             case CubeFace.U:
        //                 if (vertical) {
        //                     this.turn = TurnRegistry.AR
        //                     this.direction = -vertical
        //                 } else {
        //                     this.turn = TurnRegistry.AF
        //                     this.direction = horizontal
        //                 }
        //         }
        //     } else {
        //         switch (face) {
        //             case CubeFace.U:
        //                 if (Math.abs(direction.x) > Math.abs(direction.y)) {
        //                     this.turn = TurnRegistry.U
        //                     if (direction.x < 0) {
        //                         this.direction = -1
        //                     }
        //                     if (this.sticker.cubie.inLayer(CubeFace.F)) {
        //                         this.direction *= -1
        //                     }
        //                 } else {
        //                     if (this.sticker.cubie.inLayer(CubeFace.F)) {
        //                         this.turn = TurnRegistry.F
        //                         if (direction.y < 0) {
        //                             this.direction = -1
        //                         }
        //                         if (this.sticker.cubie.inLayer(CubeFace.K)) {
        //                             this.direction *= -1
        //                         }
        //                     } else {
        //                         this.turn = TurnRegistry.B
        //                         if (direction.y > 0) {
        //                             this.direction = -1
        //                         }
        //                         if (this.sticker.cubie.inLayer(CubeFace.K)) {
        //                             this.direction *= -1
        //                         }
        //                     }
        //                 }
        //                 break
        //             case CubeFace.D:
        //                 this.turn = TurnRegistry.D
        //                 break
        //             case CubeFace.F:
        //                 this.turn = TurnRegistry.F
        //                 break
        //             case CubeFace.B:
        //                 this.turn = TurnRegistry.B
        //                 break
        //             case CubeFace.L:
        //                 this.turn = TurnRegistry.O
        //                 break
        //             case CubeFace.R:
        //                 this.turn = TurnRegistry.I
        //                 break
        //         }
        //     }
        //     this.turn!.start()
        //     this.turning = true
        //     this.initialClick = undefined
        // }
    }

    public mouseUp() {
        if(!this.turning && this.initialClick) {
            this.initialClick = undefined
        }
    }

    public tick() {
        if (this._gyro) {
            console.log("updating gyro")
            this._gyro.tick()
            if (this._gyro.done()) {
                this._gyro.stop()
                this._gyro = undefined
                console.log("gyro done")
            }
            return
        }

        if (this.scrambling && !this.turning) {
            this._scramble_remaining--
            if (this._scramble_remaining <= 0) {
                this.scrambling = false
                this.speed = 1
            }
            this.direction = 1
            this.turning = true
            if (Math.random() > 0.9) {
                this._gyro = new Gyro()
            } else {
                this.turn = TurnRegistry.random()
                if (this._scramble_prev_axis) {
                    while (Math.abs(this.turn.axis.dot(this._scramble_prev_axis)) > 0.99) {
                        this.turn = TurnRegistry.random()
                    }
                }
                this._scramble_prev_axis = this.turn.axis
                this.turn.start()
            }
        }

        if(this.turning && this.turn) {
            this.turn.update(0.05 * this.direction * this.speed)
            if (Math.abs(this.turn.angle) > this.turn.stepAngle) {
                this.turn.stop()
                this.turning = false
            }
        }
    }

}