const WebSocket = require('ws');
const Redis = require('ioredis');

const wSocket_server = new WebSocket.Server({port:8080});
const redisClient = Redis.createClient();
const clients = new Set();

/* wSocket_server.on('connection', (ws) => {
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
                console.log('Message arrived from: ' + channel);
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
} ) */

wSocket_server.on('connection', (ws) => {
    clients.add(ws)
    ws.on('open', () => {console.log('connection established')});
    ws.on('message', (message) => {
        message = JSON.parse(message);
        if(message.type === 'subscribe'){
            const serverID = message.data;
            ws.serverID = serverID;
            redisClient.subscribe(serverID);
            console.log(`User subscribed to ${serverID}`);     
        }
        else if(message.type === 'unsubscribe'){
            if(ws.serverID){
                redisClient.unsubscribe(ws.serverID);
                console.log('User unsubscribed from: ' + ws.serverID);
                ws.serverID = null;
            }
        }
    })
    ws.on('close', () => {
        console.log('Connection closed');
        if(ws.serverID) {
            redisClient.unsubscribe(ws.serverID);
            console.log('User unsubscribed from: ' + ws.serverID);
        }
        clients.delete(ws);
    })
})

redisClient.on('message',(channel, message) => {
    console.log('Recieved message from channel: ' + channel);
    for(const ws of clients) {
        console.log(ws.serverID + '+' + channel);
        if(ws.serverID == channel) {
            ws.send(message)
            console.log('Message sent to user subscribed to:' + ws.serverID);
        }
    }
})