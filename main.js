import * as THREE from 'three';
import { OrbitControls } from 'orbitControls';
import { VRButton } from 'VRButton';

import config from 'Config';
import gamePad from 'Gamepad';
import audio from 'Audio';
import Car from 'Car';
import debug from 'debug';
import AIDriver from 'AIDriver';
import RemoteAI from 'RemoteAI';
import Player from 'Player';
import levels from 'levels';

// - Global variables -
let DISABLE_DEACTIVATION;
let TRANSFORM_AUX;
let ZERO_QUATERNION;

// Graphics variables
let container;
let controls, scene, renderer;
let terrainMesh, texture;
let clock = new THREE.Clock();  
let platformMaterial;

// Physics variables
let collisionConfiguration;
let dispatcher;
let broadphase;
let solver;
let physicsWorld;
let cbContactResult;      

let syncList = [];
let time = 0;
const objectTimePeriod = 3;
let timeNextSpawn = time + objectTimePeriod;
const maxNumObjects = 30;

let levelComplete = false;
let level = levels[0];

let players = [];
let aiDrivers = [];
let remoteAI = {};
let externalAI = {};
let aiCars = [];
let playerCars = [];
let platformParts = [];

let cars = [];
let cameras = [];

const carsInfo = [
  { color: '#000099', name: 'Blue', score: 0 },
  { color: '#990000', name: 'Red', score: 0 },
  { color: '#009900', name: 'Green', score: 0 },
  { color: '#990099', name: 'Purple', score: 0 },
];

let platform, groundBox;

const aiServerUrl = new URLSearchParams(window.location.search).get('aiServerUrl') || config.aiServerUrl;
const aiServerProtocol = new URLSearchParams(window.location.search).get('protocol') || config.aiServerProtocol;

// Keybord actions
const keyActions = [
  {
    'ArrowUp':'acceleration',
    'ArrowDown':'reversing',
    'ArrowLeft':'left',
    'ArrowRight':'right',
    // 'Space': 'braking'
  }, 
  {
    "KeyW":'acceleration',
    "KeyS":'reversing',
    "KeyA":'left',
    "KeyD":'right'
  },
  {
    "KeyI":'acceleration',
    "KeyK":'reversing',
    "KeyJ":'left',
    "KeyL":'right'
  }, 
  {
    "Numpad5":'acceleration',
    "Numpad2":'reversing',
    "Numpad1":'left',
    "Numpad3":'right'
  }
];

const startDialogEl = document.getElementById('startDialog');

const levelDialogEl = document.getElementById('levelCompleteDialog');
const restartLevelButtonEl = document.getElementById('restartLevelButton');
const nextLevelButtonEl = document.getElementById('nextLevelButton');
const scoresEl = document.getElementById('scores');
const levelWinnerEl = document.getElementById('levelWinner');

const gameOverDialogEl = document.getElementById('gameOverDialog');
const restartGameButtonEl = document.getElementById('restartGameButton');
const endScoresEl = document.getElementById('endScores');
const gameWinnerEl = document.getElementById('gameWinner');
const timerEl = document.getElementById('timer');

// debug.on();

async function updateAIOptions() {
  let aiOptions = '';
  try {
    const response = await fetch(aiServerProtocol + '://' + aiServerUrl + '/ai', {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
    const aiList = await response.json();
    aiList.forEach(ai => {
      let path = '';
      if(ai.path)
        path = `data-path="${ ai.path }"`;
      aiOptions += `\n<option value="${ ai.name }" data-type="${ ai.type }" ${ path }>${ ai.name }</option>`;
    });
  }
  catch (error) {
     aiOptions = `<option value="none">N/A</option>`;
  }
  const selects = document.querySelectorAll('.aiSelect');
  for (let i = 0; i < selects.length; i++) {
    if(selects[i].selectedIndex === 0)
      selects[i].innerHTML = aiOptions;
  }
}

document.addEventListener('aiOptions', () => {
  updateAIOptions();
});

document.addEventListener('gamepads', () => {
  updateGamepads();
});

function updateGamepads() {
  gamePad.getPads().forEach((pad, i) => {
    if(players[i]) {
      players[i].pad = pad;
      console.log(pad.name + ' assigned to player ' + (i + 1));
    }
  });
}

async function log(message) {
  const response = await fetch(aiServerProtocol + '://' + aiServerUrl + '/logs', {
    method: 'POST',
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: message }),
  });
  return response.json();
}

