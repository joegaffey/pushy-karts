import * as THREE from 'three';
// import * as Ammo from 'ammo';
import { OrbitControls } from 'orbitControls';
import { EffectComposer } from './lib/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from './lib/postprocessing/RenderPixelatedPass.js';
import Car from './Car.js';

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
  var materialDynamic, materialStatic, materialRed, materialBlue;

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
  var actionsBlue = {};
  var actionsRed = {};
  
  var keysActionsBlue = {
    "KeyW":'acceleration',
    "KeyS":'braking',
    "KeyA":'left',
    "KeyD":'right'
  };
  
  var keysActionsRed = {
    "ArrowUp":'acceleration',
    "ArrowDown":'braking',
    "ArrowLeft":'left',
    "ArrowRight":'right'
  };

  let composer;

  // - Functions -

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
    // console.log(dirLight.shadow.camera);
    scene.add( dirLight );
    
    // const helper = new THREE.CameraHelper( dirLight.shadow.camera );
    // scene.add( helper );

    materialDynamic = new THREE.MeshPhongMaterial( { color:0xfca400 } );
    materialStatic = new THREE.MeshPhongMaterial( { color:0x999999 } );
    materialRed = new THREE.MeshPhongMaterial( { color:0x990000 } );
    materialBlue = new THREE.MeshPhongMaterial( { color:0x000099 } );

    container.innerHTML = "";

    container.appendChild( renderer.domElement );

    composer = new EffectComposer( renderer );
    const renderPixelatedPass = new RenderPixelatedPass( 3, scene, camera );
    renderPixelatedPass.normalEdgeStrength = 0.2; 
    renderPixelatedPass.depthEdgeStrength = 0.2; 
    renderPixelatedPass.pixelAlignedPanning = true;
    composer.addPass( renderPixelatedPass );

    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'keydown', keydown);
    window.addEventListener( 'keyup', keyup);
  }

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );
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

  let carRed, carBlue, blueScore = 0, redScore = 0;
  
  function tick() {
    requestAnimationFrame( tick );
    var dt = clock.getDelta();
    for (var i = 0; i < syncList.length; i++)
      syncList[i](dt);
    if(carBlue)
      carBlue.sync(actionsBlue);
    if(carRed)
      carRed.sync(actionsRed);
    physicsWorld.stepSimulation( dt, 10 );
    controls.update( dt );

    let newBlueScore = getObjectsInsideCount(blueZone.mesh, blueBoxes);
    let newRedScore = getObjectsInsideCount(redZone.mesh, redBoxes);
    if(newBlueScore !== blueScore) {
      blueScore = newBlueScore;
      labelBlue.material.map = getTextTexture(newBlueScore, 'white', 256, 276, 256);
    }
    if(newRedScore !== redScore) {
      redScore = newRedScore;
      labelRed.material.map = getTextTexture(newRedScore, 'white', 256, 276, 256);
    }
    
    // const center = new THREE.Vector3();
    // center.addVectors(car1.chassisMesh.position, car2.chassisMesh.position).multiplyScalar(0.5);
    // camera.lookAt(center);
    
    renderer.render( scene, camera );
    // composer.render();
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
    if(keysActionsBlue[e.code]) {
      actionsBlue[keysActionsBlue[e.code]] = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if(keysActionsRed[e.code]) {
      actionsRed[keysActionsRed[e.code]] = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  function keydown(e) {
    if(keysActionsBlue[e.code]) {
      actionsBlue[keysActionsBlue[e.code]] = true;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if(keysActionsRed[e.code]) {
      actionsRed[keysActionsRed[e.code]] = true;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
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

  const redBoxes = [];
  const blueBoxes = [];
  let redZone, blueZone, labelRed, labelBlue;
  
  
  function createObjects() {

    const groundBox = createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 50, 1, 50, 0, 2);
    
    var quaternion = new THREE.Quaternion(0, 0, 0, 1);
    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
    const rampBox = createBox(new THREE.Vector3(0, 0.5, 0), quaternion, 8, 0.5, 10, 0);

    var size = .75;
    var nw = 8;
    var nh = 6;
    for (var j = 0; j < nw; j++) {
      for (var i = 0; i < nh; i++) {
        let material = materialRed;
        if(j % 2)
          material = materialBlue;
        const box = createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10, null, material);
        if(j % 2)
          blueBoxes.push(box.mesh);
        else 
          redBoxes.push(box.mesh);
      }
    }
    
    blueZone = createBox(new THREE.Vector3(12.5, -0.5, 37.5), ZERO_QUATERNION, 25, 1, 25, 0, 2, materialBlue);  
    labelBlue = getLabel(0, 'white', 256)
    labelBlue.position.x = blueZone.mesh.position.x;
    labelBlue.position.y = 0.1;
    labelBlue.position.z = blueZone.mesh.position.z;
    scene.add(labelBlue); 
    
    redZone = createBox(new THREE.Vector3(-12.5, -0.5, 37.5), ZERO_QUATERNION, 25, 1, 25, 0, 2, materialRed);
    labelRed = getLabel(0, 'white', 256)
    labelRed.position.x = redZone.mesh.position.x;
    labelRed.position.y = 0.1;
    labelRed.position.z = redZone.mesh.position.z;
    scene.add(labelRed);
    
    try {
      carBlue = new Car(new THREE.Vector3(-2, 4, -15), ZERO_QUATERNION, scene, physicsWorld, materialBlue);
      carRed = new Car(new THREE.Vector3(2, 4, -15), ZERO_QUATERNION, scene, physicsWorld, materialRed);
    }
    catch(e) {console.error(e)}
    
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
  createObjects();
  tick();

});