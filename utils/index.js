const os = require("os");
const readline = require("readline");
const { spawn } = require("child_process");

exports.getLocalIP = function getLocalIP() {
    const networkInterfaces = os.networkInterfaces()
    const defaultIp = '127.0.0.1'
    let ip = defaultIp
    Object.values(networkInterfaces).forEach(arr => {
        let item = arr.find(d => d.family === 'IPv4' && d.address !== defaultIp)
        if (item) {
            ip = item.address
        }
    })
    return ip
}

exports.question = function (question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
            rl.close();
        });
    });
}

exports.spawnExec = function spawnExec(commandStr, cwd) {
    return new Promise(resolve => {
        const paramsArr = Array.isArray(commandStr) ? commandStr : commandStr.split(/\s+/ig)
        console.log('执行', paramsArr)
        const res = spawn(paramsArr[0], paramsArr.slice(1), {
            stdio: 'inherit',
            shell: true,
            cwd,
        })
        res.on('close', (code) => {
            resolve(code)
        })
    })
}
