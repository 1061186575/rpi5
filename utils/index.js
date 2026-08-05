const os = require("os");
const fs = require("fs").promises;
const readline = require("readline");
const { execFile, spawn } = require("child_process");

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

exports.getProcessListeningPort = async function getProcessListeningPort(pid) {
    const processId = Number(pid)
    if (!Number.isInteger(processId) || processId <= 0) return null
    if (os.platform() === 'linux') return getLinuxProcessListeningPort(processId)
    if (os.platform() === 'darwin') return getDarwinProcessListeningPort(processId)
    return null
}

async function getLinuxProcessListeningPort(pid) {
    const processIdList = await getLinuxProcessIdList(pid)
    const socketInodeSet = await getLinuxSocketInodeSet(processIdList)
    if (!socketInodeSet.size) return null
    const networkTableList = await Promise.all([
        `/proc/${pid}/net/tcp`,
        `/proc/${pid}/net/tcp6`,
    ].map(filePath => fs.readFile(filePath, 'utf8').catch(() => '')))
    const listeningSocketList = networkTableList.reduce((result, networkTable) => {
        return result.concat(parseLinuxListeningSocketList(networkTable, socketInodeSet))
    }, [])
    return getPreferredListeningPort(listeningSocketList)
}

async function getLinuxProcessIdList(pid) {
    const processIdList = []
    const pendingProcessIdList = [pid]
    const visitedProcessIdSet = new Set()
    while (pendingProcessIdList.length) {
        const processId = pendingProcessIdList.shift()
        if (visitedProcessIdSet.has(processId)) continue
        visitedProcessIdSet.add(processId)
        processIdList.push(processId)
        const childrenFile = `/proc/${processId}/task/${processId}/children`
        const children = await fs.readFile(childrenFile, 'utf8').catch(() => '')
        children.trim().split(/\s+/).filter(Boolean).forEach(childProcessId => {
            pendingProcessIdList.push(Number(childProcessId))
        })
    }
    return processIdList
}

async function getLinuxSocketInodeSet(processIdList) {
    const socketInodeList = await Promise.all(processIdList.map(async processId => {
        const fdDirectory = `/proc/${processId}/fd`
        const fdList = await fs.readdir(fdDirectory).catch(() => [])
        return Promise.all(fdList.map(fd => {
            return fs.readlink(`${fdDirectory}/${fd}`).catch(() => '')
        }))
    }))
    const socketInodeSet = new Set()
    socketInodeList.flat(2).forEach(link => {
        const match = link.match(/^socket:\[(\d+)]$/)
        if (match) socketInodeSet.add(match[1])
    })
    return socketInodeSet
}

function parseLinuxListeningSocketList(networkTable, socketInodeSet) {
    return networkTable.split('\n').slice(1).reduce((result, row) => {
        const columns = row.trim().split(/\s+/)
        if (columns.length < 10 || columns[3] !== '0A' || !socketInodeSet.has(columns[9])) return result
        const [address, portHex] = columns[1].split(':')
        const port = parseInt(portHex, 16)
        if (Number.isInteger(port) && port > 0 && port <= 65535) {
            result.push({ address, port })
        }
        return result
    }, [])
}

function getDarwinProcessListeningPort(pid) {
    return new Promise(resolve => {
        execFile('lsof', ['-nP', '-a', '-p', String(pid), '-iTCP', '-sTCP:LISTEN', '-Fn'], (error, stdout) => {
            if (error) return resolve(null)
            const listeningSocketList = stdout.split('\n').filter(line => line.startsWith('n')).map(line => {
                const addressText = line.slice(1)
                const portMatch = addressText.match(/:(\d+)$/)
                return portMatch ? { address: addressText.slice(0, portMatch.index), port: Number(portMatch[1]) } : null
            }).filter(Boolean)
            resolve(getPreferredListeningPort(listeningSocketList))
        })
    })
}

function getPreferredListeningPort(listeningSocketList) {
    if (!listeningSocketList.length) return null
    listeningSocketList.sort((a, b) => {
        return getAddressPriority(a.address) - getAddressPriority(b.address) || a.port - b.port
    })
    return listeningSocketList[0].port
}

function getAddressPriority(address) {
    if (/^(\*|0+)$/.test(address)) return 0
    if (address === '0100007F' || address === '00000000000000000000000001000000' || address === '127.0.0.1' || address === '[::1]') return 2
    return 1
}
