import * as THREE from 'three';
import { OrbitControls } from 'orbitControls';

import Car from './Car.js';
import AIDriver from './AIDriver.js';
import Player from './Player.js';

Ammo().then(function(Ammo) {

  // - Global variables -
  var DISABLE_DEACTIVATION = 4;
  var TRANSFORM_AUX = new Ammo.btTransform();
  var ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

  // Graphics variables
  var container, speedometer;
  var camera, controls, scene, renderer;
  var terrainMesh, texture;
  var clock = new THREE.Clock();
  var materialDynamic, materialStatic;

  // Physics variables
  var collisionConfiguration;
  var dispatcher;
  var broadphase;
  var solver;
  var physicsWorld;

  var syncList = [];
  var time = 0;
  var objectTimePeriod = 3;
  var timeNextSpawn = time + objectTimePeriod;
  var maxNumObjects = 30;

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
      "KeyJ":'braking',
      "KeyK":'left',
      "KeyL":'right'
    }, 
    {
      "Numpad5":'acceleration',
      "Numpad1":'braking',
      "Numpad2":'left',
      "Numpad3":'right'
    }
  ];
  
  const players = [];
  const aiDrivers = [];
  const cars = [];
  const colors = [0x000099, 0x990000, 0x009900,  0x990099]; 
  
  let platform, groundBox;

  function initGraphics() {

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

    materialDynamic = new THREE.MeshPhongMaterial( { color:0xfca400 } );
    materialStatic = new THREE.MeshPhongMaterial( { color:0x999999 } );

    container.innerHTML = "";

    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
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
      
    aiCars.forEach((car, i) => {
      console.log(bounds)
      aiDrivers.push(new AIDriver(car, bounds));
    });
  }
  
  function initCars(cColors) {
    const xStart = cColors.length * 2;
    cColors.forEach((c, i) => {
      const material = new THREE.MeshPhongMaterial({color: c});
      const xPos = xStart + ((i + 0.5) * -4);
      const car = new Car(new THREE.Vector3(xPos, 4, -16), ZERO_QUATERNION, scene, physicsWorld, material);
      car.color = c;
      cars.push(car);
    });
  }

  function initPlayers(pCars) {
    pCars.forEach((car, i) => {
      players.push(new Player(car, keyActions[i]));
    });
  }
  
  function tick() {
    requestAnimationFrame( tick );
    var dt = clock.getDelta();
    
    for (var i = 0; i < syncList.length; i++)
      syncList[i](dt);
    
    players.forEach(p => {  p.car.sync(p.actions); });

    aiDrivers.forEach(ai => { 
      ai.step(); 
      ai.car.sync(ai.actions);
    });
    
    physicsWorld.stepSimulation( dt, 10 );
    controls.update( dt );

    cars.forEach(car => {
      let newScore = getObjectsInsideCount(car.zone.mesh, car.boxes);
      if(newScore !== car.score) {
        car.score = newScore;
        car.zone.label.material.map = getTextTexture(newScore, 'white', 256, 276, 256);
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
  
  function getCenterPoint(object) {
    var center = new THREE.Vector3();
    object.boundingBox.getCenter( center );
    object.localToWorld( center );
    return center;
  }

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
      material = mass > 0 ? materialDynamic : materialStatic;
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
    
    const platformWidth = 50;
    const platformLength = 50;
    groundBox = createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, platformWidth, 1, platformLength, 0, 2);
    
    var quaternion = new THREE.Quaternion(0, 0, 0, 1);
    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
    const rampBox = createBox(new THREE.Vector3(0, 0.5, 0), quaternion, 8, 0.5, 10, 0);
    
    platform = new THREE.Group();
    platform.add(groundBox.mesh);
    
    const zoneWidth = platformWidth / cars.length;
    const zoneLength = 25;
    const zonesWidth = cars.length * zoneWidth;
    const xCenter = zonesWidth / 2 + zoneWidth / 2;
    const zCenter = 37.5;
    const start = xCenter - zonesWidth;
    
    cars.forEach((car, i) => {  
      car.zone = createZone(start + i * zoneWidth, zCenter, zoneWidth, zoneLength, car.color);
      platform.add(car.zone.mesh);
    });
    
    scene.add(platform);
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
  
  function initBoxes(nw, nh) {
    const size = .75;
    
    for (let j = 0; j < nw; j++) {
      for (let i = 0; i < nh; i++) {
        let car = cars[j % cars.length];
        let material = car.chassisMesh.material;
        const box = createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10, null, material);
        car.boxes.push(box.mesh);
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

  // - Init -
  initGraphics();
  initPhysics();
  initCars([colors[0], colors[1]]);
  // initCars(colors);
  initPlatform();
  initBoxes(8, 6);
  initPlayers(cars);
  // initAI(cars);
  tick();
});