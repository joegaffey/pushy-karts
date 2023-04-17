import * as THREE from 'three';

export default class Car {
  
  DISABLE_DEACTIVATION = 4;

  chassisWidth = 1.8;
  chassisHeight = 0.6;
  chassisLength = 4;
  massVehicle = 800;

  wheelAxisPositionBack = -1;
  wheelRadiusBack = 0.4;
  wheelWidthBack = 0.3;
  wheelHalfTrackBack = 1;
  wheelAxisHeightBack = 0.3;

  wheelAxisFrontPosition = 1.7;
  wheelHalfTrackFront = 1;
  wheelAxisHeightFront = 0.3;
  wheelRadiusFront = 0.35;
  wheelWidthFront = 0.2;

  friction = 1000;
  suspensionStiffness = 20.0;
  suspensionDamping = 2.3;
  suspensionCompression = 4.4;
  suspensionRestLength = 0.6;
  rollInfluence = 0.2;

  steeringIncrement = 0.04;
  steeringClamp = 0.5;
  maxEngineForce = 2000;
  maxBreakingForce = 200;//100;
  
  vehicle;

  constructor(pos, quat, scene, physicsWorld, materialInteractive) {
    
    this.speed = 0;
    // Chassis
    this.materialInteractive = materialInteractive;
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    const geometry = new Ammo.btBoxShape(
      new Ammo.btVector3(
        this.chassisWidth * 0.5,
        this.chassisHeight * 0.5,
        this.chassisLength * 0.5
      )
    );
    
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    
    const motionState = new Ammo.btDefaultMotionState(transform);
    
    const localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(this.massVehicle, localInertia);
    
    const body = new Ammo.btRigidBody(
      new Ammo.btRigidBodyConstructionInfo(
        this.massVehicle,
        motionState,
        geometry,
        localInertia
      )
    );
    
    body.setActivationState(this.DISABLE_DEACTIVATION);
    this.physicsWorld.addRigidBody(body);
    this.chassisMesh = this.createChassisMesh(
      this.chassisWidth,
      this.chassisHeight,
      this.chassisLength
    );

    // Raycast Vehicle
    this.engineForce = 0;
    this.vehicleSteering = 0;
    this.breakingForce = 0;
    this.tuning = new Ammo.btVehicleTuning();
    this.rayCaster = new Ammo.btDefaultVehicleRaycaster(this.physicsWorld);
    this.vehicle = new Ammo.btRaycastVehicle(this.tuning, body, this.rayCaster);
    this.vehicle.setCoordinateSystem(0, 1, 2);
    this.physicsWorld.addAction(this.vehicle);
    
    // Wheels
    this.FRONT_LEFT = 0;
    this.FRONT_RIGHT = 1;
    this.BACK_LEFT = 2;
    this.BACK_RIGHT = 3;
    this.wheelMeshes = [];
    
    this.wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
    this.wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

    this.addWheel(
      true,
      new Ammo.btVector3(
        this.wheelHalfTrackFront,
        this.wheelAxisHeightFront,
        this.wheelAxisFrontPosition
      ),
      this.wheelRadiusFront,
      this.wheelWidthFront,
      this.FRONT_LEFT
    );
    this.addWheel(
      true,
      new Ammo.btVector3(
        -this.wheelHalfTrackFront,
        this.wheelAxisHeightFront,
        this.wheelAxisFrontPosition
      ),
      this.wheelRadiusFront,
      this.wheelWidthFront,
      this.FRONT_RIGHT
    );
    this.addWheel(
      false,
      new Ammo.btVector3(
        -this.wheelHalfTrackBack,
        this.wheelAxisHeightBack,
        this.wheelAxisPositionBack
      ),
      this.wheelRadiusBack,
      this.wheelWidthBack,
      this.BACK_LEFT
    );
    this.addWheel(
      false,
      new Ammo.btVector3(
        this.wheelHalfTrackBack,
        this.wheelAxisHeightBack,
        this.wheelAxisPositionBack
      ),
      this.wheelRadiusBack,
      this.wheelWidthBack,
      this.BACK_RIGHT
    );
  }

