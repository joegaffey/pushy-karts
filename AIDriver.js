import * as THREE from 'three';

import Car from 'Car';

export default class AIDriver {
  
  STATES = {
    seek: 'seek',
    wait: 'wait',
    backOff: 'backoff',
    reverse: 'reverse'
  };
    
  constructor(car, bounds) {
    this.car = car;
    this.car.ai = this;
    this.bounds = bounds;
    this.zoneBounds = this.car.getZoneBounds();
    this.state = this.STATES.seek;
    this.setTarget();
    
    // Customize the AI via these properties 
    this.maxOffsetAngle = 10;    // Maximum angle offset to target before driver corrects
    this.backoffTimeout = 2000;  // Wait to end a backoff
    this.minTargetDistance = 5;  // Arrival distance from trget 
    this.targetBorder = 8;      // Min distance from platformedge to place targets
    this.boxStopDistance = 10;   // Z distance to stop before a box 
    this.turnAroundAngle = 110;  // Max angle to target before AI turns around 
    
    // window.ai = this; // Debugging purposes
  }

  step() {
    this.carPosition = this.car.getPosition();
    this.carRotation = this.car.getHeading();
    
    // console.log(this.car.info.name, this.state)
               
    this.actions = {};
    if(this.state === this.STATES.seek)
      this.seek();
    else if(this.state === this.STATES.backOff)
      this.backOff();
    else if(this.state === this.STATES.reverse)
      this.reverse();
    else if(this.state === this.STATES.wait)
      this.stop();
  }
  
  angleBetween(p1, p2) { 
    let angle = Math.atan2(p2.y - p1.y , p2.x - p1.x);
    angle *= 180 / Math.PI;
    return this.clamp180(angle);
  }
  
  // angleBetween(p1, p2) { 
  //   const v1 = new THREE.Vector2(p1.x, p1.y);
  //   const v2 = new THREE.Vector2(p2.x, p2.y);
  //   let angle = v1.angleTo(v2);
  //   if (angle < 0 ) {
  //      angle += Math.PI * 2;
  //   }
  //   return angle * 180 / Math.PI;
  // }
  
  crashCar() {
    if(this.state === this.STATES.seek) {
      this.state = this.STATES.reverse;
      setTimeout(() => { this.state = this.STATES.seek; }, this.backoffTimeout * Math.random());
    }
  }
  
  crashWall() {
    if(this.state === this.STATES.seek) {
      this.state = this.STATES.backOff;
      setTimeout(() => { this.state = this.STATES.seek; }, this.backoffTimeout * Math.random());
    }
    else 
      this.state = this.STATES.seek;
  }

  seek() {   
    if(!this.target)
      this.setTarget();
    
    const distToTarget = this.carPosition.distanceTo(this.target);
    
    // console.log('distToTarget', distToTarget);
    
    this.driveTowards(this.target, distToTarget);    
  }
  
  getAngleToTarget(targetPosition) {
    let angle = -90 + this.angleBetween({x: this.carPosition.x, y: this.carPosition.z},
                                          {x: targetPosition.x, y: targetPosition.z});
    return this.clamp180(angle);
  }
  
  getRelativeAngleToTarget(targetPosition) {
    return getAngleToTarget(targetPosition);
  }
  
