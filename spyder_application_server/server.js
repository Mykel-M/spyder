require('dotenv').config()
const express = require('express')
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const Redis = require('redis');
const redisClient = Redis.createClient();
const {v4: uuidv4} = require('uuid');


try {
    redisClient.connect();
}catch(e){
    console.log(e);
}

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: '',
    database: process.env.MYSQL_DB
});

connection.connect((e) => {
    if(e) {
        console.log('Failed to connect to MySQL DB')
        return;
    }
});

app.use(cookieParser());
app.use(express.json());

function hasValidJWT(req,res,next){
    if(req.cookies){
        if(req.cookies.jwt_authorization === undefined){
            res.send({status:500, payload:'Must log in'});
            console.log("In here");
        }
        try {
            res.locals.jwt_authorization = jwt.verify(req.cookies.jwt_authorization, process.env.ACCESS_TOKEN_SECRET);
            next();
        }
        catch(err){
            res.clearCookie('jwt_authorization');
            res.send({status: 500, payload:'Invalid JWT Token'});
        }
    }
    else {
        res.send({status:500, payload:'No cookies'});
    }
}

app.get('/test',(req,res) => {
    res.send("Hi cuz");
})

app.get('/auth/validateJWT',hasValidJWT,(req,res) => {
    res.send({status: 100, payload:'Valid JWT Token'});
})

