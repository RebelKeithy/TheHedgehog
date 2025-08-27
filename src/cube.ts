import {VectorMath, Vectors} from "./vector_math.ts";
import {Group, Object3D, Quaternion, type Scene, Vector3, Vector4} from "three";
import * as THREE from "three";
import {Config} from "./config.ts";
// @ts-ignore
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry";

export class CubeFace {
    static U = "U"
    static D = "D"
    static F = "F"
    static B = "B"
    static L = "L"
    static R = "R"
    static A = "A" // -x
    static K = "K" // +x
}

export function CubeAxisFromFace(face: CubeFace) {
    switch (face) {
        case CubeFace.U: return Vectors.up()
        case CubeFace.D: return Vectors.down()
        case CubeFace.F: return Vectors.front()
        case CubeFace.B: return Vectors.back()
        case CubeFace.L: return Vectors.left()
        case CubeFace.R: return Vectors.right()
        case CubeFace.A: return Vectors.zero()
        case CubeFace.K: return Vectors.zero()
    }
}

const CubePosition = {
    RUBA: new Vector4( 1,  1,  1,  1),
    RUBK: new Vector4( 1,  1,  1, -1),
    RUFA: new Vector4( 1,  1,  -1,  1),
    RUFK: new Vector4( 1,  1,  -1, -1),
    RDBA: new Vector4( 1,  -1,  1,  1),
    RDBK: new Vector4( 1,  -1,  1, -1),
    RDFA: new Vector4( 1,  -1,  -1,  1),
    RDFK: new Vector4( 1,  -1,  -1, -1),
    LUBA: new Vector4( -1,  1,  1,  1),
    LUBK: new Vector4( -1,  1,  1, -1),
    LUFA: new Vector4( -1,  1,  -1,  1),
    LUFK: new Vector4( -1,  1,  -1, -1),
    LDBA: new Vector4( -1,  -1,  1,  1),
    LDBK: new Vector4( -1,  -1,  1, -1),
    LDFA: new Vector4( -1,  -1,  -1,  1),
    LDFK: new Vector4( -1,  -1,  -1, -1),
}

export class Cube {
    public root: Group
    public anna: Vector3
    public kata: Vector3
    public cubies: Cubie[] = []
    constructor(scene: Scene) {
        const config = Config.config()
        this.root = new Group()
        this.anna = new Vector3(-config.w_center_x, 0, 0)
        this.kata = new Vector3(config.w_center_x, 0, 0)

        Object.values(CubePosition).forEach((position) => {
            const cubie = new Cubie(position)
            this.root.add(cubie.pivot)
            this.cubies.push(cubie)
            if (position.w == 1) {
                cubie.pivot.position.x -= config.w_center_x
            } else {
                cubie.pivot.position.x += config.w_center_x
            }
        })
        scene.add(this.root)
    }

    reset() {
        this.cubies.forEach((cubie) => {
            cubie.stickers.forEach((s) => {
                if (s.getFace() == CubeFace.A) {
                    s.colorId = getColorId({w: 1})
                } else if (s.getFace() == CubeFace.K) {
                    s.colorId = getColorId({w: -1})
                } else {
                    s.colorId = getColorId({x: s.offset.x, y: s.offset.y, z: s.offset.z})
                }
                s.updateColor()
            })
        })
    }

    unification() {
        const config = Config.config()
        this.cubies.forEach((c) => {
            if (c.pivot.position.x < 0) {
                if (c.pivot.position.x < -config.w_center_x) {
                    c.pivot.position.setX(-config.w_center_x - config.pivot_offset())
                } else {
                    c.pivot.position.setX(-config.w_center_x + config.pivot_offset())
                }
            } else {
                if (c.pivot.position.x < config.w_center_x) {
                    c.pivot.position.setX(config.w_center_x - config.pivot_offset())
                } else {
                    c.pivot.position.setX(config.w_center_x + config.pivot_offset())
                }
            }
            if (c.pivot.position.y < 0) {
                c.pivot.position.y = -config.pivot_offset()
            } else {
                c.pivot.position.y = config.pivot_offset()
            }
            if (c.pivot.position.z < 0) {
                c.pivot.position.z = -config.pivot_offset()
            } else {
                c.pivot.position.z = config.pivot_offset()
            }
        })
        this.cubies.forEach((c) => {
            c.stickers.forEach((s) => {
                s.unification()
            })
        })
        this.cubies.forEach((c) => {
            c.stickers.forEach((s) => {
                s.cubie.pivot.setRotationFromQuaternion(new Quaternion())
            })
        })
    }
    