let timer = null;

function startTimer() {
  let timerVal = level.time;
  timer = setInterval(() => {
    timerVal--;
    timerEl.innerHTML = timerVal;
    if(timerVal === 0)
      endLevel('timer');
  }, 1000);
}

function endTimer() {
  window.clearInterval(timer);
  timerEl.innerHTML = '';
}

restartLevelButtonEl.onclick = () => {
  restart();
}

nextLevelButtonEl.onclick = () => {
  levelSelected++;
  if(levelSelected >= levels.length)
    endGame();
  else
    restart();
}

function endLevel(reason) {
  audio.play('endlevel');
  endTimer();
  levelComplete = true;
  renderScores(scoresEl);
  renderWinner(levelWinnerEl);
  levelDialogEl.showModal();
  let scoreArr = [];
  cars.filter(n => n).forEach(car => {
    scoreArr.push({ car: car.info.name, score: car.info.score });
    car.info.score = 0;
  });
  log({ scores: scoreArr });
}

restartGameButtonEl.onclick = () => {
  location.reload();
}

function endGame() {
  endTimer();
  levelComplete = true;
  renderScores(endScoresEl);
  renderWinner(gameWinnerEl);
  gameOverDialogEl.showModal();
}

function renderScores(el) {
  let html = '';
  
  cars.filter(n => n).forEach(car => {
    //console.log(car)
    
    car.info.score += car.score * 1000// + car.boxHits;
    car.boxes.forEach(box => {
      if(box.inside) {
        const distance = car.zone.mesh.position.distanceTo(box.position);
        if(distance > 1)
          car.info.score += Math.floor(1000 / distance);
      }
    });
    html += `<p>${ car.info.name }: ${ car.info.score }</p>`;
  });
  el.innerHTML = html + '<br/>';
}

function renderWinner(el) {
  const max = cars.filter(n => n).reduce((prev, current) => {
    return (prev.info.score > current.info.score) ? prev : current;
  });
  el.innerHTML = `<p>${ max.info.name } wins!</p>`;
}

function initScene() {

  container = document.getElementById('container');

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.xr.enabled = true;
  renderer.setClearColor(0xbfd1e5);
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild( VRButton.createButton( renderer ) );
  
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
  camera.position.x = 0;
  camera.position.y = 30;
  camera.position.z = -30;
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  cameras.push(camera);
    
  renderer.xr.addEventListener('sessionstart', (event) => {
    console.log(renderer.xr.getCamera().position)
    console.log(camera.target)
    renderer.xr.getCamera().position.copy(camera.position);
    // renderer.xr.getCamera().lookAt(camera.target);
    renderer.xr.getCamera().lookAt(new THREE.Vector3(0, 0, 10));
  });
  
  controls = new OrbitControls(camera, renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x444444, Math.PI / 2)
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
  dirLight.position.set(50, 50, -50);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.zoom = 0.1;
  scene.add(dirLight);
  
  const dirLight1 = new THREE.DirectionalLight(0xffffff, Math.PI / 2);
  dirLight1.position.set(0, 50, 0);
  scene.add(dirLight1);

  // const helper = new THREE.CameraHelper( dirLight.shadow.camera );
  // scene.add( helper );

  platformMaterial = new THREE.MeshPhongMaterial({ color:0x999999 });

  container.innerHTML = "";

  container.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);
}

