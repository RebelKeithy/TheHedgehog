import type {Config} from "./config.ts";
import type {Cube} from "./cube.ts";

const game = undefined

export class Game {
    private static _instance: Game
    config: Config;
    scene;
    cube: Cube;

    public static game(): Game {
        return Game._instance
    }

    constructor(config, scene, cube) {
        Game._instance = this
        this.config = config
        this.scene = scene
        this.cube = cube
    }
}