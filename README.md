# Redis-SSH2
This project is base on 【Node.js】SSH経由でRedisへ接続する(https://qiita.com/uki00a/items/4dcc13ce571340d78ec1)
Sets up a Redis connection inside an SSH tunnel.
This is practical when you want to reach a Redis which is only accessible through a webserver.
Even if the Redis server is not located on the webserver itself.
It avoids denied from Redis when we use localhost.

[![Greenkeeper badge](https://badges.greenkeeper.io/grrr-amsterdam/Redis-ssh.svg)](https://greenkeeper.io/)


## API

### `.connect(obj sshConfig, obj dbConfig)`

* `sshConfig` should be an object according to the `ssh2` package.
* `dbConfig` should be an object according to the `Redis2` package.
* Returns a Promise, containing a connection from the `Redis2` package.


## Usage
Don't forget to `.close()` the tunnel connection when you're done querying the database.

```javascript
const Redis = require('redis-ssh2');
const fs = require('fs');

Redis.connect(
    {
        host: 'my-ssh-server.org',
        user: 'me-ssh',
        privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
    },
    {
        host: 'my-db-host.com',
        user: 'me-db',
        password: 'secret',
        db: 'my-db-name'
    }
)
.then(client => {
    client.get('values', (err, reply) => {
        if (err) throw err
        console.log(results);
        Redisssh.close()
    })
})
.catch(err => {
    console.log(err)
})
```
If you use password in tunnl,you can use it.

```javascript
const Redis = require('redis-ssh2');
const fs = require('fs');

Redis.connect(
    {
        host: 'my-ssh-server.org',
        user: 'me-ssh',
        password: ''
    },
    {
        host: 'my-db-host.com',
        user: 'me-db',
        password: 'secret',
        db: 'my-db-name'
    }
)
.then(client => {
    client.get('SELECT * FROM `users`', (err, reply) => {
        if (err) throw err
        console.log(results);
        Redisssh.close()
    })
})
.catch(err => {
    console.log(err)
})
```