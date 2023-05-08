class Debug {
  #on = false;
  
  constructor() {
    this.el = document.querySelector('.debug');
  }
  
  on() {
    this.#on = true; 
    this.el.style.display = 'block';
  }
  
  color(color) {
    if(this.#on)
      this.el.style.color = color;
  }
  
  clear() {
    if(this.#on)
      this.el.innerHTML = '';
  }
  
  w(log) {
    if(this.#on)
      this.el.innerHTML += log + '<br>';
  }
}

export default new Debug();
