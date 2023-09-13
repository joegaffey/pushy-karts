const gamePad = {};
gamePad.pads = [];

detectGamepads();

setInterval(() => {
  detectGamepads();  
}, 1000);

function detectGamepads() {
  const gPads = navigator.getGamepads();
  const tempPads = [];
  gPads.forEach(gPad => {
    if(gPad && gPad.connected && gPad.timestamp > 0) {
      tempPads.push({ gPad: gPad });
    }
  });
  if(tempPads.length !== gamePad.pads.length) {
    gamePad.pads = tempPads;
    console.log(gamePad.pads.length + ' gamepad(s) detected!');
    gamePad.pads.forEach(pad => {
      console.log(pad.gPad.id);
    });
  }
}

gamePad.checkGamepads = () => {
  const gPads = navigator.getGamepads();
  gamePad.pads.forEach((pad, i) => {
    pad.a0 = gPads[i].axes[0];
    try { pad.a1 = gPads[i].buttons[7].value; } catch(e){}
    try { pad.a2 = gPads[i].buttons[6].value; } catch(e){}
  });
  window.requestAnimationFrame(gamePad.checkGamepads);
}
gamePad.checkGamepads();

gamePad.getPads = () => {
  return gamePad.pads;
}

export default gamePad;