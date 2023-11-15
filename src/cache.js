const crypto = require('crypto')
const path = require('path')
const fs = require('fs').promises

const cacheDir = process.env.APP_CACHE_DIR || path.join(__dirname, '..', '.cache')

async function writeCache(fileName, data) {
    let dataString = JSON.stringify(data)
    let cachedString = await getCacheString(fileName)
    let isSameCache = await compareHashes(dataString, cachedString)
    console.log('writeCache:', fileName, isSameCache)
    if (!isSameCache) {
        await fs.writeFile(
            path.join(cacheDir, fileName),
            dataString
        )
    }
}

async function getCacheString(fileName) {
    try {
        return await fs.readFile(path.join(
            cacheDir, fileName
        ))
    } catch (e) {
        return false
    }
}

async function getCache(fileName) {
    let cachedString = await getCacheString(fileName)
    return JSON.parse(cachedString, {
        safe: true
    })
}

async function compareHashes(newData, oldData) {
    if (!oldData) return false
    let newHash = crypto.createHash('md5').update(
        Buffer.from(newData, 'utf-8')
    ).digest("hex")
    let oldHash = crypto.createHash('md5').update(
        Buffer.from(oldData, 'utf-8')
    ).digest("hex")
    return newHash === oldHash
}

module.exports = {
    writeCache,
    getCache
}