function initKeyEvents() {
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
}

function onWindowResize() {
  cameras.forEach(camera => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  renderer.setSize( window.innerWidth, window.innerHeight );    
}

function initPhysics() {
  DISABLE_DEACTIVATION = 4;
  TRANSFORM_AUX = new Ammo.btTransform();
  ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);
  setupContactResultCallback();
  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
  physicsWorld.setGravity( new Ammo.btVector3( 0, -9.82, 0 ) );
}  
      
function initAI(aiCars) {
  const bounds = new THREE.Box3().setFromObject(platform);

  aiCars.forEach(car => {
    if(remoteAI[car]) {
      const remote = new RemoteAI(aiServerUrl, remoteAI[car]);
      remote.car = cars[car];
      aiDrivers.push(remote);
      const state = {
        event: 'staticState',
        objects: getAIStaticWorldState(remote)
      };        
      remote.sendStatic(state);
    }
    else if(externalAI[car]) {
      console.log(externalAI[car])
      const remote = new RemoteAI(externalAI[car].path, externalAI[car].name);
      remote.car = cars[car];
      aiDrivers.push(remote);
      const state = {
        event: 'staticState',
        objects: getAIStaticWorldState(remote)
      };        
      remote.sendStatic(state);
    }
    else
      aiDrivers.push(new AIDriver(cars[car], bounds));
  });
}

function initCars() {
  const lPos = level.cars.position;
  const numCars = playerCars.length + aiCars.length;
  const xStart = numCars * 2;
  let position = 0;
  carsInfo.forEach((ci, i) => {
    if(playerCars.includes(i) || aiCars.includes(i)) {
      const material = new THREE.MeshPhongMaterial({color: ci.color});
      const xPos = xStart + ((position + 0.5) * -4);
      const car = new Car(new THREE.Vector3(lPos.x + xPos, lPos.y + 4, lPos.z), ZERO_QUATERNION, scene, physicsWorld, material);
      car.info = ci;
      car.index = i;
      
      car.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
      car.camera.fov = 60;
      car.camera.updateProjectionMatrix();
      car.chassisMesh.attach(car.camera);
      car.camera.position.y = 2;
      car.camera.position.z = -3;
      car.camera.rotation.y = Math.PI;
      car.camera.rotation.x = 0.25;
            
      cameras.push(car.camera);
      
      cars.push(car);
      position++;
    }
    else {
      cars.push(null);
    }
  });
}

function initPlayers(pCars) {
  pCars.forEach((car, i) => {
    players.push(new Player(cars[car], keyActions[i], gamePad.getPads()[i]));
  });
}

function getAIDynamicWorldState(ai) {
  const objects = [];
  ai.car.boxes.forEach((aiBox, i) => {
    aiBox = aiBox.mesh;
    const box = {
      id: i + 1,
      type: 'box',
      label: 'playerBox',
      position: aiBox.position,
      orientation: {
        x: aiBox.rotation.x,
        y: aiBox.rotation.y,
        z: aiBox.rotation.z,
      }      
    };
    objects.push(box);
  });
    
//   let rotation = new THREE.Vector3(0, 0 ,0);
//   rotation.y = ai.car.chassisMesh.rotation.y;
  
//   if(Math.abs(ai.car.chassisMesh.rotation.z) < Math.PI / 2)
//     rotation.y *= -1;
  
  const pKart = {
    id: '0',
    type: 'kart',
    label: 'playerKart',
    position: ai.car.chassisMesh.position,
    orientation: ai.car.chassisMesh.rotation,
    speed: ai.car.speed,
    heading: ai.car.getHeading()
  }
  objects.push(pKart);
  return objects;
}

