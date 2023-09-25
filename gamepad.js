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
      tempPads.push({ gPadIndex: i, name: gPad.id});
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
      if(pad.name.includes('Xbox 360')) {
        pad.a1 = gPad.buttons[7].value;
        pad.a2 = gPad.buttons[6].value;
      }
      else if(pad.name.includes('Driving Force')) {
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

gamePad.getPads = () => {
  return gamePad.pads;
}

export default gamePad;