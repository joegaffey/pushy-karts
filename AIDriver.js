import * as THREE from 'three';

import Car from 'Car';

export default class AIDriver {
  
  STATES = {
    seek: 'seek',
    reverse: 'reverse',
    wait: 'wait',
    backOff: 'backoff'
  };
  
  constructor(car, bounds) {
    this.car = car;
    this.car.ai = this;
    this.bounds = bounds;
    this.zoneBounds = this.car.getZoneBounds();
    this.state = this.STATES.seek;
    
    window.ai = this;
  }

  step() {
    this.carPosition = this.car.getPosition();
    this.carRotation = this.car.getHeading();
    
    // console.log(this.state)
               
    this.actions = {};
    if(this.state === this.STATES.seek)
      this.seek();
    else if(this.state === this.STATES.reverse)
      this.reverse();
    else if(this.state === this.STATES.backOff)
      this.backOff();
    else if(this.state === this.STATES.wait)
      this.stop();
  }
  
  angleBetween(p1, p2) { 
    let angle = Math.atan2(p2.y - p1.y , p2.x - p1.x);
    // if (angle < 0 ) {
    //    angle += Math.PI * 2;
    // }
    return angle * 180 / Math.PI;
  }
  
  // angleBetween(p1, p2) { 
  //   const v1 = new THREE.Vector2(p1.x, p1.y);
  //   const v2 = new THREE.Vector2(p2.x, p2.y);
  //   let angle = v1.angleTo(v2);
  //   // if (angle < 0 ) {
  //   //    angle += Math.PI * 2;
  //   // }
  //   return angle * 180 / Math.PI;
  // }
  
  crashCar() {
    if(this.state === this.STATES.seek) {
      this.state = this.STATES.reverse;
      setTimeout(() => { this.state = this.STATES.seek; }, 2000 * Math.random());
    }
  }
  
  crashWall() {
    if(this.state === this.STATES.seek) {
      this.state = this.STATES.reverse;
      setTimeout(() => { this.state = this.STATES.seek; }, 2000 * Math.random());
    }
    else 
      this.state = this.STATES.seek;
  }

  seek() {   
    if(!this.target)
      this.target = this.getTarget();
    
    const distToTarget = this.carPosition.distanceTo(this.target);
    
    // console.log('distToTarget', distToTarget);
    
    this.driveTowards(this.target, distToTarget);    
  }
  
  getAngleToTarget(targetPosition) {
    return -90 + this.angleBetween({x: this.carPosition.x, y: this.carPosition.z},
                                   {x: targetPosition.x, y: targetPosition.z});
  }
  
  driveTowards(targetPosition, distance) {
    
    const angleToTarget = this.getAngleToTarget(targetPosition);
    
    // console.log('angleToTarget', angleToTarget);
    // console.log('carRotation', this.carRotation);
    // console.log('distance', distance)
    
    if(distance < 5) {
      this.lastTarget = this.target;
      this.target = this.getTarget();
      this.state = this.STATES.wait;
      setTimeout(() => { 
        this.state = this.STATES.seek;
      }, 1000);
      return;
    }
     
    // const deltaAngle = this.getDeltaAngle(angleToTarget, this.carRotation); 
    // console.log('deltaAngle', deltaAngle)  
    
    // console.log(Math.abs(angleToTarget + this.carRotation))
    
     let angle = Math.abs(angleToTarget + this.carRotation);
      if(angle > 180)
        angle = angle - 360;
    
    if(angle > 120)
      this.state = this.STATES.backOff;
    
    const maxDelta = 5;
     
    if(angleToTarget > this.carRotation + maxDelta) {
      this.advanceRight();
    }
    else if(angleToTarget < this.carRotation - maxDelta) {
      this.advanceLeft();
    }
    else { 
      this.advance();
    }
  }
  
  getDeltaAngle(a1, a2) {
    // console.log('a1', a1)
    // console.log('a2', a2)
    return 180 - Math.abs(Math.abs(a1 - a2) - 180);
  }
  
  backOff() {
    if(this.target) {
      const angleToTarget = this.getAngleToTarget(this.target);
      
      //console.log(Math.abs(angleToTarget + this.carRotation))
      
      let angle = Math.abs(angleToTarget + this.carRotation);
      if(angle > 180)
        angle = angle - 360;
            
      if(Math.abs(angle) > 110) {
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

  getTarget() {
    // console.log('this.target', this.target)
    // console.log(this.getBoxDistances())    
    
    let target = this.car.getZonePosition();
    const distToTarget = this.carPosition.distanceTo(target);

    if(distToTarget < 8)
      target = new THREE.Vector3(0, 0, 0);
    
    console.log('New target', target);
    
    return target;
  }
  
  getBoxDistances() {
    const boxDistances = [];
    this.car.boxes.forEach(box => {
      const distance = this.carPosition.distanceTo(box.position);
      boxDistances.push({distance: distance, box: box});
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