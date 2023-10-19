const WebSocket = require('ws');
const Redis = require('ioredis');

const wSocket_server = new WebSocket.Server({port:8080});
const redisClient = Redis.createClient();


wSocket_server.on('connection', (ws) => {
    ws.on('open', () => {console.log('connection established')});
    ws.on('message', (message) => {
        message = JSON.parse(message);
        console.log(message);
        if(message.type === 'subscribe'){
            const serverID = message.data;
            redisClient.subscribe(serverID);
            console.log(`User subscribed to ${serverID}`);
            redisClient.on('message',(channel, message) => {
                console.log('Sending message: ' + message);
                console.log('Message arrived from: ' + serverID);
                if(channel == serverID) {
                    console.log('Message distributed!');
                    ws.send(message);
                }
            })
        }
        else if(message.type === 'unsubscribe'){
            redisClient.unsubscribe();
            console.log('User unsubscribed')
        }
    })

    ws.on('close', () => {
        console.log('Connection disconnected');
        redisClient.unsubscribe();
    })
} )