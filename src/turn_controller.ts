import {Group, Quaternion, type Scene, Vector2, Vector3} from "three";
import {Cube, CubeFace, Cubie, Sticker} from "./cube.ts";
import {Vectors} from "./vector_math.ts";
import {Game} from "./game.ts";
import {Config} from "./config.ts";


export interface ITurn {
    begin: () => void;
    end: () => void;
    done: () => boolean;
    setDirection: (direction: number) => void;
    tick: (dt: number) => void;
}

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


class StickerInterpolator {
    sticker: Sticker
    startingRotation: Quaternion
    endingRotation?: Quaternion
    finalOffset?: Vector3
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

    public tick(dt: number) {
        if (this.endingRotation) {
            this.sticker.cube.setRotationFromQuaternion(new Quaternion().slerpQuaternions(this.startingRotation, this.endingRotation, dt))
        }
    }

    public stop() {
        this.sticker.update(this.finalPosition, this.finalOffset!)
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

class Gyro implements ITurn {
    components: GyroComponent[]
    ticks: number = 0
    maxTicks: number = 2
    direction: number = 1

    constructor() {
        this.components = []
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
            this.components.push(new GyroComponent(c))
        })
    }

    public end() {
        this.components.forEach((c) => c.stop())
    }
}

type CubieSelector = (c: Cubie) => boolean

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
    cube: Cube
    turning: boolean = false
    _gyro?: Gyro
    initialClick?: Vector2
    sticker?: Sticker
    turn?: ITurn
    direction: number = 1
    shift: boolean = false

    turn_mode: string = "click"

    speed: number = 1

    scrambling: boolean = false
    _scramble_remaining = 0;
    _scramble_prev_axis = Vectors.zero();

    constructor(scene: Scene, cube: Cube) {
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
            this.startTurn(new Gyro())
        }
    }

    public startTurn(turn: ITurn) {
        this.turn = turn
        this.turning = true
        this.turn.begin()
    }

    public setShift(enabled: boolean) {
        this.shift = enabled
    }

    public clickStart(sticker: Sticker, position: Vector2, leftClick: boolean) {
        if (this.turning) return

        this.turning = false
        this.sticker = sticker
        this.initialClick = position

        if (this.turn_mode == "click") {
            const face = this.sticker!.getFace()
            const kata = this.sticker!.cubie.inLayer(CubeFace.K)
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
                this.turn.setDirection(this.direction)
                this.turn.begin()
                this.turning = true
            }
        }
    }

    // @ts-ignore
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

    public tick(dt: number = 1/60) {
        // if (this._gyro) {
        //     console.log("updating gyro")
        //     this._gyro.tick(dt)
        //     if (this._gyro.done()) {
        //         this._gyro.end()
        //         this._gyro = undefined
        //         console.log("gyro done")
        //     }
        //     return
        // }

        if (this.scrambling && !this.turning) {
            this._scramble_remaining--
            if (this._scramble_remaining <= 0) {
                this.scrambling = false
                this.speed = 1
            }
            this.direction = 1
            this.turning = true
            if (Math.random() > 0.9) {
                this.turn = new Gyro()
                this.turn.begin()
            } else {
                let turn = TurnRegistry.random()
                if (this._scramble_prev_axis) {
                    while (Math.abs(turn.axis.dot(this._scramble_prev_axis)) > 0.99) {
                        turn = TurnRegistry.random()
                    }
                }
                this._scramble_prev_axis = turn.axis
                this.turn = turn
                this.turn.begin()
            }
        }

        if(this.turning && this.turn) {
            this.turn.tick(dt * this.speed)
            if (this.turn.done()) {
                this.turn.end()
                this.turn = undefined
                this.turning = false
            }
        }
    }

}