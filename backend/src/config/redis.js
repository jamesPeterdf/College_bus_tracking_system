const redis = require('redis');

let client = {
    set: async () => { },
    get: async () => null,
    connect: async () => { },
    on: () => { }
};

try {
    const realClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: { reconnectStrategy: false }
    });
    realClient.on('error', () => { });
    (async () => {
        try {
            await realClient.connect();
            client = realClient;
        } catch (err) {}
    })();
} catch (err) {}

module.exports = client;