    updateColors() {
        this.cubies.forEach((c) => {
            c.stickers.forEach((s) => {
                s.updateColor()
            })
        })
    }
}

export class Cubie {
    public pivot: Group
    public position: Vector4
    public stickers: Sticker[] = []
    private static _worldPos = new Vector3(0, 0, 0)

    constructor(position: Vector4) {
        this.position = position
        const p = new Vector3(position.x, position.y, position.z)
        const w = position.w
        this.pivot = new Group()
        this.pivot.position.copy(p).multiplyScalar(Config.config().cube_size + Config.config().cubie_gap/2);
        const c0 = new Sticker(this, this.pivot, p, getColorId({w: w}), new Vector3(0, 0, 0))
        const c1 = new Sticker(this, this.pivot, p, getColorId({x: w*p.x}), VectorMath.projX(p))
        const c2 = new Sticker(this, this.pivot, p, getColorId({y: p.y}), VectorMath.projY(p))
        const c3 = new Sticker(this, this.pivot, p, getColorId({z: p.z}), VectorMath.projZ(p))
        this.stickers.push(c0, c1, c2, c3)
    }

    inLayer(layer: CubeFace): boolean {
        this.pivot.getWorldPosition(Cubie._worldPos)
        switch(layer) {
            case CubeFace.U:
                return Cubie._worldPos.y > 0
            case CubeFace.D:
                return Cubie._worldPos.y < 0
            case CubeFace.B:
                return Cubie._worldPos.z > 0
            case CubeFace.F:
                return Cubie._worldPos.z < 0
            case CubeFace.L:
                return Math.abs(Cubie._worldPos.x) > Config.config().w_center_x
            case CubeFace.R:
                return Math.abs(Cubie._worldPos.x) < Config.config().w_center_x
            case CubeFace.A:
                return Cubie._worldPos.x < 0
            case CubeFace.K:
                return Cubie._worldPos.x > 0
        }
        throw Error()
    }
}

export class Sticker {
    cubie: Cubie
    colorId: string
    position: Vector3
    offset: Vector3
    cube: Object3D

    constructor(cubie: Cubie, parent: Group, position: Vector3, colorId: string, offset: Vector3) {
        this.cubie = cubie
        this.colorId = colorId
        this.position = position
        this.offset = offset
        this.cube = createCube(parent, position, getColorById(this.colorId));
        this.update(position, offset)
    }

    onClick(): void {
        console.log(`Sticker: Clicked ${this.getFace()}`)
    }

    getFace(): CubeFace {
        const config = Config.config()
        const pivotPos = this.cubie.pivot.getWorldPosition(new Vector3())
        const stickerPos = this.cube.children[0].getWorldPosition(new Vector3())
        let anna = true
        if (pivotPos.x < 0) {
            pivotPos.x += config.w_center_x
            stickerPos.x += config.w_center_x
        } else {
            anna = false
            pivotPos.x -= config.w_center_x
            stickerPos.x -= config.w_center_x
        }
        pivotPos.copy(VectorMath.unify(pivotPos).multiplyScalar(config.cubie_center()))

        const offsetPos = stickerPos.clone().sub(pivotPos)
        const offset = VectorMath.argmax(offsetPos, config.cube_size/2).normalize()
        if (offset.y > 0.5) {
            return CubeFace.U
        }
        if (offset.y < -0.5) {
            return CubeFace.D
        }
        if (offset.z > 0.5) {
            return CubeFace.B
        }
        if (offset.z < -0.5) {
            return CubeFace.F
        }
        if (offset.x > 0.5) {
            if (this.cube.getWorldPosition(new Vector3).x > 0) {
                return CubeFace.L
            } else {
                return CubeFace.R
            }
        }
        if (offset.x < -0.5) {
            if (this.cube.getWorldPosition(new Vector3).x < 0) {
                return CubeFace.L
            } else {
                return CubeFace.R
            }
        }
        if (anna) {
            return CubeFace.A
        } else{
            return CubeFace.K
        }
        throw Error("Could not compute face for sticker")
    }

