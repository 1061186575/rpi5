module.exports = {
  includes: [
    'bin',
    'doc',
    'public',
    'routes',
    'utils',
    'app.js',
    'index.html',
    'package.json',
    'package-lock.json',
    'run.sh',
  ],
  excludes: [
  ],
  // remoteServerPath: 'zp@zhoup.top:/www/zhoup', // 远程服务器的地址和目录
  remoteServerPath: 'admin@pi.com:/home/admin/Desktop/project/rpi', // 远程服务器的地址和目录
  localDist: '0dist',  // 上传之前暂存文件的目录, 每次上传成功后会自动删除
  versionFile: 'version.txt', // 打包时会将打包时间和git提交id写入这个文件中, 这个文件会上传到remoteServerPath的路径后面
  md5CacheFile: 'md5Cache.json', // 增量上传会计算每个文件的md5并且保存到这个文件中, 只上传md5不一致的文件, 如果需要每次都全量上传可以注释此项
  gitCommitCheck: false, // git提交检查, 如果有代码未commit或push, 则取消上传
}
