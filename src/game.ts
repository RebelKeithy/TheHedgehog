import type {Config} from "./config.ts";
import type {Cube} from "./cube.ts";
import type {Scene} from "three";

export class Game {
    private static _instance: Game
    config: Config;
    scene;
    cube: Cube;

    public static game(): Game {
        return Game._instance
    }

    constructor(config: Config, scene: Scene, cube: Cube) {
        Game._instance = this
        this.config = config
        this.scene = scene
        this.cube = cube
    }
}