app.post('/user/signup', async (req,res) => {
    if(req.cookies){
        if(req.cookies.jwt_authorization) res.clearCookie('jwt_authorization');
    }
    const userInfo = req.body;
    let checkAgainstDB = (checkColumn, checkValue) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM user_profile WHERE ${checkColumn}='${checkValue}'`,(error,results,fields) => {
                if(error) {
                    reject(error);
                    return;
                }
                if(results.length >= 1) {
                    reject(checkColumn);
                    return;
                }
                resolve('No record exists')
            })
        })
    }
    let storeRecord = (email,username,password_hash,timestamp) => {
        return new Promise((resolve,reject) => {
            connection.query(`INSERT INTO user_profile (email,username,password_hash,created_at) VALUES ('${email}','${username}','${password_hash}','${timestamp}')`, (error,results,fields) => {
                if(error){
                    reject(error)
                    return;
                }
                resolve('Record succesfully stored');
            })
        })
    }
    let ErrorCode; let totalError = 0;
    try {
        await checkAgainstDB('username',req.body.username);
    }
    catch(e){
        if(e != 'username') {
            console.log(e) //MySQL error
            return;
        }
        ++totalError; ErrorCode = 501;
    }
    try {
        await checkAgainstDB('email',req.body.email);
    }
    catch(e){
        if(e != 'email') {
            console.log(e) //MySQL error
            return;
        }
        ++totalError; ErrorCode = 502;
    }
    
    if(totalError == 2) {
        res.send({status:503, payload: 'Both in use'});
        return;
    }
    else if(totalError == 1){
        res.send({status:ErrorCode,payload: 'Something in use'});
        return;
    }

    const currentDate = new Date();
    const timestamp = currentDate.getTime() 
    try {
        let passwordHash = await bcrypt.hash(userInfo.password, 10)
        await storeRecord(userInfo.email,userInfo.username,passwordHash,timestamp);  
        res.send({status:100, payload:'Nothing'});
        //return
    }
    catch{
        console.log(e);
    }

})

app.get('/user/serverlist', hasValidJWT, async (req,res) => {
    let getServerList = (uid) => {
        return new Promise((resolve,reject) => {
            connection.query(`SELECT u.user_id,u.room_id,c.room_name FROM user_chat_rooms AS u, chat_rooms AS c WHERE u.user_id=${uid} AND u.room_id=c.room_id`, (error,results,fields) => {
                if(error) {
                    reject(error);
                    return;
                }
                if(results.length < 1) reject('NOSERVERS');
                resolve(results);
            })
        })
    }
    try {
        let servers = await getServerList(res.locals.jwt_authorization.uid);
        let formattedReturn = servers.map((item) => {
            return {
                serverID: item.room_id,
                serverName: item.room_name
            }
        })
        res.send({status:100,payload:{
            username: res.locals.jwt_authorization.username,
            serverList:formattedReturn
        }});
        return;
    } catch(e){
        if(e == 'NOSERVERS') res.send({status:500, payload:{username:res.locals.jwt_authorization.username}});
        else console.log(e);
    }
})

app.post('/auth/user', async (req,res) => {
    let userInfo = req.body;
    let checkUerInfo = (email) => {
        return new Promise((resolve,reject) => {
            connection.query(`SELECT user_id,username,password_hash FROM user_profile WHERE email='${email}'`,(error,results, fields)=> {
                if(error) {
                    reject(error)
                    return;
                };
                if(results.length < 1) reject('No results');
                resolve(results);
            })
        })
    }
    try{
        let returnedUserInfo = await checkUerInfo(req.body.email);
        returnedUserInfo = returnedUserInfo[0];
        await bcrypt.compare(userInfo.pass, returnedUserInfo.password_hash, (err, isSame) => {
            if (err) throw err;
            if (isSame) {
                const accessToken = jwt.sign({uid:returnedUserInfo.user_id, username: returnedUserInfo.username},process.env.ACCESS_TOKEN_SECRET);
                res.cookie('jwt_authorization',accessToken, {httpOnly:true})
                res.send({ status: 100, payload: {username:returnedUserInfo.username} });
            }
            else res.send({ status: 500, payload: 'Incorrect password/email' });
        });

    }
    catch(e){
        console.log(e);
    }

})

app.get('/user/getServerMessages/:serverID', async (req,res) => {
    let fetchMessages = (server, offset, limit) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT m.message_id, m.user_id AS userID, u.username AS username, m.created_at ,m.content AS message
            FROM messages AS m
            JOIN user_profile AS u
            ON m.user_id = u.user_id
            WHERE m.room_id = ${server}
            ORDER BY m.created_at DESC LIMIT ${offset}, ${limit};`, (error, results, fields) => {
                if(error){
                    reject(error);
                    return;
                }
                resolve(results);
            })
        })
    }
    const server = req.params.serverID;
    let redisMessages = await redisClient.lRange(`${server}`,0,30);
    let messageCache = redisMessages.map((item) => {
        return JSON.parse(item);
    })
    
    let listSize = await redisClient.LLEN(server);
    if(messageCache.length < 1) {
        //Try Mysql with range 0 to 30 (LIMIT)
        try { 
            let messages = await fetchMessages(server, 0, 30);
            if(messages.length < 1) {
                res.send({status:400, payload:{
                    origin:'ENDOF',
                    offset: -1,
                    data: []
                }});
                return;
            }
            else {
                res.send({status:100, payload:{
                    origin: 'SQL',
                    offset: 30,
                    data: messages
                }});
                messages.forEach(async element => {
                     await redisClient.rPush(server,JSON.stringify(element));
                });
                return;
            }
        }
        catch(e){
            console.log(e);
        }
    }
    else if(messageCache.length < 30){
        //Get remaining messages from Mysql
        try {
            let messages = await fetchMessages(server,0,30);
            if(messages.length < 1) {
                res.send({staus:100, payload:{
                    origin: 'REDIS',
                    offset: 0, //No more messages to get from redis
                    data: messageCache
                }});
                return;
            }
            else {

                /* Potentially costly operation in the long run */
                //Find the point at whuch a message in the cache is not in the DB,
                //Add those new(old) messages to the cache
                //return object
                //console.log(messages);
                let sameTimeStampIndex = undefined;
                for(let i = 0; i < messageCache.length; i++){
                    if(messages[0] == messageCache[i]){
                        let y = 0;
                        for(let x = i; x < messageCache.length; x++){
                            if(messages[y] != messageCache[x]) {
                                sameTimeStampIndex = y;
                            }
                            ++y;
                        }
                    }
                }
                console.log(sameTimeStampIndex);
                if(sameTimeStampIndex !== undefined){
                    for(let i = sameTimeStampIndex+1; i < messages.length; i++){
                        messageCache.push(messages[i]);
                        //Add to redis cacge also
                        await redisClient.rPush(server,JSON.stringify(messages[i]));
                    }
                }
                //If undefined we already have all the db messages.

                res.send({status:100, payload:{
                    origin:'SQL',
                    offset: messages.length,
                    data:messageCache
                }});
                return
            }
        }
        catch (e) {
            console.log(e)
        }
    }
    else {
        //Return the 30 messages from redis
        res.send({status:100, payload:{
            origin:'REDIS',
            offset: listSize - 30,
            data:messageCache
        }});
        return;
    }

})

