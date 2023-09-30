const audio = {};
audio.context = new AudioContext();
audio.on = true;

const path = './audio/';

// All audio.sounds were generated online at https://www.leshylabs.com/apps/sfMaker/
audio.sounds = {
  boxhit: { audio: new Audio(path + 'hit1.wav'), volume: 1.5 },
  wallhit: { audio: new Audio(path + 'hit2.wav'), volume: 2.5 },
  carhit: { audio: new Audio(path + 'hit3.wav'), volume: 4 },
  score: { audio: new Audio(path + 'score1.wav'), volume: 1 },
  endlevel: { audio: new Audio(path + 'endlevel1.wav'), volume: 1 }, // A A FF G GF D
};

audio.play = function (sound, vol = 1) {
  if(!audio.on)
    return;
  const snd = audio.sounds[sound].audio.cloneNode();
  snd.volume = audio.sounds[sound].volume * vol;
  snd.play();
};

export default audio;