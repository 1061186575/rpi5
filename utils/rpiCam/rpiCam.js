const fs = require('fs')
const path = require('path')
const { execSync, exec } = require('child_process')
const os = require("os")
const crypto = require('crypto')

/*
run on rpi
video 10s 1.5MB
2592 × 1944 img 1MB
640 × 480 img 80KB, 100MB can get count 1250 img
一天86400
 */

const isRun = false;

let config = {
    open: true, // true: record, false: no record
    exit: false, // true: exit process
    type: 'img', // img or video
    // type: 'video', // img or video
    upload: false,
    noPreview: true,
    duration: 1000 * 5, // video duration, img invalid
    width: 640,
    height: 480,
    delay: 1000 * 5,
    highDefinitionInterval: 20,
    count: 50,
    startTime: '', // if exists, ignore count
    endTime: '',
    runCode: '', // run any code
    updateConfigInterval: 10 * 1000,
    now: undefined, // rpi 刚开机后获取的本地时间是错误的, 所以返回最新的时间给 rpi
    updateIndex: 0, // 每次保存 updateIndex + 1, 这样 rpi 就会重新开始执行
}

const defaultKeyPwd = 'XXXxxx'
const pm2ProjectName = 'rpi5'
const isDev = os.platform() === 'win32'
let configUrl = ''
let uploadUrl = ''
let cacheRunCode = ''
let cacheRunCodeRes = ''
let timer = null
let serverTime

if (isDev) {
    configUrl = 'http://localhost:30000/public/rpi/getConfig'
    uploadUrl = 'http://localhost:30000/public/rpi/upload'
    // configUrl = 'http://localhost:3001/getConfig'
    // uploadUrl = 'http://localhost:3001/upload'
} else {
    // TODO
    configUrl = 'http://localhost:30000/public/rpi/getConfig'
    uploadUrl = 'http://localhost:30000/public/rpi/upload'
}


async function main() {
    let cacheConfigStr = ''
    let stop = emptyFunc

    async function checkRestart() { // 这里面拿到的是最新的 config 和 serverTime
        let newConfigStr = JSON.stringify(config)
        if (newConfigStr === cacheConfigStr) {
            return
        }
        writeLog(JSON.stringify(config), '重启')
        cacheConfigStr = newConfigStr
        stop()
        stop = (await run()) || emptyFunc

        runCode() // 如果运行的代码会一直占用终端, 那么将存在内存泄漏问题, 目前靠重启解决
        clearInterval(timer)
        timer = setInterval(() => {
            getConfig().finally(checkRestart)
        }, config.updateConfigInterval)
    }

    getConfig().finally(checkRestart)
}

if (isRun) {
    main()
}

async function run() {
    if (config.exit) {
        if (isDev) {
            process.exit(0) // 如果是在pm2里面会不断重启
        } else {
            execSync(`pm2 stop ${pm2ProjectName} && pm2 stop all`)
        }
        return
    }
    if (!config.open) {
        return
    }
    let isStop = false

    async function start() {
        let i = 0
        if (config.startTime && config.endTime) {
            while (true) {
                if (isStop) {
                    return
                }
                let startTime = new Date(config.startTime).getTime()
                let endTime = new Date(config.endTime).getTime()
                let now = Date.now()
                if (now >= endTime) {
                    return
                }
                if (now > startTime && now < endTime) {
                    await capture(i++)
                }
                await delay(config.delay)
            }
        }
        for (; i < config.count; i++) {
            if (isStop) {
                return
            }
            await capture(i)
            await delay(config.delay)
        }
    }

    start()

    return function stop() {
        isStop = true
    }
}

async function runCode() {
    if (!config.runCode || cacheRunCode === config.runCode) {
        return
    }
    cacheRunCode = config.runCode

    cacheRunCodeRes = await innerRunCode(cacheRunCode)
    if (cacheRunCodeRes) { // 有值代表是内置命令
        return
    }

    exec(cacheRunCode, { encoding: 'utf8' }, function (error, stdout, stderr) {
        if (error) {
            cacheRunCodeRes = String(error)
        } else {
            cacheRunCodeRes = String(stdout)
        }
        console.log('runCodeRes', cacheRunCodeRes)
    })
}

async function innerRunCode(code) {
    const map = {
        ip: () => execSync('hostname -I').toString().trim().split(' ')
    }
    if (map[code]) {
        try {
            return map[code]()
        } catch (e) {
            return String(e)
        }
    }
}

