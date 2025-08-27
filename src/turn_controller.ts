import {type Scene, Vector2, Vector3} from "three";
import {Cube, CubeFace, Sticker} from "./cube.ts";
import {Vectors} from "./vector_math.ts";
import {Config} from "./config.ts";
import {type ITurn, SliceSelectors} from "./turns/iturn.ts";
import {WRotation} from "./turns/wRotation.ts";
import {Rotation} from "./turns/rotation.ts";
import {Turn} from "./turns/turn.ts";
import {Gyro} from "./turns/gyro.ts";

export class TurnRegistry {
    static AR = () => new Turn(Vectors.left(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AL = () => new Turn(Vectors.right(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AU = () => new Turn(Vectors.down(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AD = () => new Turn(Vectors.up(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AF = () => new Turn(Vectors.back(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static AB = () => new Turn(Vectors.front(), new Vector3(-Config.config().w_center_x, 0, 0), 1, SliceSelectors.A)
    static KR = () => new Turn(Vectors.right(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KL = () => new Turn(Vectors.left(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KU = () => new Turn(Vectors.down(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KD = () => new Turn(Vectors.up(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KF = () => new Turn(Vectors.back(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)
    static KB = () => new Turn(Vectors.front(), new Vector3(Config.config().w_center_x, 0, 0), 1, SliceSelectors.K)

    static U = () => new Turn(Vectors.down(), Vectors.zero(), 2, SliceSelectors.U)
    static D = () => new Turn(Vectors.up(), Vectors.zero(), 2, SliceSelectors.D)
    static F = () => new Turn(Vectors.back(), Vectors.zero(), 2, SliceSelectors.F)
    static B = () => new Turn(Vectors.front(), Vectors.zero(), 2, SliceSelectors.B)
    static I = () => new Turn(Vectors.right(), Vectors.zero(), 1, SliceSelectors.I)
    static O = () => new Turn(Vectors.left(), Vectors.zero(), 1, SliceSelectors.O)

    static SCRAMBLE_TURNS = [TurnRegistry.AR, TurnRegistry.AL, TurnRegistry.AU, TurnRegistry.AD, TurnRegistry.AF, TurnRegistry.AB,
        TurnRegistry.KR, TurnRegistry.KL, TurnRegistry.KU, TurnRegistry.KD, TurnRegistry.KF, TurnRegistry.KB,
        TurnRegistry.U, TurnRegistry.D, TurnRegistry.F, TurnRegistry.B, TurnRegistry.I, TurnRegistry.O,
        WRotation.U, WRotation.D, WRotation.F, WRotation.B, WRotation.R, WRotation.L
    ]

    public static random(): ITurn {
        return TurnRegistry.SCRAMBLE_TURNS[Math.floor(Math.random() * TurnRegistry.SCRAMBLE_TURNS.length)]()
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
    ctrl: boolean = false

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
        if (!this.turning) {
            this.turn = turn
            this.turning = true
            this.turn.begin()
        }
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
            console.log(`shift=${this.shift} ctrl=${this.ctrl}`)
            switch(face) {
                case CubeFace.U:
                    if (this.shift && this.ctrl) {
                        this.turn = WRotation.U()
                        this.direction *= kata ? -1 : 1
                    }
                    else if (this.ctrl) {
                        this.turn = Rotation.U()
                    } else if (this.shift) {
                        this.turn = TurnRegistry.U()
                    } else if (kata) {
                        this.turn = TurnRegistry.KU()
                    } else {
                        this.turn = TurnRegistry.AU()
                    }
                    break
                case CubeFace.D:
                    if (this.shift && this.ctrl) {
                        this.turn = WRotation.D()
                        this.direction *= kata ? -1 : 1
                    } else if (this.ctrl) {
                        this.turn = Rotation.D()
                    } else if (this.shift) {
                        this.turn = TurnRegistry.D()
                    } else if (kata) {
                        this.turn = TurnRegistry.KD()
                    } else {
                        this.turn = TurnRegistry.AD()
                    }
                    break
                case CubeFace.F:
                    if (this.shift && this.ctrl) {
                        this.turn = WRotation.F()
                        this.direction *= kata ? -1 : 1
                    } else if (this.ctrl) {
                        this.turn = Rotation.F()
                    } else if (this.shift) {
                        this.turn = TurnRegistry.F()
                    } else if (kata) {
                        this.turn = TurnRegistry.KF()
                    } else {
                        this.turn = TurnRegistry.AF()
                    }
                    break
                case CubeFace.B:
                    if (this.shift && this.ctrl) {
                        this.turn = WRotation.B()
                        this.direction *= kata ? -1 : 1
                    } else if (this.ctrl) {
                        this.turn = Rotation.B()
                    } else if (this.shift) {
                        this.turn = TurnRegistry.B()
                    } else if (kata) {
                        this.turn = TurnRegistry.KB()
                    } else {
                        this.turn = TurnRegistry.AB()
                    }
                    break
                case CubeFace.L:
                    if (this.shift && this.ctrl) {
                        this.turn = new Gyro()
                        this.direction *= kata ? 1 : -1
                    } else if (this.ctrl) {
                        this.turn = Rotation.L()
                        this.direction *= kata ? -1 : 1
                    } else if (this.shift) {
                        this.turn = TurnRegistry.O()
                        this.direction *= kata ? 1 : -1
                    } else if (kata) {
                        this.turn = TurnRegistry.KL()
                    } else {
                        this.turn = TurnRegistry.AL()
                    }
                    break
                case CubeFace.R:
                    if (this.shift && this.ctrl) {
                        this.turn = new Gyro()
                        this.direction *= kata ? -1 : 1
                    } else if (this.ctrl) {
                        this.turn = Rotation.R()
                        this.direction *= kata ? -1 : 1
                    } else if (this.shift) {
                        this.turn = TurnRegistry.I()
                        this.direction *= kata ? 1 : -1
                    } else if (kata) {
                        this.turn = TurnRegistry.KR()
                    } else {
                        this.turn = TurnRegistry.AR()
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
        if (Config.config().debug_pause) {
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
            if (Math.random() < 1 / TurnRegistry.SCRAMBLE_TURNS.length) {
                this.turn = new Gyro()
                this.turn.begin()
            } else {
                let turn = TurnRegistry.random()
                if (this._scramble_prev_axis && turn.axis) {
                    while (Math.abs(turn.axis!.dot(this._scramble_prev_axis)) > 0.99) {
                        turn = TurnRegistry.random()
                    }
                    this._scramble_prev_axis = turn.axis!
                } else if (turn.axis) {
                    this._scramble_prev_axis = turn.axis
                }
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