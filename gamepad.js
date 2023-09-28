const gamePad = {};
gamePad.pads = [];

detectGamepads();

setInterval(() => {
  detectGamepads();  
}, 1000);

function detectGamepads() {
  const gPads = navigator.getGamepads();
  const tempPads = [];
  gPads.forEach((gPad, i) => {
    if(gPad && gPad.connected && gPad.timestamp > 0 && gPad.axes[0]) {
      const isWheel = gamePad.isWheel(gPad);
      const isXbox = gamePad.isXbox(gPad);
      const isPlaystation = gamePad.isPlaystation(gPad);
      
      tempPads.push({ gPadIndex: i, name: gPad.id, isWheel: isWheel, isXbox: isXbox, isPlaystation: isPlaystation });
    }
  });
  if(tempPads.length !== gamePad.pads.length) {
    gamePad.pads = tempPads;
    console.log(gamePad.pads.length + ' gamepad(s) detected!');
    gamePad.pads.forEach(pad => {
      console.log(pad.name);
      console.log(gPads);
    });
    document.dispatchEvent(new Event('gamepads'));
  }
}

gamePad.checkGamepads = () => {
  const gPads = navigator.getGamepads();
  gamePad.pads.forEach((pad, i) => {
    const gPad = gPads[pad.gPadIndex];
    try { 
      pad.a0 = -gPad.axes[0];
      if(pad.isXbox || pad.isPlaystation) {
        pad.a1 = gPad.buttons[7].value;
        pad.a2 = gPad.buttons[6].value;
      }
      else if(pad.isWheel) {
        if(gPad.axes[1] <= 0) {
          pad.a1 = gPad.axes[1] * -1.5;
          if(pad.a1 > 1)
            pad.a1 = 1;
          if(pad.a1 < 0.1)
            pad.a1 = 0;
        }
        else {
          pad.a2 = gPad.axes[1] * 1.5;
          if(pad.a2 > 1)
            pad.a2 = 1;
          if(pad.a2 < 0.1)
            pad.a2 = 0;
        }
      }
      else {
        // console.log(gPad.axes);
        pad.a1 = gPad.buttons[7].value;
        pad.a2 = gPad.buttons[5].value;
      }
    } 
    catch(e){
      console.log(e);
    }  
  });
  window.requestAnimationFrame(gamePad.checkGamepads);
}
gamePad.checkGamepads();

gamePad.isWheel = (pad) => {
  const names = ['driving force', 'g29', 't150', 't300', 'g923'];
  if(names.some(name => pad.id.toLowerCase().includes(name)))
     return true;
  return false
}

gamePad.isPlaystation = (pad) => {
  const names = ['dualshock', 'dualsense', 'ps2', 'ps3', 'ps4', 'ps5', 'playstation', 'horipad mini'];
  if(names.some(name => pad.id.toLowerCase().includes(name)))
     return true;
  return false
}

gamePad.isXbox = (pad) => {
  const names = ['xbox'];
  if(names.some(name => pad.id.toLowerCase().includes(name)))
     return true;
  return false
}

gamePad.getPads = () => {
  return gamePad.pads;
}

export default gamePad;