async function capture(index) {
    const rootDir = path.join(__dirname, 'tuku', 'uploads', formatDate(getTime()))
    mkdir(rootDir)
    let filename = `${config.type}-${formatDateTime(getTime()).replaceAll(':', '-').replaceAll(' ', '_')}-${index}${genExt()}`
    let filepath = path.join(rootDir, filename)
    let cmd = genCmd(filepath, index)
    runCmd(cmd, filepath)
    if (config.upload) {
        upload(filename, encryptFile(filepath))
    }
}

function getTime() {
    let currentTime = Date.now()
    // 如果当前时间和服务端时间差距比较大, 说明当前时间不准, 那就使用服务端的时间
    if (serverTime && Math.abs(currentTime - serverTime) > 1000 * 60) {
        writeLog('使用服务端时间', 'getTime')
        writeLog(`currentTime ${currentTime}`, 'getTime')
        writeLog(`serverTime ${serverTime}`, 'getTime')
        currentTime = serverTime
    }
    return currentTime
}

function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        })
    }
}

function getConfig() {
    let query = ''
    if (cacheRunCodeRes) {
        query += `code=${cacheRunCode}&codeRes=${cacheRunCodeRes}`
        cacheRunCodeRes = '' // 只发送一次就删除
    }
    return fetch(`${configUrl}?${query}`)
        .then(res => res.json())
        .then(res => {
            config = {
                ...config,
                ...res
            }
            handleServerTime()
        })
        .catch(err => writeLog(err, configUrl))
}

function handleServerTime() {
    serverTime = config.now
    delete config.now
}

function upload(filename, base64Str) {
    return fetch(uploadUrl, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            filename,
            data: base64Str,
        }),
    }).then(res => res.json())
        .then(res => {
            console.log('res', res)
            if (res.code === 1) {
                writeLog('failed: res.code === 1', uploadUrl)
            }
        })
        .catch(err => writeLog(err, uploadUrl))
}


function runCmd(cmd, filepath) {
    console.log('cmd:', cmd)

    if (os.platform() === 'win32') {
        // simulate run cmd
        // fs.writeFileSync(filepath, 'test content')
        return
    }
    try {
        execSync(cmd)
    } catch (e) {
        console.log('e', e)
        writeLog(e, 'runCmd -> execSync')
    }
}

function writeLog(text, name = '', filename = 'log.txt') {
    const arr = [formatDateTime()]
    if (name) {
        arr.push(name)
    }
    arr.push(':', String(text), '\n')
    const str = arr.join(' ')
    console.log(str)
    fs.appendFile(path.join(__dirname, filename), str, function (err) {
        if (err) {
            console.log('err', err)
        }
    })
}

function genExt() {
    if (config.type === 'img') {
        return '.jpg'
    } else if (config.type === 'video') {
        return '.mp4'
    }
    return ''
}

function genCmd(filepath, index) {
    let cmdArr = []
    if (config.type === 'img') {
        cmdArr.push('rpicam-jpeg')
        cmdArr.push(`-t 100`)
    } else if (config.type === 'video') {
        cmdArr.push('rpicam-vid')
        cmdArr.push(`-t ${config.duration}`)
    } else {
        console.log('error: unknown type')
        cmdArr.push('rpicam-jpeg')
        cmdArr.push(`-t 100`)
    }
    if (config.noPreview) {
        cmdArr.push('--nopreview')
    }
    if (index % config.highDefinitionInterval !== 0) {
        if (config.width) {
            cmdArr.push(`--width ${config.width}`)
        }
        if (config.height) {
            cmdArr.push(`--height ${config.height}`)
        }
    }
    cmdArr.push(`-o ${filepath}`)
    return cmdArr.join(' ')
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms))
}

function formatDateTime(inputTime = new Date()) {
    var date = new Date(inputTime);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    var second = date.getSeconds();
    minute = minute < 10 ? ('0' + minute) : minute;
    second = second < 10 ? ('0' + second) : second;
    return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
}

function formatDate(inputTime = new Date()) {
    var date = new Date(inputTime);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    m = m < 10 ? ('0' + m) : m;
    d = d < 10 ? ('0' + d) : d;
    return y + '-' + m + '-' + d;
}

function encryptText(buf, outputPath, keyPwd = defaultKeyPwd) {
    if (typeof buf === 'string') {
        buf = Buffer.from(buf)
    }
    const cipher = crypto.createCipher('aes-256-cbc', keyPwd)
    let encrypted = Buffer.concat([cipher.update(buf), cipher.final()])
    let base64Encrypted = encrypted.toString('base64')
    if (outputPath) {
        fs.writeFileSync(outputPath, base64Encrypted)
    }
    return base64Encrypted
}

function encryptFile(inputPath, outputPath, keyPwd = defaultKeyPwd) {
    const buf = fs.readFileSync(inputPath)
    return encryptText(buf, outputPath, keyPwd)
}

function emptyFunc() {
}
