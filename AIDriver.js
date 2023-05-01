import Car from './Car.js';
import debug from './debug.js';

export default class AIDriver {
  
  actions = {};
  
  STATES = {
    seeking: 'seeking',
    pushing: 'pushing',
    defending: 'defending',
    attacking: 'attacking'
  };
  
  constructor(car, bounds) {
    this.state = this.STATES.seeking;
    this.car = car;
    this.car.ai = this;
    this.bounds = bounds;
    this.cPos = this.car.chassisMesh.position;
    this.cRot = this.car.chassisMesh.rotation;
  }

  step() {
    if(this.car.index === 0)
      debug.clear();
    else
      debug.w(' ');
    debug.color(this.car.color);
    
    this.actions = {};
    if(this.state === this.STATES.seeking)
      this.seek();
    else if(this.state === this.STATES.pushing)
      this.push();
    else if(this.state === this.STATES.defending)
      this.defend();
    else if(this.state === this.STATES.attacking)
      this.attack();
    else if(this.state === this.STATES.reversing)
      this.reverse();
  }
  
  angle(p1, p2) { 
    return Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI + 180;
  }
  
  crash() {
    this.target = null;
    if(this.state === this.STATES.reversing)
      this.state = this.STATES.seeking;
    else 
      this.state = this.STATES.reversing;
  }

  seek() {   
    if(!this.target)
      this.target = this.getTarget();
    
    if(!this.checkBounds()) {
      if(this.state === this.STATES.reversing)
        this.state = this.STATES.seeking;
      else if(!this.target)
        this.state === this.STATES.seeking;
      else {
        this.state = this.STATES.reversing;
        this.target = null;
      }
      return;
    }
    
    const tPos = this.target.position;
    
    const distToTarget = this.cPos.distanceTo(this.target.position);
    debug.w('distToTarget ' + Math.round(distToTarget));
    
    if(distToTarget > 5) {
      
      let angleToTarget = this.angle(this.cPos, tPos) + 90;
      if(angleToTarget > 180)
        angleToTarget -= 360;
    
      debug.w('cPos.x ' + Math.round(this.cPos.x) + ' cPos.z ' + Math.round(this.cPos.z));
      debug.w('tPos.x ' + Math.round(tPos.x) + ' tPos.z ' + Math.round(tPos.z));
      debug.w('angleToTarget ' + Math.round(angleToTarget));
      
      const minAngle = 20;
      
      let carAngle = this.cRot.y * 180 / Math.PI;
      debug.w('carAngle ' + Math.round(carAngle));
      
      if(angleToTarget > carAngle + minAngle)
        this.goLeft();
      else if(angleToTarget < carAngle - minAngle)
        this.goRight();
      else 
        this.go();
    }
    else {
      this.target = this.getTarget();
    }    
  }
  
  checkBounds() {
    if(this.bounds.containsPoint(this.cPos))
      return true;
    return false;
  }

  getTarget() {
    if(this.target === this.car.zone.mesh)
      return {position: {x: 0, y: 0, z: 0}};
    else
      return this.car.zone.mesh;
  }

  stop() {
    debug.w('stop()');
    if(this.car.speed > 0.1)
      this.reverse();
    else if(this.car.speed < -0.1)
      this.go();
  }
  
  reverse() {
    debug.w('reverse()');
    this.actions = {'braking': true };
  }

  go() {
    debug.w('go()');
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

  push() {
    //@TODO
  }
  
  defend() {
    //@TODO
  }
  
  attack() {
    //@TODO
  }
}