function getAIStaticWorldState(ai) {
  const staticWorld = [{
      id: '1',
      type: 'zone',
      label: 'playerZone',
      position: ai.car.zone.mesh.position,
      orientation: {
        x: ai.car.zone.mesh.rotation.x,
        y: ai.car.zone.mesh.rotation.y,
        z: ai.car.zone.mesh.rotation.z,
      },
      size: {
        x: ai.car.zone.mesh.geometry.parameters.width,
        y: ai.car.zone.mesh.geometry.parameters.height,
        z: ai.car.zone.mesh.geometry.parameters.depth,
      }
    },
    {
      id: '0',
      type: 'platform',
      label: 'platform',
      position: level.platform.position,
      size: level.platform.size,
    }
  ];
  let i = staticWorld.length;
  level.platform.walls.forEach(wall => {
    staticWorld.push({
      id: i++ + '',
      type: 'wall',
      label: 'wall',
      position: wall.position,
      size: wall.size,
    })
  });
  cars.forEach(car => {
    if(car !== ai.car) {
      staticWorld.push({
        id: i++ + '',
        type: 'zone',
        label: 'zone',
        position: car.zone.mesh.position,
        size: {
          x: car.zone.mesh.geometry.parameters.width,
          y: car.zone.mesh.geometry.parameters.height,
          z: car.zone.mesh.geometry.parameters.depth,
        }
      })
    }
  });
  return staticWorld;
}

function startRenderer() {
  renderer.setAnimationLoop(() => {
    
    if(levelComplete)
      return;
      
    const dt = clock.getDelta();

    for (let i = 0; i < syncList.length; i++)
      syncList[i](dt);

    players.forEach(p => {  
      p.updateActions();
      p.car.sync(p.actions); 
    });

    aiDrivers.forEach(ai => { 
      if(ai.isRemote) {
        const state = {
          event: 'dynamicState',
          objects: getAIDynamicWorldState(ai)
        };        
        ai.sendDynamic(state);
      }        
      else 
        ai.step();
      ai.car.sync(ai.actions);
      if(ai.actions['reset'])
        restart();
    });

    physicsWorld.stepSimulation(dt, 10);
    detectCollision();
    controls.update(dt);

    cars.forEach(car => {
      if(car) {
        let newScore = getObjectsInsideCount(car.zone.mesh, car.boxes.map(box => box.mesh));
        if(newScore !== car.score) {
          if(newScore > car.score)
            audio.play('score');
          car.score = newScore;
          car.zone.label.material.map = getTextTexture(newScore, 'white', 256, 276, 256);
          if(car.score === car.boxes.length) {
            endLevel();
            return;
          }
        }
      }
    }); 

    // Attempt at a dynamic multi-tracking camera
    // const center = cars[0].chassisMesh.position;
    // cars.forEach((car, i) => {
    //   if(i > 0)
    //     center.addVectors(center, car.chassisMesh.position).multiplyScalar(0.5);
    // });
    // camera.lookAt(center);
    
    renderer.render(scene, cameras[currentCam]);
    time += dt;
  });
}


/** Doesn't work
function reset() {
  console.log('Reset!');  
  syncList = [];
  endTimer();
  levelComplete = true;
  cars.forEach(car => {
    car.destroy();
  });
  platformParts.forEach(part => {
    part.mesh.removeFromParent();
    Ammo.destroy(part.body);
  });
  platformParts = [];
  cars = [];
  initPlatform();
  initCars();
  initZones();
  initBoxes();
  startTimer();
  levelComplete = false;
}**/
 
function restart() {
  console.log('Restart!');  
  endTimer();
  levelComplete = true;
  destroy();
  window.start();
  levelComplete = false;
}

function detectCollision() {
  cars.forEach(car => {
    if(car)
      physicsWorld.contactTest(car.chassisBody, cbContactResult);
  });
}

