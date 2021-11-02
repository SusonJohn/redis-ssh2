#!/usr/bin/env node
/**
 * @author SusonJohn <591016130@qq.com>
 */

const Redis = require('ioredis');
const Client = require('ssh2').Client;
const net = require('net');
const fs = require('fs');

function connectToSSH(options) {
    return new Promise((resolve, reject) => {
        const connection = new Client();
        connection.once('ready', () => resolve(connection));
        connection.once('error', reject);
        connection.connect(options);
    });
}

function connectToRedis(options) {
    const redis = new Redis(options);
    return new Promise((resolve, reject) => {
        redis.once('error', reject);
        redis.once('ready', () => resolve(redis));
    });
}
function createIntermediateServer(connectionListener) {
    return new Promise((resolve, reject) => {
        const server = net.createServer(connectionListener);
        server.once('error', reject);
        server.listen(0, () => resolve(server));
    });
}
async function connect(sshConfig, redisConfig) {
    let redis, server, sshConnection, sshDefualt
    sshDefualt = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.user
    }
    if (sshConfig.password) {
        sshDefualt = {
            ...sshDefualt,
            password: sshConfig.password
        }
    }
    if (sshConfig.privateKey) {
        sshDefualt = {
            ...sshDefualt,
            privateKey: sshConfig.privateKey
        }
    }
    try {
        sshConnection = await connectToSSH({
            ...sshDefualt
        });
    } catch (err) {
        throw new Error(`sshConnection failed ${err}`)
    }
    tunnel._conn = sshConnection
    try {
        server = await createIntermediateServer(socket => {
            sshConnection.forwardOut(
                socket.remoteAddress,
                socket.remotePort,
                redisConfig.host,
                redisConfig.port,
                (error, stream) => {
                    if (error) {
                        socket.end();
                    } else {
                        socket.pipe(stream).pipe(socket);
                    }
                }
            );
        });
    } catch (err) {
        throw new Error(`createIntermediateServer failed ${err}`)
    }
    let sshRedis
    sshRedis = {
        host: server.address().address,
        port: server.address().port,
        db: redisConfig.db
    }
    if (redisConfig.password) {
        sshRedis = {
            ...sshRedis,
            password: redisConfig.password
        }
    }
    if (redisConfig.privateKey) {
        sshRedis = {
            ...sshRedis,
            privateKey: redisConfig.privateKey
        }
    }
    try {
        // Redis specify the address of the intermediate server, not the server
        redis = await connectToRedis({
            ...sshRedis
        });
        tunnel._redis = redis
        return redis
    } catch (err) {
        throw new Error(`connectToRedis failed ${err}`)
    }
}

var tunnel = module.exports = {
    /**
     * @var ssh2.Connection _conn The SSH connection
     */
    _conn: null,

    /**
     * @var Redis2.Connection _conn The Redis connection
     */
    _redis: null,
    /**
     * @param redis Redis connection
     * @param conn ssh connection
     * @return Promise <Redis and ssh connection>
     */
    connect: function (sshConfig, redisConfig) {
        return new Promise((resolve, reject) => {
            connect(sshConfig, redisConfig).then(
                redis=>{
                    resolve(redis)
                }
            ).catch(err=>{
                reject(err)
            })
        })
    },
    close: function () {
        if ('end' in tunnel._redis) {
            tunnel._redis.end()
        }
        if ('end' in tunnel._conn) {
            tunnel._conn.end()
        }
    }
}