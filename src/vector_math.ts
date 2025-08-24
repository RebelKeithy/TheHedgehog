import {Vector2, Vector3} from "three";


export class Vectors {
    static one(scale: number = 1) {
        return new Vector3(1, 1, 1).multiplyScalar(scale)
    }

    static zero() {
        return new Vector3(0, 0, 0)
    }

    static up() {
        return new Vector3(0, 1, 0)
    }

    static down() {
        return new Vector3(0, -1, 0)
    }

    static left() {
        return new Vector3(-1, 0, 0)
    }

    static right() {
        return new Vector3(1, 0, 0)
    }

    static front() {
        return new Vector3(0, 0, -1)
    }

    static back() {
        return new Vector3(0, 0, 1)
    }
}

export class VectorMath {
    static mul(v: Vector3, value: number) {
        const result = v.clone()
        result.multiplyScalar(value)
        return result
    }

    static isHorizontal(v: Vector2) {
        if (Math.abs(v.y) > Math.abs(v.x)) {
            return 0
        } else if(v.x > 0) {
            return 1
        }
        return -1
    }

    static isVertical(v: Vector2) {
        if (Math.abs(v.x) > Math.abs(v.y)) {
            return 0
        } else if(v.y > 0) {
            return 1
        }
        return -1
    }

    static projX(v: Vector3) {
        return new Vector3(v.x, 0, 0)
    }

    static projY(v: Vector3) {
        return new Vector3(0, v.y, 0)
    }

    static projZ(v: Vector3) {
        return new Vector3(0, 0, v.z)
    }

    static argmax(v: Vector3) {
        if (Math.abs(v.x) > Math.abs(v.y) && Math.abs(v.x) > Math.abs(v.z)) {
            return new Vector3(v.x, 0, 0)
        } else if(Math.abs(v.y) > Math.abs(v.z)) {
            return new Vector3(0, v.y, 0)
        } else {
            return new Vector3(0, 0, v.z)
        }
    }

    static unify(v: Vector3) {
        return new Vector3(Math.sign(v.x), Math.sign(v.y), Math.sign(v.z))
    }

    static setComponentLength(v: Vector3, l: number) {
        return VectorMath.unify(v).multiplyScalar(l)
    }
}
