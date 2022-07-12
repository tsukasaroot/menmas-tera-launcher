const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const algo = 'sha1';

let results = {'entries': []};

function clean(p) {
    p = p.split('\\')

    for (let i = 0; i < p.length; i++) {
        if (p[i] === 'Client')
            break;
        p.shift();
        i--;
    }

    p = p.join('\\');
    return p;
}

function walk(dir, p) {
    dir = fs.readdirSync(dir);

    for (let i = 0; i < dir.length; i++) {
        const stat = fs.lstatSync(path.join(p, dir[i]));
        if (stat.isDirectory()) {
            results.entries.push({
                'file': path.join(clean(p), dir[i]),
                'directory': true
            });
            walk(path.join(p, dir[i]), path.join(p, dir[i]));
        } else {
            if (dir[i] !== 'build.json') {
                let file_content = fs.readFileSync(path.join(p, dir[i]));
                results.entries.push({
                    'file': path.join(clean(p), dir[i]),
                    'sha1': crypto.createHash(algo).update(file_content).digest('hex'),
                    'directory': false,
                    'size': fs.statSync(path.join(p, dir[i])).size
                });
            } else {
                console.log('Ignored file encountered ' + dir[i])
            }
        }
    }
}

let p = process.argv[2];

walk(p, p);
results.buildVersion = 1000;
fs.writeFileSync('download', JSON.stringify(results), 'utf-8');