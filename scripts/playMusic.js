const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const musicFolder = '/home/admin/Desktop/music/all';
let currentTrackIndex = 0;
let randomMode = true; // 控制是否随机播放
let time = Date.now()

function playNextTrack() {
  console.log('时间', new Date().toLocaleString())

  const files = fs.readdirSync(musicFolder).filter(file => file.endsWith('.mp3') || file.endsWith('.m4a'));

  if (currentTrackIndex >= files.length) {
    currentTrackIndex = 0; // 如果播放到最后一首，则回到第一首
  }

  let nextTrackIndex;
  if (randomMode) {
    nextTrackIndex = Math.floor(Math.random() * files.length); // 随机选择一首音乐
  } else {
    nextTrackIndex = currentTrackIndex; // 顺序播放时，下一首是当前索引的下一首
  }

  const currentTrack = path.join(musicFolder, files[nextTrackIndex]);

  console.log(`Playing: ${currentTrack}`);

  const command = `cvlc --play-and-exit "${currentTrack}"`; // 使用 cvlc 播放并在播放完后退出

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.log(`Playback completed.`);
      if (!randomMode) {
        currentTrackIndex = (currentTrackIndex + 1) % files.length; // 顺序播放时递增索引
      }
      console.log('累计播放时长', ((Date.now() - time) / 1000 / 60).toFixed(2), '分钟')
      playNextTrack(); // 播放完成后自动播放下一首
    }
  });
}


playNextTrack();
