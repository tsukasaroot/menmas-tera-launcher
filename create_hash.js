const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const algo = 'sha1';

let results = {'entries': []};

function walk(dir, p) {
    dir = fs.readdirSync(dir);

    for (let i = 0; i < dir.length; i++) {
        const stat = fs.lstatSync(path.join(p, dir[i]));
        if (stat.isDirectory()) {
            results.entries.push({
                'file': path.join(p, dir[i]),
                'directory': true
            });
            walk(path.join(p, dir[i]), path.join(p, dir[i]));
        } else {
            let file_content = fs.readFileSync(path.join(p, dir[i]));
            results.entries.push({
                'file': path.join(p, dir[i]),
                'sha1': crypto.createHash(algo).update(file_content).digest('hex'),
                'directory': false,
                'size': fs.statSync(path.join(p, dir[i])).size
            });
        }
    }
}

walk('Client', 'Client');
fs.writeFileSync('download', JSON.stringify(results), 'utf-8');