  createWheelMesh(radius, width) {
    const t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
    t.rotateZ(Math.PI / 2);
    const mesh = new THREE.Mesh(t, this.materialInteractive);
    mesh.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width * 1.5,
          radius * 1.75,
          radius * 0.25,
          1,
          1,
          1
        ),
        this.materialInteractive
      )
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  createChassisMesh(w, l, h) {
    const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    const mesh = new THREE.Mesh(shape, this.materialInteractive);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  addWheel(isFront, pos, radius, width, index) {
    const wheelInfo = this.vehicle.addWheel(
      pos,
      this.wheelDirectionCS0,
      this.wheelAxleCS,
      this.suspensionRestLength,
      radius,
      this.tuning,
      isFront
    );

    wheelInfo.set_m_suspensionStiffness(this.suspensionStiffness);
    wheelInfo.set_m_wheelsDampingRelaxation(this.suspensionDamping);
    wheelInfo.set_m_wheelsDampingCompression(this.suspensionCompression);
    wheelInfo.set_m_frictionSlip(this.friction);
    wheelInfo.set_m_rollInfluence(this.rollInfluence);

    this.wheelMeshes[index] = this.createWheelMesh(radius, width);
  }

  // Sync keybord actions and physics and graphics
  sync(actions) {
    if(!this.vehicle)
      return;
    this.speed = this.vehicle.getCurrentSpeedKmHour();

    // speedometer.innerHTML =
    //   (speed < 0 ? "(R) " : "") + Math.abs(speed).toFixed(1) + " km/h";

    this.breakingForce = 0;
    this.engineForce = 0;

    if (actions.acceleration) {
      if (this.speed < -1) 
        this.breakingForce = this.maxBreakingForce;
      else 
        this.engineForce = this.maxEngineForce;
    }
    if (actions.braking) {
      if (this.speed > 1) 
        this.breakingForce = this.maxBreakingForce;
      else 
        this.engineForce = -this.maxEngineForce / 2;
    }
    if (actions.left) {
      if (this.vehicleSteering < this.steeringClamp) 
        this.vehicleSteering += this.steeringIncrement;
    } 
    else 
    {
      if (actions.right) {
        if (this.vehicleSteering > -this.steeringClamp)
          this.vehicleSteering -= this.steeringIncrement;
      } else {
        if (this.vehicleSteering < -this.steeringIncrement)
          this.vehicleSteering += this.steeringIncrement;
        else {
          if (this.vehicleSteering > this.steeringIncrement)
            this.vehicleSteering -= this.steeringIncrement;
          else {
            this.vehicleSteering = 0;
          }
        }
      }
    }

    this.vehicle.applyEngineForce(this.engineForce, this.BACK_LEFT);
    this.vehicle.applyEngineForce(this.engineForce, this.BACK_RIGHT);

    this.vehicle.setBrake(this.breakingForce / 2, this.FRONT_LEFT);
    this.vehicle.setBrake(this.breakingForce / 2, this.FRONT_RIGHT);
    this.vehicle.setBrake(this.breakingForce, this.BACK_LEFT);
    this.vehicle.setBrake(this.breakingForce, this.BACK_RIGHT);

    this.vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_LEFT);
    this.vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_RIGHT);

    let tm, p, q, i;
    let n = this.vehicle.getNumWheels();
    for (i = 0; i < n; i++) {
      this.vehicle.updateWheelTransform(i, true);
      tm = this.vehicle.getWheelTransformWS(i);
      p = tm.getOrigin();
      q = tm.getRotation();
      this.wheelMeshes[i].position.set(p.x(), p.y(), p.z());
      this.wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
    }

    tm = this.vehicle.getChassisWorldTransform();
    p = tm.getOrigin();
    q = tm.getRotation();
    this.chassisMesh.position.set(p.x(), p.y(), p.z());
    this.chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
  }
}