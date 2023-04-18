export default class Player {
  
  actions = {};
  
  constructor(car, keys) {
    this.keys = keys;
    this.car = car;
  }
  
  keyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if(this.keys[e.code]) {
      this.actions[this.keys[e.code]] = true;
    }
  }
  
  keyUp(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if(this.keys[e.code]) {
      this.actions[this.keys[e.code]] = false;
    }
  }
}