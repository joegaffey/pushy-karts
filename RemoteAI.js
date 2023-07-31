export default class RemoteAI {
  
  constructor(server, name) {
    this.isRemote = true;
    this.actions = {};
    const wsProtocol = window.location.protocol == "https:" ? "wss" : "ws";
    const url = `${wsProtocol}://${server}/${name}`;
    console.log(`Connecting to: ${url}`);
    this.connection = new WebSocket(url);
    
    this.connection.onopen = () => {
      console.log('Websocket connected! ' + name);
      if(this.staticState) {
        console.log('Sending static state:\n' +  JSON.stringify(this.staticState));
        this.connection.send(JSON.stringify(this.staticState));
      }
    };
    
    this.connection.onerror = (e) => {
      console.log('Websocket connection failed! ' + name);
      console.error(e);
    };
    
    this.connection.onmessage = (message) => {
      const data = JSON.parse(message.data);
      this.actions = data;
      this.actions = {
        'acceleration': data.includes('FORWARD'),
        'braking': data.includes('BACKWARD'),
        'left': data.includes('LEFT'),
        'right': data.includes('RIGHT')
      };
    };
  }
  
  step() {
    if(this.connection && this.connection.readyState === 1)
      this.connection.send(JSON.stringify({}));
  }
  
  sendStatic(state) {
    if(this.connection && this.connection.readyState === 1)
      this.connection.send(JSON.stringify(state));
    else 
      this.staticState = state;
  }
  
  sendDynamic(state) {
    if(this.connection && this.connection.readyState === 1)
      this.connection.send(JSON.stringify(state));
  }
  
  sendDelta(state) {
    if(this.connection && this.connection.readyState === 1)
      this.connection.send(JSON.stringify(state));
  }
  
  sendCollisions(collisions) {
    if(this.connection && this.connection.readyState === 1)
      this.connection.send(JSON.stringify(collisions));
  }
}