import Car from './Car.js';

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
    this.bounds = bounds;
    this.cPos = this.car.chassisMesh.position;
    this.cRot = this.car.chassisMesh.rotation;
  }

  step() {
    this.actions = {};
    if(this.state === this.STATES.seeking)
      this.seek();
    else if(this.state === this.STATES.pushing)
      this.push();
    else if(this.state === this.STATES.defending)
      this.defend();
    else if(this.state === this.STATES.attacking)
      this.attack();
  }

  seek() {
    if(!this.target)
      this.target = this.getTarget();
    
    if(!this.checkBounds()) {
      this.stop();
      return;
    }
    
    if(this.cPos.distanceTo(this.target.position) > 5) {
      
      // console.log(this.cPos.angleTo(this.target.position))
      
      const angleToTarget = this.cPos.angleTo(this.target.position);
      const minAngle = Math.PI / 18;
      
      // console.log({1: this.cRot.z / Math.PI * 180})
      // console.log({2: angleToTarget})
      
      const carAngle = this.cRot.z + Math.PI;
      
      // console.log({'target': angleToTarget / Math.PI * 180, 'car': carAngle / Math.PI * 180})
      
      if(carAngle - angleToTarget < minAngle)
        this.goLeft();
      else if(carAngle - angleToTarget > minAngle)
        this.goRight();
      else
        this.go();
    }
    else
      this.stop();
  }
  
  checkBounds() {
    if(this.bounds.containsPoint(this.cPos))
      return true;
    return false;
  }

  getTarget() {
    return this.car.zone.mesh;
  }

  stop() {
    if(this.car.speed > 0.1)
      this.reverse();
    else if(this.car.speed < -0.1)
      this.go();
  }
  
  reverse() {
    this.actions = {'braking': true };
  }

  go() {
    this.actions = {'acceleration': true };
  }
  
  goLeft() {
    // console.log('left')
    this.actions = {
      'acceleration': true,
      'left': true
    };
  }
  
  goRight() {
    // console.log('right')
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