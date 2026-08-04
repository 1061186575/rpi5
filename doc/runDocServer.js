const os = require('os');
const fs = require('fs');
const {exec, execSync} = require('child_process');

const port = 8088
exec(`npx http-server ./ -c-1 -p ${port}`)


const networkInterfaces = os.networkInterfaces()

Object.values(networkInterfaces).forEach(arr => {
  arr.forEach(d => {
    if (d.family === 'IPv4') {
      console.log(`Server running at http://${d.address}:${port}/`);
    }
  })
})


// 监听文件改变
fs.watch('.', {recursive: true}, (eventType, filename) => {
  if (!filename.endsWith('.md')) {
    return
  }
  if (eventType === 'rename') {
    console.log(`File ${filename} has been added or removed`);

    exec('node generateReadme.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  }
});
