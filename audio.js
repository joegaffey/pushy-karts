const audio = {};
audio.context = new AudioContext();

const path = './audio/';

// All audio.sounds were generated online at https://www.leshylabs.com/apps/sfMaker/
audio.sounds = {
  boxhit: { audio: new Audio(path + 'hit1.wav'), volume: 1.5 },
  wallhit: { audio: new Audio(path + 'hit2.wav'), volume: 2.5 },
  carhit: { audio: new Audio(path + 'hit3.wav'), volume: 4 },
  score: { audio: new Audio(path + 'score1.wav'), volume: 1 },
  endlevel: { audio: new Audio(path + 'endlevel1.wav'), volume: 1 }, // A A FF G GF D
  start: { audio: new Audio(path + 'start1.wav'), volume: 1 }, // D   D   D    G
};

audio.play = (sound, vol = 1) => {
  if(!audio.on)
    return;
  const snd = audio.sounds[sound].audio.cloneNode();
  let newVol = audio.sounds[sound].volume * vol;
  if(newVol > 1)
  newVol = 1;
    snd.volume = newVol;
  snd.play();
};

audio.getEngine = () => {
  const engine = {
    osc: audio.context.createOscillator(), // instantiate an oscillator
    gain: audio.context.createGain()
  };
  
  engine.gain.gain.value = 0.2;
  engine.osc.type = 'sine'; // sine, square, sawtooth, triangle
  engine.osc.frequency.value = 0;
  engine.osc.connect(engine.gain);
  engine.gain.connect(audio.context.destination);
  engine.osc.start();
    
  engine.setSpeed = (speed) => {
    if(!audio.on)
      return;
    // engine.gain.gain.value = 0.1
    engine.osc.frequency.value = speed * 2;
    // engine.osc.stop(audio.context.currentTime + 2);   
  }
  
  engine.stop = () => {
    engine.osc.frequency.value = 0;
  };
  
  return engine;
}

export default audio;