export default class Player {
  
  actions = {};
  
  constructor(car, keys, pad) {
    this.pad = pad;
    this.keys = keys;
    this.car = car;
  }
  
  keyDown(e) {
    if(this.keys[e.code]) {
      e.preventDefault();
      e.stopPropagation();
      this.actions[this.keys[e.code]] = true;
    }
  }
  
  keyUp(e) {
    if(this.keys[e.code]) {
      e.preventDefault();
      e.stopPropagation();
      this.actions[this.keys[e.code]] = false;
    }
  }
  
  updateActions() {
    if(this.pad) {
      this.actions.aSteer = this.pad.a0;
      this.actions.aThrottle = this.pad.a1;
      this.actions.aBrake = this.pad.a2;
      // console.log(this.actions.aThrottle, this.actions.aBrake)
    }
  }
}