/**
 * 总结
 * 1000 张占用 132.81 MB
 * 5s 一张 1 小时 720 张占用 95.63 MB
 * 5s 一张 6 小时 4320 张占用 573.75 MB
 * 2s 一张 1 小时 1800 张占用 239.06 MB
 * 2s 一张 6 小时 10800 张占用 1.40 GB
 */

const lowImgSize = 80;
const highImgSize = 1200;

const highDefinitionInterval = 20;

// 按时间
const addHour = 6
const addDay = 0
const delay = 5 * 1000 // 多少ms一个
const date = new Date()
date.setDate(date.getDate() + addDay)
date.setHours(date.getHours() + addHour)
const time1 = Date.now()
const time2 = date.getTime()
const timeTotalPhotos = Math.ceil((time2 - time1) / delay)

// 按数量
const totalPhotos = 1000


console.log(`按时间, 总 ${totalPhotos} 张占用 ${calc(totalPhotos)}`)
console.log(`按数量, 总 ${addDay} 天 ${addHour} 小时 ${timeTotalPhotos} 张占用 ${calc(timeTotalPhotos)}`)


function calc(total) {
  let totalStorage = 0;
  for (let i = 1; i <= total; i++) {
    if (i % highDefinitionInterval === 0) {
      totalStorage += highImgSize;
    } else {
      totalStorage += lowImgSize;
    }
  }
  return formatStorage(totalStorage)
}

function formatStorage(sizeInKB) {
  const KB_to_MB = 1 / 1024;
  const MB_to_GB = 1 / 1024;
  const GB_to_TB = 1 / 1024;

  if (sizeInKB < 1024) {
    return sizeInKB.toFixed(2) + " KB";
  } else if (sizeInKB < 1024 * 1024) {
    return (sizeInKB * KB_to_MB).toFixed(2) + " MB";
  } else if (sizeInKB < 1024 * 1024 * 1024) {
    return (sizeInKB * KB_to_MB * MB_to_GB).toFixed(2) + " GB";
  } else {
    return (sizeInKB * KB_to_MB * MB_to_GB * GB_to_TB).toFixed(2) + " TB";
  }
}
