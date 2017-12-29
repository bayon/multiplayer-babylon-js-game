import * as BABYLON from 'babylonjs';
import { Area } from './objects/area';
import { Player } from './objects/player';
import { Router } from './router';
import { players, PlayerState } from './state';


export class World {
    private maxFps: number = 40;

    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private area: Area;
    private last_ts: number = null;
    private playerObjs: { [id: string]: Player } = {};


    constructor() {
        this.engine = new BABYLON.NullEngine();
        this.scene = new BABYLON.Scene(this.engine);
        this.area = new Area(this.scene);
    }

    public init() {
        // Not sure why a camera is needed on the server side...
        var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), this.scene);

        // Important to first enable physics before creating any mesh
        this.scene.enablePhysics(new BABYLON.Vector3(0, -20, 0), new BABYLON.OimoJSPlugin());

        // Creat mesh objects
        this.area.init();

        this.scene.executeWhenReady(() => {
            let elapsedTime = (1000 / this.maxFps);
            this.engine.runRenderLoop(() => {
                if(this.last_ts === null){
                    this.last_ts = Date.now();
                }
                else{
                    let tmp_ts = this.last_ts;
                    let curr_ts = Date.now();
                    let test_time = curr_ts - tmp_ts;

                    if(test_time > elapsedTime){
                        this.scene.render();
                        Object.keys(this.playerObjs).forEach((key) => {
                            let lv = this.playerObjs[key].playerMesh.physicsImpostor.getLinearVelocity();
                            let av = this.playerObjs[key].playerMesh.physicsImpostor.getAngularVelocity();
                            let pos = this.playerObjs[key].playerMesh.position;
                            players[key].angularVelocity = av;
                            players[key].linearVelocity = lv;
                            players[key].position = pos;
                        });
                        Router.updateWorld();

                        this.last_ts = curr_ts;
                    }
                }
            });
        });
    }

    public applyMovment(key: string, data: any){
        let dir: BABYLON.Vector3 = this.createVector(data.direction);
        let force: number = data.force; 
        
        this.playerObjs[key].applyMovement(dir, force);
    }

    public createPlayer(id: string, name: string): void {
        let player = new Player(this.scene);
        player.init(id);

        // Add player to world 
        this.playerObjs[id] = player;

        // Add player to the global state
        let playerState = new PlayerState();
        playerState.linearVelocity = player.playerMesh.physicsImpostor.getLinearVelocity();
        playerState.angularVelocity = player.playerMesh.physicsImpostor.getAngularVelocity();
        playerState.name = name;
        playerState.uuid = id;
        playerState.position = player.playerMesh.position;

        players[id] = playerState;
    }

    public removePlayer(id: string) {
        let ps: PlayerState = players[id];
        delete players[id];

        let player: Player = this.playerObjs[id];
        if(player !== undefined)
            player.playerMesh.dispose();
        delete this.playerObjs[id];
    }

    private createVector(config: any): BABYLON.Vector3 {
        let vec = new BABYLON.Vector3(
            config.x, config.y, config.z
        );
        return vec;
    }
}