import * as THREE from 'three';
import { OrbitControls } from 'orbitControls';

import Car from 'Car';
import debug from 'debug';
import AIDriver from 'AIDriver';
import Player from 'Player';
import levels from 'levels';

Ammo().then((Ammo) => {

  // - Global variables -
  const DISABLE_DEACTIVATION = 4;
  const TRANSFORM_AUX = new Ammo.btTransform();
  const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

  // Graphics variables
  let container, speedometer;
  let camera, controls, scene, renderer;
  let terrainMesh, texture;
  let clock = new THREE.Clock();  
  let platformMaterial;

  // Physics variables
  let collisionConfiguration;
  let dispatcher;
  let broadphase;
  let solver;
  let physicsWorld;

  const syncList = [];
  let time = 0;
  const objectTimePeriod = 3;
  let timeNextSpawn = time + objectTimePeriod;
  const maxNumObjects = 30;
  
  // Keybord actions
  const keyActions = [ {
      "KeyW":'acceleration',
      "KeyS":'braking',
      "KeyA":'left',
      "KeyD":'right'
    }, 
    {
      "ArrowUp":'acceleration',
      "ArrowDown":'braking',
      "ArrowLeft":'left',
      "ArrowRight":'right'
    }, 
    {
      "KeyI":'acceleration',
      "KeyK":'braking',
      "KeyJ":'left',
      "KeyL":'right'
    }, 
    {
      "Numpad5":'acceleration',
      "Numpad2":'braking',
      "Numpad1":'left',
      "Numpad3":'right'
    }
  ];
  
  const players = [];
  const aiDrivers = [];
  const cars = [];
  let colors = ['#000099', '#990000', '#009900',  '#990099']; 
  
  let platform, groundBox;
  
  function initScene() {

    container = document.getElementById( 'container' );
    speedometer = document.getElementById( 'speedometer' );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    camera.position.x = 0;
    camera.position.y = 30;
    camera.position.z = -30;
    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.shadowMap.enabled = true;
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    controls = new OrbitControls(camera, renderer.domElement);

    var ambientLight = new THREE.AmbientLight( 0x404040 );
    scene.add( ambientLight );

    var dirLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
    dirLight.position.set( 50, 50, -50 );
    dirLight.castShadow = true;
		dirLight.shadow.mapSize.set( 2048, 2048 );
    dirLight.shadow.camera.zoom = 0.1;
    scene.add( dirLight );
    
    // const helper = new THREE.CameraHelper( dirLight.shadow.camera );
    // scene.add( helper );

    platformMaterial = new THREE.MeshPhongMaterial({ color:0x999999 });

    container.innerHTML = "";

    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
  }
  
  function initKeyEvents() {
    window.addEventListener( 'keydown', keydown);
    window.addEventListener( 'keyup', keyup);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
  
  function initPhysics() {
    // Physics configuration
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    physicsWorld.setGravity( new Ammo.btVector3( 0, -9.82, 0 ) );
  }  
  
  function initAI(aiCars) {
    const bounds = new THREE.Box3().setFromObject(platform);
    const border = 8;
    bounds.min.x += border;
    bounds.min.y = -100;
    bounds.min.z += border;
    bounds.max.x -= border;
    bounds.max.y = 100;
    bounds.max.z -= border;
      
    aiCars.forEach(car => {
      aiDrivers.push(new AIDriver(cars[car], bounds));
    });
  }
  
  function initCars(cColors) {
    const lPos = level.cars.position;
    const numCars = playerCars.length + aiCars.length;
    const xStart = numCars * 2;
    let position = 0;
    cColors.forEach((color, i) => {
      if(playerCars.includes(i) || aiCars.includes(i)) {
        const material = new THREE.MeshPhongMaterial({color: color});
        const xPos = xStart + ((position + 0.5) * -4);
        const car = new Car(new THREE.Vector3(lPos.x + xPos, lPos.y + 4, lPos.z), ZERO_QUATERNION, scene, physicsWorld, material);
        car.color = color;
        car.index = i;
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
      players.push(new Player(cars[car], keyActions[i]));
    });
  }
  
  function tick() {
    requestAnimationFrame(tick);
    var dt = clock.getDelta();
    
    for (var i = 0; i < syncList.length; i++)
      syncList[i](dt);
    
    players.forEach(p => {  p.car.sync(p.actions); });

    aiDrivers.forEach(ai => { 
      ai.step(); 
      ai.car.sync(ai.actions);
    });
    
    physicsWorld.stepSimulation( dt, 10 );
    detectCollision();
    
    controls.update( dt );

    cars.forEach(car => {
      if(car) {
        let newScore = getObjectsInsideCount(car.zone.mesh, car.boxes);
        if(newScore !== car.score) {
          car.score = newScore;
          car.zone.label.material.map = getTextTexture(newScore, 'white', 256, 276, 256);
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
    
    renderer.render( scene, camera );
    time += dt;
  }
  
  function detectCollision() {
    cars.forEach(car => {
      if(car)
        physicsWorld.contactTest(car.chassisBody , cbContactResult );
    });
  }
  
  let cbContactResult;
  setupContactResultCallback();
  
  //https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef
  //https://gist.github.com/BlueMagnificent/5748bd9588120489634f07c399b795f9
  function setupContactResultCallback(){

    cbContactResult = new Ammo.ConcreteContactResultCallback();

    cbContactResult.addSingleResult = (cp, colObj0Wrap, partId0, index0, colObj1Wrap, partId1, index1) => {
      let contactPoint = Ammo.wrapPointer( cp, Ammo.btManifoldPoint );
      const distance = contactPoint.getDistance();
      if( distance > 0 ) 
        return;

      let colWrapper0 = Ammo.wrapPointer(colObj0Wrap, Ammo.btCollisionObjectWrapper);
      let rb0 = Ammo.castObject(colWrapper0.getCollisionObject(), Ammo.btRigidBody);
      
      let colWrapper1 = Ammo.wrapPointer(colObj1Wrap, Ammo.btCollisionObjectWrapper);
      let rb1 = Ammo.castObject(colWrapper1.getCollisionObject(), Ammo.btRigidBody);
      
      if(rb0.tag && rb0.tag === 'chassis') {
        if(rb1.tag) {
          if(rb1.tag === 'chassis') {
            if(rb0.car.ai)
              rb0.car.ai.crash();
          }
          else if(rb1.tag === 'wall') {
            rb0.car.ai.crash();
          }
        }
      }
    }
  }
  
  function getObjectsInsideCount(object, objects) {
    let count = 0;
    const bb = new THREE.Box3().setFromObject(object);
    bb.max.y = 10;
      
    objects.forEach(ob => {
      if(bb.containsPoint(ob.position))
        count++;
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
    players.forEach(p => {
      p.keyUp(e);
    });
  }
  
  function keydown(e) {
    players.forEach(p => {
      p.keyDown(e);
    });
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
    scene.add( box.mesh );

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
    box.body = new Ammo.btRigidBody(rbInfo);

    box.body.setFriction(friction);
    //body.setRestitution(.9);
    //body.setDamping(0.2, 0.2);

    physicsWorld.addRigidBody( box.body );

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
    
    if(level.platform.ramps) {
      level.platform.ramps.forEach(ramp => {
        const quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        const rampBox = createBox(new THREE.Vector3(ramp.x, ramp.y, ramp.z), quaternion, 8, 0.5, 10, 0);
      });
    }
    
    if(level.platform.walls) {
      level.platform.walls.forEach(wall => {
        const pWall = wall.position;
        const wallBody = createBox(new THREE.Vector3(pWall.x, pWall.y, pWall.z), ZERO_QUATERNION, wall.size.x, wall.size.y, wall.size.z, 0, 2);
        wallBody.tag = 'wall';
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
        car.zone = createZone(start + position * zoneWidth, zCenter, zoneWidth, zoneLength, car.color);
        position++;
        platform.add(car.zone.mesh);
      }
    });    
  }
  
  function createZone(x, z, width, length, color) {
    const material = new THREE.MeshPhongMaterial({color: color});
    material.transparent = true;
    material.opacity = 0.82;
    const zone = createBox(new THREE.Vector3(x, -0.5, z), ZERO_QUATERNION, width, 1, length, 0, 2, material);
    zone.label = getLabel(0, 0xFFFFFF, 256);
    zone.label.position.x = zone.mesh.position.x;
    zone.label.position.y = 0.1;
    zone.label.position.z = zone.mesh.position.z;
    scene.add(zone.label);
    return zone;
  }
  
  function initBoxes() {
    const size = .75;    
    const nw = level.boxes.width, nh = level.boxes.height;
    const bPos = level.boxes.position;
    
    let xPosition = 0;
    const numCars = aiCars.length + playerCars.length;
    
    for (let j = 0; j < nw; j++) {
      let car = cars[j % cars.length];
      if(car) {
        for (let i = 0; i < nh; i++) {
          let material = car.chassisMesh.material;
          const box = createBox(new THREE.Vector3(bPos.x + size * xPosition - (numCars * size / 2), 
                                                  bPos.y + size * i, 
                                                  bPos.z), 
                                ZERO_QUATERNION, size, size, size, 10, null, material);
          car.boxes.push(box.mesh);
        }
        xPosition++;
      }
    }
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
      text += `<div style="color:${player.car.color};">${Object.keys(keyActions[i])}</div>\n`;
    });
    document.querySelector('#info').innerHTML = text;
  }
  
  function destroy() {
    //@TODO
  }
  
  const aiCars = [];
  const playerCars = [];

  function init() {
    initScene();
    initPhysics();
    
    initCars(colors);
    initPlatform();
    initZones();
    initBoxes();
    
    initPlayers(playerCars);
    initAI(aiCars);
    
    initKeyEvents();
    initInfo();
    tick();
  }
  
  let level = levels[0];
  // debug.on();
  
  window.start = () => {
    document.querySelector('#container').innerHTML = 'Loading...';
    const levelSelected = document.querySelector('#levelSelect').value - 1;
    const kartEls = document.querySelectorAll('.kartSelect > span');
    kartEls.forEach((kartEl, i) => {
      if(kartEl.classList.contains('person'))
        playerCars.push(i);
      else if(kartEl.classList.contains('robot'))
        aiCars.push(i);
    });
    level = levels[levelSelected];
    init();
  }
  
  document.querySelector('#startButton').innerHTML = 'Go!';
  document.querySelector('#startButton').disabled = false;
});