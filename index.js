#!/usr/bin/env node
/**
 * @author SusonJohn <591016130@qq.com>
 */

const Redis = require('ioredis');
const Client = require('ssh2').Client;
const net = require('net');
const fs = require('fs');

function connectToSSH (options) {
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
        let redis, server, sshConnection
        try {
            sshConnection = await connectToSSH({
                host: sshConfig.host,
                port: sshConfig.port,
                username: sshConfig.user,
                password: sshConfig.password
            });
        } catch (err) {
            return new Error(`sshConnection failed ${err}`)
        }
        tunnel._conn=sshConnection
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
            return new Error(`createIntermediateServer failed ${err}`)
        }
        try {
            // Redis specify the address of the intermediate server, not the server
            redis = await connectToRedis({
                host: server.address().address,
                port: server.address().port,
                password: redisConfig.password,
                db: redisConfig.db
            });
            tunnel._redis=redis
            return redis
        } catch (err) {
            return new Error(`connectToRedis failed ${err}`)
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
        return new Promise ((resolve,reject)=>{
            connect(sshConfig, redisConfig).then(
                redis=>{
                    resolve(redis)
                }
            ).catch(err=>{
                reject(err)
            })
        })
    },
    close: function(){
        console.log(tunnel._conn)
        // tunnel._redis.end()
        // tunnel._con.end()
    }
}