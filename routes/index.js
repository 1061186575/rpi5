var express = require('express');
const path = require("path");
const { exec } = require("child_process");
const { getLocalIP } = require("../utils");
const os = require("os");
var router = express.Router();

const cmdMapFunc = {
    'bluetooth.sh'() {
        return 'sh ' + path.resolve('utils/bluetooth.sh')
    },
}

// 只有这些命令允许直接执行
const quickCmdList = [
    'pm2 save',
    'pm2 restart all',
    // 'sudo nginx',
    // 'sudo nginx -s stop',
    'sudo shutdown -h now',
    'bluetooth.sh'
]

const ignoreCmdErrorMap = {
    'sudo nginx -s stop': /\[notice] \d+#\d+: signal process started/
}

router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('index.html'));
});

router.get('/runStatus', async function (req, res, next) {
    const cpuUsage = await getCpuUsage();
    const cpuTemp = await getCpuTemp();
    const pm2List = await getPm2List();
    const ip = getLocalIP();
    const projectUrls = {
    }
    const statusChangeTime = Date.now();
    res.send({
        code: 0,
        data: {
            pm2List,
            quickCmdList,
            statusChangeTime,
            pm2Status: getPm2Status(pm2List),
            cpuUsage: `${cpuUsage}%`,
            cpuTemp: `${cpuTemp}°C`,
            projectUrls,
        }
    });
});
router.get('/pm2StartOrStop', async function (req, res, next) {
    const {
        name, status
    } = req.query
    let msg
    // 在线就关闭
    if (status === 'online') {
        msg = await execRunCmd(`pm2 stop ${name}`)
    } else {
        msg = await execRunCmd(`pm2 start ${name}`)
    }
    res.send({
        code: 0,
        data: {
            msg
        }
    });
});
router.get('/runCmd', async function (req, res, next) {
    let { cmd } = req.query
    if (!quickCmdList.includes(cmd)) {
        res.send({
            code: 1,
            data: {
                msg: '不是指定命令, 不允许执行'
            }
        });
        return
    }
    if (cmdMapFunc[cmd]) {
        cmd = cmdMapFunc[cmd]()
    }
    execRunCmd(cmd).then(msg => {
        res.send({
            code: 0,
            data: {
                msg
            }
        });
    }).catch(err => {
        res.send({
            code: 1,
            data: {
                msg: String(err)
            }
        });
    })
});

function getPm2Status(str) {
    const rows = str.split('\n').filter(line => line.startsWith('│'));
    const headers = ['id', 'name', 'namespace', 'version', 'mode', 'pid', 'uptime', '↺', 'status', 'cpu', 'mem', 'user', 'watching'];
    const result = rows.map(row => {
        const columns = row.split('│').map(col => col.trim()).filter(Boolean);
        const data = {};
        headers.forEach((header, index) => {
            data[header] = columns[index];
        });
        return {
            id: data.id,
            name: data.name,
            status: data.status
        };
    });
    result.shift();
    result.sort((a, b) => a.id - b.id);
    return result
}

// 运行任意cmd命令
async function execRunCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                // 有stderr也认为是运行成功
                if (typeof ignoreCmdErrorMap[cmd] === 'string' && ignoreCmdErrorMap[cmd] === stderr) {
                    return resolve(stderr);
                }
                if (ignoreCmdErrorMap[cmd] instanceof RegExp && ignoreCmdErrorMap[cmd].test(stderr)) {
                    return resolve(stderr);
                }
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

// 获取 CPU 占用率
function getCpuUsage() {
    if (os.platform() !== 'linux') return 'N/A'
    return execRunCmd("top -bn1 | grep 'Cpu(s)'").then(res => {
        const cpuUsage = 100 - parseFloat(res.split(",")[3].trim().replace("%id", ""));
        return cpuUsage.toFixed(2);
    })
}

// 获取 CPU 温度
function getCpuTemp() {
    if (os.platform() !== 'linux') return 'N/A'
    return execRunCmd("vcgencmd measure_temp").then(res => {
        const cpuTemp = res.split("=")[1].trim().replace("'C", "");
        return cpuTemp;
    })
}

function getPm2List() {
    if (os.platform() !== 'linux') return 'N/A'
    return execRunCmd('pm2 ls')
}


module.exports = router;
