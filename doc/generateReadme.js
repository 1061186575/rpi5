const fs = require('fs');
const path = require('path');

const curPath = '.'
const excludes = ['_sidebar.md', '_404.md']
const dirList = [curPath]

console.log('fs.readdirSync(curPath)', fs.readdirSync(curPath))

fs.readdirSync(curPath).forEach(d => {
    if (fs.statSync(d).isDirectory()) {
        dirList.push(d)
    }
})

let readmeContent = ''

dirList.forEach(dir => {
    const files = fs.readdirSync(dir)
    let title = dir

    files.forEach(file => {
        if (!file.endsWith('.md')) {
            return
        }
        if (excludes.includes(file)) {
            return
        }
        let name = path.parse(file).name
        name = name === 'README' ? 'Home' : name
        if (title && title !== curPath) {
            readmeContent += `\n<h1 style="margin-left: 15px;">${title}</h1>\n\n`
            title = ''
        }
        readmeContent += `- [${name}](${dir}/${myEncodeURI(file)})` + '\n'
    });

})


fs.writeFileSync('README.md', readmeContent);
fs.writeFileSync('_sidebar.md', readmeContent);

console.log('生成README.md完成!')


function myEncodeURI(str) {
    return str.replace(/ /g, '%20')
}