//https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef
//https://gist.github.com/BlueMagnificent/5748bd9588120489634f07c399b795f9
function setupContactResultCallback() {

  cbContactResult = new Ammo.ConcreteContactResultCallback();

  cbContactResult.addSingleResult = (cp, colObj0Wrap, partId0, index0, colObj1Wrap, partId1, index1) => {
    let contactPoint = Ammo.wrapPointer( cp, Ammo.btManifoldPoint );
    const distance = contactPoint.getDistance();
    if(distance > 0)
      return;

    let colWrapper0 = Ammo.wrapPointer(colObj0Wrap, Ammo.btCollisionObjectWrapper);
    let rb0 = Ammo.castObject(colWrapper0.getCollisionObject(), Ammo.btRigidBody);
    
    let colWrapper1 = Ammo.wrapPointer(colObj1Wrap, Ammo.btCollisionObjectWrapper);
    let rb1 = Ammo.castObject(colWrapper1.getCollisionObject(), Ammo.btRigidBody);
    
    // const force = contactPoint.getAppliedImpulse();
    const force = Math.abs(contactPoint.getDistance());
    
    if(rb0.tag === 'chassis' || rb1.tag === 'chassis') {
      // console.log('rb0.tag', rb0.tag)
      // console.log('rb1.tag', rb1.tag)
      if(rb1.tag && rb1.tag === 'chassis') {
        if(force > 0.02) audio.play('carhit', force);
        if(rb0.car.ai)
          rb0.car.ai.crashCar();
        if(rb1.car.ai)
          rb1.car.ai.crashCar();
      }
      else if(rb1.tag === 'wall') {
        if(force > 0.02) audio.play('wallhit', force);
        if(rb0.car.ai) {
          rb0.car.ai.crashWall();
        }
      }
      else if(rb0.tag === 'wall') {
        if(force > 0.02) audio.play('wallhit', force);
        if(rb1.car.ai) {
          rb1.car.ai.crashWall();
        }
      }
      else if(rb1.tag === 'gameBox') {
        if(force > 0.05) audio.play('boxhit', force);
        rb0.car.boxHits++;
      }
      else if(rb0.tag === 'gameBox') {
        if(force > 0.05) audio.play('boxhit', force);
        rb1.car.boxHits++;
      }
    }
  }
}

function getObjectsInsideCount(object, objects) {
  let count = 0;
  const bb = new THREE.Box3().setFromObject(object);
  bb.max.y = 10;

  objects.forEach(ob => {
    if(bb.containsPoint(ob.position)) {
      count++;
      ob.inside = true;
    }
    else
      ob.inside = false;
  });
  return count;
}

// function getCenterPoint(object) {
//   var center = new THREE.Vector3();
//   object.boundingBox.getCenter( center );
//   object.localToWorld( center );
//   return center;
// }

function keyup(e) {
  if(e.key === '\\') {
    endLevel();
  }
  if(e.key === '/') {
    nextCamera();
  }
  if(e.key === 'r')
    restart();
  players.forEach(p => {
    p.keyUp(e);
  });
}

function keydown(e) {
  players.forEach(p => {
    p.keyDown(e);
  });
}

let currentCam = 0;

function nextCamera() {
  currentCam++;
  if(currentCam === cameras.length)
    currentCam = 0;
  
  // renderer.xr.getCamera().position.copy(cameras[currentCam].position);
  // if(cameras[currentCam].target)
  //   renderer.xr.getCamera().lookAt(cameras[currentCam].target);
}

