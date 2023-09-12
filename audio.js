const audio = {};
audio.context = new AudioContext();
// audio.on = true;

const path = 'https://cdn.glitch.global/0a4c92ea-651d-46ad-9395-99ef6a57e497/';

// All audio.sounds were generated online at https://www.leshylabs.com/apps/sfMaker/
audio.sounds = {
  boxhit: { audio: new Audio(path + "boxhit.wav"), volume: 0.01 },
  carhit: { audio: new Audio(path + "carhit.wav"), volume: 0.1 },
};

audio.play = function (sound) {
  if(!this.on)
    return;
  const snd = audio.sounds[sound].audio.cloneNode(true);
  snd.volume = audio.sounds[sound].volume;
  snd.play();
};

export default audio;