app.post('/user/sendServerMessages/:serverID',hasValidJWT, async (req, res) => {
    // {serverID: num , messageContent: 'message'}
    let storeInDB = (values) => {
        return new Promise((resolve, reject) => {
            connection.query(`INSERT INTO messages (room_id, user_id, content, created_at) VALUES ${values}`)
        })
    }
    let userId = res.locals.jwt_authorization.uid;
    let user = res.locals.jwt_authorization.username;
    let data = req.body;
    
    console.log(userId);
    let toInsert = {message_id:uuidv4(), userID: userId, username: user, created_at: Date.now(), message: data.messageContent};
    await redisClient.publish(data.serverID.toString(),JSON.stringify(toInsert));
    await redisClient.lPush(data.serverID.toString(),JSON.stringify(toInsert));
    res.send({status:100, payload:'Recieved'});
})
//url = /user/sendServerMessages/:serverID?origin='SQL'&offset=9?timestamp=3947497
app.get('/user/pagination/:serverID', async (req, res) => {
    //Could be rolled into getServerMessages later

    let sqlQuery = (server, limit, time_stamp) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT m.message_id, m.user_id AS userID, u.username AS username, m.created_at ,m.content AS message
            FROM messages AS m
            JOIN user_profile AS u
            ON m.user_id = u.user_id
            WHERE m.room_id = ${server} AND m.created_at < ${time_stamp}
            ORDER BY m.created_at DESC LIMIT ${limit}`, (error, results, fields) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve(results);
            })
        })
    }
    const origin = req.query.origin;
    const server = req.params.serverID
    console.log(origin);
    if(origin == 'SQL'){
        const timestamp = req.query.timestamp;
        //GET FROM DB
        try {
            let results = [];
            results = await sqlQuery(server, 30, timestamp)
            //Results < 1 mean no more messages
            if(results.length < 1){
                res.send({status:400, payload: {
                    origin:'ENDOF',

                }})
                return;
            }
            //Results < 30 means no more messages but we have messages to return
            else if(results.length < 30){
                res.send({status:100, payload: {
                    origin:'SQL',
                    offset: 0, //Doesent matter
                    data: results
                }})
            }
            //Results == 30, means possible more messages
            else {
                res.send({status:100, payload: {
                    origin:'SQL',
                    offset: 0, //Doesnt matter
                    data: results
                }})
            }
        }
        catch (e){
            console.log(e);
        }
    }
    else if(origin == 'REDIS'){
        const offset = req.query.offset
        const redisSize = await redisClient.LLEN(server);
        const startPoint = (redisSize - parseInt(offset))+1;
        const results = await redisClient.lRange(server.toString(), startPoint, startPoint+30);
        //Results < 30 means get rest from db,
        if(results.length < 30){
            let lastElement = await JSON.parse(await redisClient.lIndex(server.toString(),-1));
            try {
                console.log('In here')
                let messages = await sqlQuery(server, 30, lastElement.created_at);
                console.log('After messages')
                let messageCache = [];
                if(results.length > 0){
                    //Parse to object all elements
                    messageCache = results.map((item) => {
                        return JSON.parse(item);
                    })
                }
                if(messages.length < 1){
                    if(messageCache.length < 1){
                        res.send({status:100, payload:{
                            origin:'ENDOF',
                            offset: -1, 
                            data: messageCache
                        }})
                        return;
                    }
                    else {
                        res.send({status:100, payload:{
                            origin:'SQL',
                            offset: -1, 
                            data: messageCache
                        }})
                        return;
                    }
                }
                else {
                    for(let i = 0; i < messages.length; i++){
                        messageCache.push(messages[i]);
                        if(messageCache.length == 30) break;
                    }
                    res.send({
                        status:100,
                        payload: {
                            origin:'SQL',
                            offset: -2, 
                            data: messageCache
                        }
                    })
                }
            }
            catch(e){
                console.log(e);
            }
        }
        //Results == 30, means pssobly more messages
        else if(results.length == 30){
            let messageCache = results.map((item) => {
                return JSON.parse(item);
            })

            res.send({status:100, payload:{
                origin:'REDIS',
                offset: offset + results.length,
                data: messageCache
            }})
        }
    }

})

app.post('/api/createServer', hasValidJWT, async (req, res) => {
    let insertNewServer = (servername, serverdesc) => {
        return new Promise((resolve, reject) => {
            connection.query(`INSERT INTO chat_rooms (room_name,created_at,description) VALUES ('${servername}', '${Date.now()}', '${serverdesc}');`, (error, results, fields) => {
                if(error){
                    reject(error);
                    return;
                }
                resolve(results);
            })
        })
    }
    let insertNewUserChatRoom = (serverId, userId) => {
        return new Promise((resolve, reject) => {
            connection.query(`INSERT INTO user_chat_rooms (user_id, room_id, joined_at) VALUES (${userId}, ${serverId}, ${Date.now()})`, (error, results, fields) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve('Unneeded');
            })
        })
    }
    let checkForServerExistence = (servername) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM chat_rooms WHERE room_name='${servername}'`, (error, results, fields) => {
                if(error){
                    reject(e);
                    return;
                }
                if(results.length < 1) resolve('NAMEUNIQUE');
                else{
                    reject('NAMENOTUNIQUE');
                }
            })
        })
    }
    try {
        await checkForServerExistence(req.body.serverName);
        let results = await insertNewServer(req.body.serverName, req.body.serverDesc);
        let serverID = results.insertId;
        await insertNewUserChatRoom(serverID,res.locals.jwt_authorization.uid);
        res.send({status:100, payload:{serverid:serverID}});
    }
    catch(e){
        //Handle errors hear
        if(e == 'NAMENOTUNIQUE'){
            res.send({status:400})
            return
        }
        else{
            console.log(e);
            res.send({status:500});
    }
    }
})

