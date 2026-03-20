const redis = require('redis');

let client = {
    set: async () => { },
    get: async () => null,
    connect: async () => console.log('Using Mock Redis Client'),
    on: () => { }
};

try {
    const realClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
            reconnectStrategy: false  // Don't retry — use mock mode instead
        }
    });

    realClient.on('error', () => { });  // Suppress error spam

    (async () => {
        try {
            await realClient.connect();
            console.log('Connected to Redis');
            client = realClient;
        } catch (err) {
            console.log('Redis unavailable, running in MOCK mode (no caching).');
        }
    })();
} catch (err) {
    console.log('Redis Initialization Failed, running in MOCK mode.');
}

module.exports = client;
