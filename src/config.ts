
export class Config {
    private static _instance: Config

    debug_pause: boolean = false
    cube_size: number
    cubie_gap: number
    hedgehog_angle: number

    cubie_pos: number
    _h_angle_rad: number
    angled_cubie_height: number
    w_center_x: number
    
    colors: {[key: string]: number}

    constructor() {
        this.cube_size = 2
        this.cubie_gap = 0.2
        this.hedgehog_angle = 35
        this._h_angle_rad = Math.PI/180 * this.hedgehog_angle
        this.cubie_pos = this.cube_size + this.cubie_gap/2
        this.angled_cubie_height = this.cube_size * (Math.cos(this._h_angle_rad) + Math.sqrt(2) * Math.sin(this._h_angle_rad))
        this.w_center_x = this.cube_size + this.cubie_gap + this.angled_cubie_height
        
        this.colors = {
            plus_w:  0x800080,
            minus_w: 0xff88aa,
            plus_x:  0xff0000,
            minus_x: 0xffa500,
            plus_y:  0xffffff,
            minus_y: 0xffff00,
            plus_z:  0x0000ff,
            minus_z: 0x00ff00,
        }
    }

    public static config() {
        if (!Config._instance) {
            Config._instance = new Config()
        }
        return Config._instance
    }

    public pivot_offset() {
        return this.cubie_gap/2 + this.cube_size
    }

    public cubie_center() {
        return this.cubie_gap/2 + this.cube_size/2
    }
}