function createBox(pos, quat, w, l, h, mass, friction, material) {
  const box = {};
  if(!material)
    material = platformMaterial;
  var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
  var geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

  if(!mass) mass = 0;
  if(!friction) friction = 1;

  box.mesh = new THREE.Mesh(shape, material);
  box.mesh.position.copy(pos);
  box.mesh.quaternion.copy(quat);
  box.mesh.castShadow = true;
  box.mesh.receiveShadow = true;
  scene.add(box.mesh);

  var transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  var motionState = new Ammo.btDefaultMotionState(transform);

  var localInertia = new Ammo.btVector3(0, 0, 0);
  geometry.calculateLocalInertia(mass, localInertia);

  var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
  box.body = new Ammo.btRigidBody(rbInfo);
  // box.body.tag = 'box';

  box.body.setFriction(friction);
  //body.setRestitution(.9);
  //body.setDamping(0.2, 0.2);

  physicsWorld.addRigidBody(box.body);

  if (mass > 0) {
    box.body.setActivationState(DISABLE_DEACTIVATION);
    // Sync physics and graphics
    function sync(dt) {
      var ms = box.body.getMotionState();
      if (ms) {
        ms.getWorldTransform(TRANSFORM_AUX);
        var p = TRANSFORM_AUX.getOrigin();
        var q = TRANSFORM_AUX.getRotation();
        box.mesh.position.set(p.x(), p.y(), p.z());
        box.mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
    syncList.push(sync);
  } 
  return box;
}

function initPlatform() {
  const pSize = level.platform.size;
  const pPos = level.platform.position;
  groundBox = createBox(new THREE.Vector3(pPos.x, pPos.y, pPos.z), ZERO_QUATERNION, pSize.x, pSize.y, pSize.z, 0, 2);
  platformParts.push(groundBox);
  
  if(level.platform.ramps) {
    level.platform.ramps.forEach(ramp => {
      const quaternion = new THREE.Quaternion(0, 0, 0, 1);
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), ramp.angle.x);
      const rampBox = createBox(new THREE.Vector3(ramp.position.x, ramp.position.y, ramp.position.z), 
                                quaternion, ramp.size.x, ramp.size.y, ramp.size.z, 0);
      platformParts.push(rampBox);
    });
  }

  if(level.platform.walls) {
    level.platform.walls.forEach(wall => {
      const pWall = wall.position;
      const wallBody = createBox(new THREE.Vector3(pWall.x, pWall.y, pWall.z), ZERO_QUATERNION, wall.size.x, wall.size.y, wall.size.z, 0, 2);
      platformParts.push(wallBody);
      wallBody.body.tag = 'wall';
    });
  }

  platform = new THREE.Group();
  platform.add(groundBox.mesh);

  scene.add(platform);
}

function initZones() {
  const numCars = aiCars.length + playerCars.length;
  const zoneWidth = level.platform.size.x / numCars;
  const zoneLength = 25;
  const zonesWidth = numCars * zoneWidth;
  const xCenter = zonesWidth / 2 + zoneWidth / 2;
  const zCenter = level.platform.position.z + (level.platform.size.z + zoneLength) / 2;
  const start = xCenter - zonesWidth;
  let position = 0;
  cars.forEach((car, i) => {  
    if(car) {
      car.zone = createZone(start + position * zoneWidth, zCenter, zoneWidth, zoneLength, car.info.color);
      position++;
      platform.add(car.zone.mesh);
    }
  });    
}

function createZone(x, z, width, length, color) {
  const material = new THREE.MeshPhongMaterial({color: color});
  material.transparent = true;
  material.opacity = 0.8;
  const zone = createBox(new THREE.Vector3(x, level.platform.size.y / -2, z), ZERO_QUATERNION, width, level.platform.size.y, length, 0, 2, material);
  zone.label = getLabel(0, 0xFFFFFF, 256);
  zone.label.position.x = zone.mesh.position.x;
  zone.label.position.y = 0.1;
  zone.label.position.z = zone.mesh.position.z;
  scene.add(zone.label);
  return zone;
}

function initBoxes() {
  const size = level.boxes.size;
  const stacks = level.boxes.stacks;
  const height = level.boxes.height;
  const boxesPos = level.boxes.position;

  let spacing = size + 0.5;
  if(level.boxes.spacing)
    spacing = level.boxes.spacing;
  
  const rCars = cars.filter(n => n);
  const stacksArr = [];
  rCars.forEach((car, n) => {
    for(let i = 0; i < stacks; i++) {
      stacksArr.push(car);
    }
  });

  let length = (stacksArr.length + 1) * spacing;

  stacksArr.forEach((car, n) => {
    const material = car.chassisMesh.material;
    const xPosition = boxesPos.x - (length / 2) + spacing * (n + 1);
    for(let j = 0; j < height; j++) {
      const position = new THREE.Vector3(xPosition, boxesPos.y + size * j, boxesPos.z);
      const box = createBox(position, ZERO_QUATERNION, size, size, size, 10, null, material);
      box.body.tag = 'gameBox';
      car.boxes.push(box);
    }
  });
}

