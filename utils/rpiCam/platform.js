const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const {exec} = require('child_process')

/**
 * 用于本地调试
 */

const uploadPort = 3001

http.createServer((req, res) => {
  console.log('req.url', decodeURIComponent(req.url))
  if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
    return res.end(JSON.stringify({code: 0}))
  }
  res.end(JSON.stringify({
    open: true, // true: record, false: no record
    exit: false, // true: exit process
    type: 'img', // img or video
    // type: 'video', // img or video
    upload: false,
    noPreview: true,
    duration: 1000 * 5, // video duration, img invalid
    width: 640,
    height: 480,
    delay: 1000 * 20,
    highDefinitionInterval: 20,
    count: 50,
    startTime: '', // if exists, ignore count
    endTime: '',
    // new
    runCode: 'node -v',
  }))
}).listen(uploadPort, () => {
  console.log('http://localhost:3001/')
})
