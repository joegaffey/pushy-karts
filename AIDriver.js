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
    this.setTarget();
    
    window.ai = this;
  }

  step() {
    this.carPosition = this.car.getPosition();
    this.carRotation = this.car.getHeading();
    
    // console.log(this.car.info.name, this.state)
               
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
    angle *= 180 / Math.PI;
    if (angle > 180) {
      angle = -360 + angle;
    }
    else if (angle < -180) {
      angle = 360 + angle;
    }
    return angle;
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
      this.setTarget();
    
    const distToTarget = this.carPosition.distanceTo(this.target);
    
    // console.log('distToTarget', distToTarget);
    
    this.driveTowards(this.target, distToTarget);    
  }
  
  getAngleToTarget(targetPosition) {
    let angle = -90 + this.angleBetween({x: this.carPosition.x, y: this.carPosition.z},
                                          {x: targetPosition.x, y: targetPosition.z});
    if (angle > 180) {
      angle = -360 + angle;
    }
    else if (angle < -180) {
      angle = 360 + angle;
    }    
    return angle;
  }
  
  getRelativeAngleToTarget(targetPosition) {
    return getAngleToTarget(targetPosition);
  }
  
  driveTowards(tp, distance) {
    let cr = this.carRotation;
    const cp = this.carPosition;
    
    let angleToTarget = this.getAngleToTarget(tp);
        
    if(distance < 5) {
      this.state = this.STATES.wait;
      setTimeout(() => {
        this.setTarget();
        this.state = this.STATES.seek;
      }, 1000);
      return;
    }

    const maxDelta = 5;    

    if(cp.z < tp.z) { // Target is north of car
      if(cr - maxDelta > -90 && cr + maxDelta < 90) { // Car is north facing
        if(angleToTarget > cr + maxDelta) {
          this.advanceRight();
        }
        else if(angleToTarget < cr - maxDelta) { 
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
      if(cr + maxDelta > 90 || cr - maxDelta < -90) { // Car is south facing
        
        // Flip coordinate space
        if(cr > 0)
          cr -= 180;
        else 
          cr += 180;
        if(angleToTarget > 0)
          angleToTarget -= 180;
        else
          angleToTarget += 180;
        
        if(angleToTarget > cr + maxDelta) {
          this.advanceRight();
        }
        else if(angleToTarget < cr - maxDelta) {
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
  
  backOff() {
    if(this.target) {
      const angleToTarget = this.getAngleToTarget(this.target);
      
      let angle = angleToTarget + this.carRotation;
      if(angle > 180)
        angle -= 360;
      else if(angle < -180)
        angle += 360;
            
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

  setTarget() {
    if(this.target)
      this.lastTarget = this.target;
    else {
      this.target = this.car.getZonePosition();
      this.target.name = 'zone';
      this.lastTarget = { name: 'none'};
      return;
    }
        
    if(this.lastTarget.name === 'zone') {
      const border = 6;
      
      let x = this.bounds.min.x + border;
      let y = this.bounds.min.z + border;
      
      if(this.carPosition.x > 0)
        x = this.bounds.max.x - border;
        
      this.target = new THREE.Vector3(x, 0, y);
      this.target.name = 'corner';
    }
    else if(this.lastTarget.name === 'corner') {
      // target = new THREE.Vector3(0, 0, 0);
      // target.name = 'center';
      
      this.target = this.getBoxDistances()[0].box.position;
      this.target.name = 'box';
      
    }
    else if(this.lastTarget.name === 'box') {
      this.target = this.car.getZonePosition();
      this.target.name = 'zone';
    }
    
    console.log(this.car.info.name, 'target', this.target);
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