function getLabel(text, color, size) {
  const texture = getTextTexture(text, color, size, size + 20, size);
  const material = new THREE.MeshBasicMaterial({
    map : texture,
    transparent: true
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material);
  label.rotation.x = -Math.PI / 2;
  label.rotation.z = -Math.PI;    
  return label;
}

function getTextTexture(text, color, size, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width;
  const context = canvas.getContext("2d");

  context.font = size + "px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  return new THREE.CanvasTexture(canvas);
}

function initInfo() {
  let text = '';
  players.forEach((player, i) => {
    text += `<div style="color:${ player.car.info.color };">${Object.keys(keyActions[i])}</div>\n`;
  });
  document.querySelector('#info').innerHTML = text;
}

function destroy() { 
  Ammo.destroy(physicsWorld);
  Ammo.destroy(solver);
  Ammo.destroy(dispatcher);
  Ammo.destroy(collisionConfiguration);
  
  scene.traverse(obj => {
    disposeNode(obj);
  });
  scene = null;
  
  renderer.resetState();
  renderer.forceContextLoss();
  renderer.context = null;
  renderer.domElement = null;
  renderer && renderer.renderLists.dispose();
  renderer = null;
  
  players = [];
  aiDrivers = [];  
  remoteAI = {};
  aiCars = [];
  playerCars = [];
  cars = [];
  cameras = [];
  currentCam = 0;
}

function disposeNode(node) {
  if (node instanceof THREE.Mesh) {
    const geometry = node.geometry;
    if (geometry) {
      geometry.dispose();
    }

    const material = node.material;
    if (material) {
      if (Array.isArray(material)) {
        for (let i = 0, l = material.length; i < l; i++) {
          const m = material[i];
          m.dispose();
        }
      } else {
        material.dispose();
      }
    }
  }
}

function init() {
  audio.play('start');
  initPhysics();
  initScene();

  initCars();
  initPlatform();
  initZones();
  initBoxes();

  initPlayers(playerCars);
  initAI(aiCars);

  initKeyEvents();
  initInfo();
  startRenderer();

  startTimer();
}

window.start = () => start();

let ammoReady = false;

let levelSelected = -1;

function start() {
  document.querySelector('#container').innerHTML = 'Loading...';
  if(levelSelected < 0)
    levelSelected = document.querySelector('#levelSelect').value - 1;
  const kartEls = document.querySelectorAll('.driverSelectIcon');
  
  kartEls.forEach((kartEl, i) => {
    if(kartEl.classList.contains('keyboard')) {
      playerCars.push(i);
    }
    else if(kartEl.classList.contains('robot')) {
      aiCars.push(i);
      const aiSelectEl = kartEl.parentNode.querySelector('.aiSelect');
      const option = aiSelectEl.options[aiSelectEl.selectedIndex];
      if(option.dataset.type === 'remote') {
        remoteAI[i] = aiSelectEl.value;
      }
      else if(option.dataset.type === 'external') {
        externalAI[i] = { name: aiSelectEl.value, path: option.dataset.path };
      }
    }
  });
  
  level = levels[levelSelected];
  if(ammoReady) {
    init();
  }
  else {
    Ammo().then((Ammo) => {
      ammoReady = true;
      init();
    });
  }
}

const startButtonEl = document.querySelector('#startButton');
startButtonEl.innerHTML = 'Go Push!';
startButtonEl.disabled = false;