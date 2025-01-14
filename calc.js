import cluster from 'node:cluster';
import { cpus } from 'node:os';
import process from 'node:process';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
    const allstrings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let length = 4;
    let count = 0;
    function nextString(str = "A".repeat(length)) {
        if (str === allstrings[allstrings.length - 1].repeat(length)) {
            length++;
            str = "A".repeat(length);
        }

        let i = str.length - 1;
        let result = str;
        while (i >= 0) {
            let index = allstrings.indexOf(result[i]);
            if (index < allstrings.length - 1) {
                result = result.slice(0, i) + allstrings[index + 1] + result.slice(i + 1);
                break;
            } else {
                result = result.slice(0, i) + allstrings[0] + result.slice(i + 1);
                i--;
            }
        }
        if (i < 0) {
            length++;
            result = "A".repeat(length);
        }
        return result;
    }

    let next = nextString();
    let gitPushing = false;


    console.log(`Primary ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });

    cluster.on('online', (worker) => {
        worker.send(next);
        next = nextString(next);
    });

    cluster.on('message', (worker, message) => {
        if (gitPushing) worker.send("<GITPUSHING>");
        if (message == "end") {
            worker.send(next);
            next = nextString(next);
        }
        if (message.type == "end") {
            worker.send(next);
            next = nextString(next);
            count++;
            if (count == 500) {
                console.log("1000ファイル到達");
                gitPushing = true;
                const { execSync } = require('child_process');
                execSync('git add .');
                execSync('git commit -m "add files"');
                execSync('git push');
                execSync('rmdir /s /q encrypt');
                execSync('rmdir /s /q decrypt');
                count = 0;
                gitPushing = false;
            }
        }

    });
} else {
    console.log(`Worker ${process.pid} started`);
    process.on('message', (message) => {
        if (message == '<GITPUSHING>') {
            setTimeout(() => {
                process.send('end');
            }, 3000);
        } else {
            let message = message;
            if (message == "con" || message == "prn" || message == "aux" || message == "nul" || message == "com1" || message == "com2" || message == "com3" || message == "com4" || message == "com5" || message == "com6" || message == "com7" || message == "com8" || message == "com9" || message == "lpt1" || message == "lpt2" || message == "lpt3" || message == "lpt4" || message == "lpt5" || message == "lpt6" || message == "lpt7" || message == "lpt8" || message == "lpt9") return process.send("end");
            const https = require('https');
            const options = {
                hostname: 'raw.githubusercontent.com',
                port: 443,
                path: `/hash-db/sha256/main/encrypt/${message.length}/${message}`,
                method: 'GET'
            }
            https.request(options, res => {
                if (res.statusCode == 200) {
                    return process.send("end");
                } else {
                    let hash = crypto.createHash('sha256').update(message).digest('hex');
                    if (!fs.existsSync(`./encrypt/`)){
                        fs.mkdirSync(`./encrypt/`);
                    }
                    if (!fs.existsSync(`./encrypt/${message.length}`)) {
                        fs.mkdirSync(`./encrypt/${message.length}`);
                    }
                    if (!fs.existsSync(`./decrypt/`)) {
                        fs.mkdirSync(`./decrypt/`);
                    }
                    if (fs.existsSync(`./encrypt/${message.length}/${message}`)) {
                        return process.send("end");
                    }
                    fs.writeFileSync('encrypt/' + length + "/" + message, hash);
                    fs.writeFileSync('decrypt/' + hash, message);
                    console.log(message + ":" + hash);
                    process.send({ type: "end", value: [message, hash] });
                }
            })
        }
    });
}