app.post('/api/joinServer', hasValidJWT, async (req, res) => {
    let insertNewUserChatRoom = (serverId, userId) => {
        return new Promise((resolve, reject) => {
            connection.query(`INSERT INTO user_chat_rooms (user_id, room_id, joined_at) VALUES (${userId}, ${serverId}, ${Date.now()})`, (error, results, fields) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve('Unneeded');
            })
        })
    }

    try {
        await insertNewUserChatRoom(req.body.serverID, res.locals.jwt_authorization.uid)
        res.send({status:100});
    }
    catch(e) {
        res.send({status:500});
    }
})

app.get('/api/search', hasValidJWT, async (req, res) => {
    let searchQuery = (servername) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT room_id, room_name, description FROM chat_rooms WHERE room_name LIKE '${servername}%' ORDER BY room_name DESC LIMIT 20;`, (error, results, fields) => {
                if(error){
                    reject(error);
                    return;
                }
                resolve(results);
            })
        })
    } 
    let query = req.query.q;
    try {
        let results = await searchQuery(query);
        if(results.length < 1){
            res.send({status:400});
            return;
        }
        else{
            res.send({status:100, payload: {
                data: results
            }})
            return;
        }
    }
    catch(e){
        console.log(e);
        res.send({status:500});
    }

})

app.delete('/api/leaveServer/:serverID', hasValidJWT, async (req, res) => {
    let deleteQuery = (userid, serverid) => {
        return new Promise((resolve, reject) => {
            connection.query(`DELETE FROM user_chat_rooms WHERE user_id=${userid} AND room_id=${serverid}`, (error,results,fields) => {
                if(error){
                    reject(error);
                    return;
                }
                resolve(results) //There should be none?
            })
        })
    }
    try {
        let results = await deleteQuery(res.locals.jwt_authorization.uid, req.params.serverID);
        if(results.affectedRows > 0) {
            res.send({status:100}) //No longer have a connection to said server
        }
        else{
            res.send({status:200}) //No entry matches request
        }
    }
    catch(e){
        console.log(e);
        res.send({status:500}) //Something went wrong server side
    }
})

app.delete('/user/signout', hasValidJWT, (req, res) => {
    res.clearCookie('jwt_authorization');
    res.send({status:100});
})

app.listen(5000,()=>{console.log('Server has started')});