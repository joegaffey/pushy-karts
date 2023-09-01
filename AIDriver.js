import * as THREE from 'three';

import Car from 'Car';
import debug from 'debug';

export default class AIDriver {
  
  STATES = {
    seeking: 'seeking',
    reversing: 'reversing'
  };
  
  constructor(car, bounds) {
    this.car = car;
    this.car.ai = this;
    this.bounds = bounds;
    this.zoneBounds = this.car.getZoneBounds();
    this.state = this.STATES.seeking;
  }

  step() {
    this.carPosition = this.car.getPosition();
    this.carRotation = this.car.getHeading();
        
    // if(this.carRotation < 0)  // Convert to 0...360
    //   this.carRotation = 360 + this.carRotation;
    
    if(this.car.index === 0)
      debug.clear();
    else
      debug.w(' ');
    debug.color(this.car.color);
        
    this.actions = {};
    if(this.state === this.STATES.seeking)
      this.seek();
    else if(this.state === this.STATES.reversing)
      this.reverse();
  }
  
  angleBetween(p1, p2) { 
    let angle = Math.atan((p2.x-p1.x)/(p2.y-p1.y)) * -180 / Math.PI;
    // if(angle < 0)  // Convert to 0...360
    //   angle = 360 + angle;
    return angle;
  }
  
  crashCar() {
    if(this.state === this.STATES.seeking) {
      this.state = this.STATES.reversing;
      setTimeout(() => { this.state = this.STATES.seeking; }, 2000 * Math.random());
    }
  }
  
  crashWall() {
    if(this.state === this.STATES.seeking)
      this.state = this.STATES.reversing;
    else 
      this.state = this.STATES.seeking;
  }

  seek() {   
    if(!this.target)
      this.target = this.getTarget();
    
    const distToTarget = this.carPosition.distanceTo(this.target);
    
    // console.log('distToTarget', distToTarget);
    
    debug.w('distToTarget ' + Math.round(distToTarget));
    
    this.driveTowards(this.target, distToTarget);    
  }
  
  driveTowards(targetPosition, distance) {
    
    const angleToTarget = this.angleBetween({x: this.carPosition.x, y: this.carPosition.z},
                                            {x: targetPosition.x, y: targetPosition.z});
    
    // console.log('angleToTarget', angleToTarget);
    // console.log('carRotation', this.carRotation);
    // console.log('distance', distance)
    
    debug.w('carPosition.x ' + Math.round(this.carPosition.x) + ' carPosition.z ' + Math.round(this.carPosition.z));
    debug.w('targetPosition.x ' + Math.round(targetPosition.x) + ' targetPosition.z ' + Math.round(targetPosition.z));
    debug.w('angleToTarget ' + Math.round(angleToTarget));
    debug.w('carRotation ' + Math.round(this.carRotation));
    
    if(distance < 5) {
      this.stop();
      setTimeout(() => { this.target = this.getTarget(); }, 1000);
      return;
    }
  
    const maxDelta = 4;
    
    const deltaAngle = this.getDeltaAngle(angleToTarget, this.carRotation); 
    // console.log('deltaAngle', deltaAngle)
    
    if(deltaAngle > 120) {
      if(angleToTarget > this.carRotation + maxDelta)
        this.reverseLeft();
      else if(angleToTarget < this.carRotation - maxDelta)
        this.reverseRight();
      else
        this.reverse();
      return;
    }
     
    if(angleToTarget > this.carRotation + maxDelta) {
      this.goRight();
    }
    else if(angleToTarget < this.carRotation - maxDelta) {
      this.goLeft();
    }
    else { 
      this.go();
    }
  }
  
  getDeltaAngle(a1, a2) {
    return 180 - Math.abs(Math.abs(a1 - a2) - 180);
  }
  
  checkPlatformBounds() {
    if(this.bounds.containsPoint(this.carPosition)) {
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

  getTarget() {
    // console.log('this.target', this.target)
    
    let target = this.car.getZonePosition();
    if(this.target === target)
      target = new THREE.Vector3(0, 0, 0);
    
    console.log('New target', target)
    
    return target;
  }

  stop() {
    debug.w('stop()');
    this.actions = { 'braking': true };
  }
  
  reverse() {
    debug.w('reverse()');
    // if(!this.checkPlatformBounds()) {
    //   this.state === this.STATES.seeking;
    //   return;
    // }    
    this.actions = {'reversing': true };
  }

  go() {
    debug.w('go()');
    // if(!this.checkPlatformBounds()) {
    //   this.state === this.STATES.reversing;
    //   return;
    // }    
    this.actions = {'acceleration': true };
  }
  
  goLeft() {
    debug.w('goLeft()');
    this.actions = {
      'acceleration': true,
      'left': true
    };
  }
  
  goRight() {
    debug.w('goRight()');
    this.actions = {
      'acceleration': true,
      'right': true
    };
  }
    
  reverseLeft() {
    debug.w('reverseLeft()');
    this.actions = {
      'reversing': true,
      'left': true
    };
  }
  
  reverseRight() {
    debug.w('reverseRight()');
    this.actions = {
      'reversing': true,
      'right': true
    };
  }
}