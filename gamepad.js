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
      tempPads.push({ 
        gPadIndex: i, 
        name: gPad.id, 
        isWheel: gamePad.isWheel(gPad), 
        isXbox: gamePad.isXbox(gPad), 
        isPlaystation: gamePad.isPlaystation(gPad), 
        isG29: gamePad.isG29(gPad), 
        isThrustmaster: gamePad.isThrustmaster(gPad)
      });
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
        // console.log(gPad.axes);
        if(pad.isThrustmaster) {
          pad.a1 = gPad.buttons[7].value;
          pad.a2 = gPad.buttons[6].value;
          return;
        }
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
        if(pad.a1 > pad.a2) // Sticky brake fix
          pad.a2 = 0;
        // console.log(pad.a1, pad.a2)
      }
      else {
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
  const names = ['driving force', 'g29', 't150', 't300', 'g923', "thrustmaster ffb wheel"];
  if(names.some(name => pad.id.toLowerCase().includes(name)))
     return true;
  return false
}

gamePad.isG29 = (pad) => {
  if(pad.id.includes('G29 '))
     return true;
  return false
}

gamePad.isThrustmaster = (pad) => {
  if(pad.id.includes('Thrustmaster'))
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