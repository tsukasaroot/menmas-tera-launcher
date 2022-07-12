const fs = require('fs');
const { Client } = require('ssh2');
const crypto = require('crypto');
const axios = require('axios');
const http = require('http');
const https = require('https');
const retry = require('retry');
const PATCH_URL = 'http://api.digitalsavior.fr';

function getLatestBuildInfo() {
    return new Promise((resolve, reject) => {
        axios.get(PATCH_URL + '/download')
            .then((response) => {
                if(response.status === 200) {
                    resolve(response.data);
                } else {
                    reject(response.status + ": " + response.statusText);
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}

let agent = axios.create({
    baseURL: PATCH_URL,
    method: 'get',
    responseType: 'stream',
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 60000
});

async function getInfos()
{
    const conn = new Client();

    let download = fs.readFileSync('download', 'utf-8');

    let remoteDownload = await getLatestBuildInfo();

    console.log(remoteDownload)
}

getInfos();

return;
conn.on('connect',
    function () {
        console.log( "- connected" );
    }
);

conn.on('ready',
    () => {
    conn.sftp(
        (err, sftp) => {
            if (err) {
                console.log( "Error, problem starting SFTP: %s", err );
                process.exit( 2 );
            }
            console.log('- SFTP started');
            // upload file
            /*var readStream = fs.createReadStream( "/proc/meminfo" );
            var writeStream = sftp.createWriteStream( "/tmp/meminfo.txt" );*/

            // what to do when transfer finishes
            writeStream.on(
                'close',
                function () {
                    console.log( "- file transferred" );
                    sftp.end();
                    process.exit( 0 );
                }
            );

            // initiate transfer of file
            readStream.pipe( writeStream );
        }
    )
}
);

conn.connect(
    {
        "host": "109.234.164.221",
        "port": 22,
        "username": "spbh7121",
        "privateKey": fs.readFileSync('/home/tsukasaroot/.ssh/id_rsa')
    }
);