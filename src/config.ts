
export class Config {
    private static _instance: Config

    debug_pause: boolean = false
    turn_speed: number = 1
    cube_size: number = 2
    cubie_gap: number = 0.2
    hedgehog_angle: number = 35

    cubie_pos: number = 0
    _h_angle_rad: number = 0
    angled_cubie_height: number = 0
    w_center_x: number = 0
    
    colors: {[key: string]: number} = {}

    constructor() {
        this.loadFromLocalStorage()
    }

    private getDefaultValues() {
        return {
            turn_speed: 1,
            cube_size: 2,
            cubie_gap: 0.2,
            hedgehog_angle: 35,
            colors: {
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
    }

    private calculateDependentValues() {
        this._h_angle_rad = Math.PI/180 * this.hedgehog_angle
        this.cubie_pos = this.cube_size + this.cubie_gap/2
        this.angled_cubie_height = this.cube_size * (Math.cos(this._h_angle_rad) + Math.sqrt(2) * Math.sin(this._h_angle_rad))
        this.w_center_x = this.cube_size + this.cubie_gap + this.angled_cubie_height
    }

    private loadFromLocalStorage() {
        const defaults = this.getDefaultValues()
        
        try {
            const saved = localStorage.getItem('hedgehog-config')
            if (saved) {
                const parsed = JSON.parse(saved)
                this.turn_speed = parsed.turn_speed ?? defaults.turn_speed
                this.cube_size = parsed.cube_size ?? defaults.cube_size
                this.cubie_gap = parsed.cubie_gap ?? defaults.cubie_gap
                this.hedgehog_angle = parsed.hedgehog_angle ?? defaults.hedgehog_angle
                this.colors = { ...defaults.colors, ...parsed.colors }
            } else {
                this.turn_speed = defaults.turn_speed
                this.cube_size = defaults.cube_size
                this.cubie_gap = defaults.cubie_gap
                this.hedgehog_angle = defaults.hedgehog_angle
                this.colors = defaults.colors
            }
        } catch (e) {
            console.warn('Failed to load config from localStorage, using defaults:', e)
            this.turn_speed = defaults.turn_speed
            this.cube_size = defaults.cube_size
            this.cubie_gap = defaults.cubie_gap
            this.hedgehog_angle = defaults.hedgehog_angle
            this.colors = defaults.colors
        }
        
        this.calculateDependentValues()
    }

    public saveToLocalStorage() {
        try {
            const configData = {
                turn_speed: this.turn_speed,
                cube_size: this.cube_size,
                cubie_gap: this.cubie_gap,
                hedgehog_angle: this.hedgehog_angle,
                colors: this.colors
            }
            localStorage.setItem('hedgehog-config', JSON.stringify(configData))
        } catch (e) {
            console.error('Failed to save config to localStorage:', e)
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