    unification() {
        const config = Config.config()
        const layer_center = new Vector3(config.w_center_x, 0, 0)
        const anna = this.cubie.inLayer(CubeFace.A)
        if(anna) {
            layer_center.setX(-config.w_center_x)
        }
        const p = this.cubie.pivot.getWorldPosition(new Vector3()).sub(layer_center)
        this.position = VectorMath.unify(p)
        const face = this.getFace()
        switch (face) {
            case CubeFace.U:
                this.offset = Vectors.up()
                break
            case CubeFace.D:
                this.offset = Vectors.down()
                break
            case CubeFace.F:
                this.offset = Vectors.front()
                break
            case CubeFace.B:
                this.offset = Vectors.back()
                break
            case CubeFace.L:
                this.offset = anna ? Vectors.left() : Vectors.right()
                break
            case CubeFace.R:
                this.offset = anna ? Vectors.right() : Vectors.left()
                break
            default:
                this.offset = Vectors.zero()
        }
        this.update(this.position, this.offset)
    }

    update(position: Vector3, offset: Vector3) {
        const config = Config.config();
        this.position = position.clone()
        this.offset = offset
        const nonOffset: Vector3 = position.clone().multiplyScalar(-config.cube_size/2)
        this.cube.children[0].position.copy(nonOffset)
        if (offset) {
            this.cube.children[0].position.add(offset.clone().multiplyScalar(config.cube_size))
        }
        this.setRotation(config._h_angle_rad)
    }

    setRotation(angle: number) {
        const a = new Vector3().crossVectors(this.offset, this.position)
        this.cube.setRotationFromAxisAngle(a.normalize(), angle)
    }
    
    updateColor() {
        const color = getColorById(this.colorId)
        const mesh = this.cube.children[0] as THREE.Mesh<any, THREE.MeshStandardMaterial>
        if (mesh && mesh.material) {
            mesh.material.color.setHex(color)
        }
    }
}

function createCube(parent: Object3D, direction: Vector3, faceColor: number) {
    const config = Config.config();
    const pivot = new Group()
    const geometry = new RoundedBoxGeometry(config.cube_size, config.cube_size, config.cube_size, 2, 0.18)
    const geometry2 = new RoundedBoxGeometry(config.cube_size * 0.99, config.cube_size * 0.99, config.cube_size * 0.99, 2, 0.1)
    //const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const material = new THREE.MeshStandardMaterial({ color: faceColor, opacity: 0.1, roughness: 0.7, metalness: 0.1 });
    const material2 = new THREE.MeshStandardMaterial({ color: 0x000000, opacity: 0.9, roughness: 0.1, metalness: 0.1 });
    const cubie = new THREE.Mesh(geometry, material);
    const cubie2 = new THREE.Mesh(geometry2, material2);
    pivot.position.copy(direction).multiplyScalar(config.cubie_pos)
    // cubie.position.copy(direction).multiplyScalar(config.cube_size/2 + config.cubie_gap/2)
    // cubie2.position.copy(direction).multiplyScalar(config.cube_size/2 + config.cubie_gap/2)
    // if (offset) {
    //     cubie.position.add(offset.clone().multiplyScalar(config.cube_size))
    //     cubie2.position.add(offset.clone().multiplyScalar(config.cube_size))
    // }
    pivot.attach(cubie)
    cubie.attach(cubie2)
    parent.attach(pivot)
    return pivot
}

function getColorById(colorId: string) {
    const config = Config.config();
    return config.colors[colorId];
}

function getColorId({x = 0, y = 0, z = 0, w= 0}): string {
    if (x == 1) {
        return 'plus_x'
    }
    if (x == -1) {
        return 'minus_x'
    }
    if (y == 1) {
        return 'plus_y'
    }
    if (y == -1) {
        return 'minus_y'
    }
    if (z == 1) {
        return 'plus_z'
    }
    if (z == -1) {
        return 'minus_z'
    }
    if (w == 1) {
        return 'plus_w'
    }
    if (w == -1) {
        return 'minus_w'
    }
    return ''
}