const crypto = require('crypto');
const fs = require('fs');
const { join } = require('path');

const inputPath = join(__dirname, 'release/Launcher.zip');
const outputPath = join(__dirname, 'release/manifest.json');
const versionPath = join(__dirname, 'version.txt');

let file = fs.readFileSync(inputPath);
let hash = crypto.createHash('sha256').update(file).digest('hex');
let version = fs.readFileSync(versionPath, 'utf-8');

fs.writeFileSync(outputPath, JSON.stringify({
    version,
    path: "Launcher.zip",
    hash
}, null, 4));

console.log('Manifest created');