  driveTowards(tp, distance) {
    let cr = this.carRotation;
    const cp = this.carPosition;
    
    let angleToTarget = this.getAngleToTarget(tp);
        
    if(distance < this.minTargetDistance) {
      this.state = this.STATES.wait;
      setTimeout(() => {
        this.setTarget();
        this.state = this.STATES.seek;
      }, 1000);
      return;
    }

    if(cp.z < tp.z) { // Target is north of car
      if(cr - this.maxOffsetAngle > -90 && cr + this.maxOffsetAngle < 90) { // Car is north facing
        if(angleToTarget > cr + this.maxOffsetAngle) {
          this.advanceRight();
        }
        else if(angleToTarget < cr - this.maxOffsetAngle) { 
          this.advanceLeft();
        }
        else { 
          this.advance();
        }
      }
      else {  // Car is south facing
        if(cp.x > 0)
          this.reverseRight();
        else
          this.reverseLeft();
      }
    }
    else {  // Target is south of car
      if(cr + this.maxOffsetAngle > 90 || cr - this.maxOffsetAngle < -90) { // Car is south facing
        
        // Flip coordinate space
        if(cr > 0) { cr -= 180; } else { cr += 180; }
        if(angleToTarget > 0) { angleToTarget -= 180; } else { angleToTarget += 180; }
        
        if(angleToTarget > cr + this.maxOffsetAngle) {
          this.advanceRight();
        }
        else if(angleToTarget < cr - this.maxOffsetAngle) {
          this.advanceLeft();
        }
        else { 
          this.advance();
        }
      }
      else { // Car is north facing
        if(cp.x < 0)
          this.reverseRight();
        else
          this.reverseLeft();
      }
    }
  }
  
  getDeltaAngle(a1, a2) {
    // console.log('a1', a1)
    // console.log('a2', a2)
    return 180 - Math.abs(Math.abs(a1 - a2) - 180);
  }
  
  clamp180(angle) {
    if (angle > 180) { angle = -360 + angle; } 
    else if (angle < -180) { angle = 360 + angle; }
    return angle;
  }
  
  backOff() {
    if(this.target) {
      const angleToTarget = this.getAngleToTarget(this.target);
      
      let angle = this.clamp180(angleToTarget + this.carRotation);
      
      if(Math.abs(angle) > this.turnAroundAngle) {  
        // Turn around
        if(angleToTarget + this.carRotation > 0)
          this.reverseLeft();
        else
          this.reverseRight();
      }
      else 
        this.state = this.STATES.seek;
    }
    else 
      this.state = this.STATES.seek;
  }
  
  checkPlatformBounds(point) {
    if(this.bounds.containsPoint(point)) {
      return true;
    } 
    return false;
  }
  
  checkZoneBounds(point) {
    if(this.zoneBounds.containsPoint(point)) {
      return true;
    } 
    return false;
  }

  setTarget() {
    if(this.target)
      this.lastTarget = this.target;
    else {
      this.target = new THREE.Vector3(0, 0, 0);
      this.target.name = 'center';
      
      this.lastTarget = { name: 'none'};
      return;
    }
        
    if(this.lastTarget.name === 'zone') {
      let x = this.bounds.min.x + this.targetBorder;
      if(this.carPosition.x > 0)
        x = this.bounds.max.x - this.targetBorder;
      let z = this.bounds.min.z + this.targetBorder;
      
      this.target = new THREE.Vector3(x, 0, z);
      this.target.name = 'corner';
    }
    else if(this.lastTarget.name === 'corner' || this.lastTarget.name === 'center') {
      this.target = this.getBoxDistances()[0].box.position;
      this.target.name = 'box';
      
    }
    else if(this.lastTarget.name === 'box') {
      this.target = this.car.getZonePosition();
      this.target.z -= this.boxStopDistance;
      this.target.name = 'zone';
    }
    
    console.log(this.car.info.name, 'target', this.target);
  }
  
  getBoxDistances() {
    const boxDistances = [];
    this.car.boxes.forEach(box => {
      const distance = this.carPosition.distanceTo(box.mesh.position);
      boxDistances.push({distance: distance, box: box.mesh});
    });
    boxDistances.sort((a, b) => a.distance - b.distance);
    return boxDistances;
  }

  stop() {
    this.actions = { 'braking': true };
  }
  
  reverse() {
    this.actions = {'reversing': true };
  }

  advance() {
    this.actions = {'acceleration': true };
  }
  
  advanceLeft() {
    this.actions = {
      'acceleration': true,
      'left': true
    };
  }
  
  advanceRight() {
    this.actions = {
      'acceleration': true,
      'right': true
    };
  }
    
  reverseLeft() {
    this.actions = {
      'reversing': true,
      'left': true
    };
  }
  
  reverseRight() {
    this.actions = {
      'reversing': true,
      'right': true
    };
  }
}