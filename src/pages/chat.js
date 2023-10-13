import './chat.css'
import { useState } from 'react';
import { useEffect } from 'react';
import { Fragment } from 'react';
import { useRef } from 'react';

function UserChatBubble({text,date}) {
    return (
    <>
        <div className='Chat-user-text-container'>
            <div className="Chat-user-text-content">
                <div className="Chat-user-generic-container">
                    <div className="Chat-user-text">
                        <p className="Chat-user-text-item">{text}</p>
                    </div>
                    <p className="Chat-user-text-date">{date}</p>
                </div>
            </div>
        </div>
    </>
    )
}

function NonUserChatBubble({userName, text, date}){
    return (
        <>
            <div className='Chat-nonuser-text-container'>  
                <div className='Chat-nonuser-image'>
                    <p className='Chat-nonuser-image-text'>{userName.charAt(0).toUpperCase()}</p>
                </div>
                <div className="Chat-nonuser-text-content">
                    <div className="Chat-nonuser-generic-container">
                        <div className="Chat-user-text">
                            <p className="Chat-user-text-item">{text}</p>
                        </div>
                        <p className="Chat-nonuser-text-date">{date}</p>
                    </div>
                </div>
            </div> 
        </>
    )
}

function ServerListItem({serverName, serverID}){
    return (
    <>
        
    </>
    )
}

function Chat(){
    const [serverList, setServerList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [chatName, setChatName] = useState('Default');
    const [serverID, setServerID] = useState(0);
    const [webSocket, setWebSocket] = useState(undefined);
    const [textInput, setTextInput] = useState('')
    const [username, setUserName] = useState('')
    const origin = useRef('');
    const offset = useRef(0);
    const inputRef = useRef(null);
    const chatRef = useRef(null);
    
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080')

        socket.onopen = () => {
            console.log('Websocket connection established');
        }

        socket.onclose = () => {
            console.log('Websocker Connection Closed');
        }

        socket.onerror = (e) => console.log(e);
        
        socket.onmessage = (mes) => {
            console.log('Message recieved: ' + mes.data);
            let newList = [JSON.parse(mes.data),...messages];
            console.log(newList);
            setMessages((prevMessages) => {
                const newMessage = JSON.parse(mes.data);
                return [newMessage, ...prevMessages];
              });
        }

        setWebSocket(socket);
        return () => {
            socket.close();
        }
    }, []) //Setup websocket connection;

    useEffect(()=> {
        fetch('/user/serverlist').then((data) => data.json()).then((data) => {
            if(data.status == 100){
                console.log(data);
                setServerList(data.payload.serverList);
            }
            else {
                setChatName('<Please Join Servers>');
            }
            setUserName(data.payload.username);
        }).catch((e)=> {
            console.log(e);
        })
    } , []) //Get server list on mount

     function paginate(){
        console.log(messages);
        return new Promise(async (resolve,reject) => {
            if(origin.current == 'ENDOF'){
                reject('ENDOF');
                return;
            }

            //Origin is either SQL or REDIS
            if(origin.current == 'SQL'){
                let rawResults = await fetch(`/user/pagination/${serverID}?origin=${origin.current}&timestamp=${messages[messages.length-1].created_at}`)
                let jsonData = await rawResults.json();
                if(jsonData.payload.origin == 'ENDOF'){
                    origin.current = jsonData.payload.origin;
                    reject('ENDOF');
                    return;
                    //Somehow alert the user there is no more messages to load
                }
                else {
                    origin.current = jsonData.payload.origin;
                    setMessages([...messages, ...jsonData.payload.data]);
                }
            }
            else { //Origin is REDIS
                //console.log(offset);
                let rawResults = await fetch(`/user/pagination/${serverID}?origin=${origin.current}&offset=${offset.current}`)
                let jsonData = await rawResults.json();
                console.log('JSON DATA:')
                console.log(jsonData.payload.offset);
                console.log(jsonData.payload.origin);
                //console.log('Message DATA:')
                //console.log(messages);
                origin.current = jsonData.payload.origin;
                if(jsonData.payload.orgin == 'ENDOF'){
                    //SET END OF AND ALERT USER
                    reject('ENDOF');
                    return;
                }
                else if(jsonData.payload.orgin == 'REDIS'){
                    offset.current = jsonData.payload.offset;
                    setMessages([...messages,...jsonData.payload.data]);
                }
                else { //mysql
                    setMessages([...messages,...jsonData.payload.data]);
                }
            }
            resolve('OK');
        })

    }

    async function handleServerClick(server){
        //fetch chat messages
        if(serverID != server){
            let rawResults = await fetch(`/user/getServerMessages/${server}`)
            //set chat messages
            let jsonResults = await rawResults.json()
            console.log(jsonResults);
            if(jsonResults.status == 400){
                setMessages([]);
                origin.current = jsonResults.payload.origin;
            }
            else if(jsonResults.status == 100){
                setMessages(jsonResults.payload.data);
                origin.current = jsonResults.payload.origin;
                offset.current = jsonResults.payload.offset;
            }
            //set chat name
            let serverName;
            serverList.forEach(element => {
                if(element.serverID == server)  {
                    serverName = element.serverName;
                    return;
                }
            })

            setServerID(server);
            setChatName(serverName);
            
            
            const event = {
                type:'subscribe',
                data: server
            }
            webSocket.send(JSON.stringify(event));
        }
    }

    async function sendMessage(){
        const send = await fetch(`/user/sendServerMessages/${serverID}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serverID: serverID,
                messageContent: textInput
            })
        })

        const data = await send.json();
        if(data.status == 100){
            setTextInput('');
            inputRef.current.value = '';
            console.log('Message sent');
        }
    }

    async function handleScroll(){
        if(-chatRef.current.scrollTop + chatRef.current.offsetHeight >= chatRef.current.scrollHeight) {
            try {
                await paginate();
                chatRef.current.scrollTop += 100; //Push sown scrollbar a little
            }
            catch(e){
                if(e == 'ENDOF') console.log('No more messages');
            }
        }
    }

    return (
        <>
        <div id="Chat-container-grid">
            <div className="temp-red" id="Chat-chatroom-btn-container">
                <button id='Chat-addchatroom-btn'>Add Chat Room</button>
            </div>
            <div id="Chat-chatroom-desc-main-container">
                <div id="Chat-chatroom-desc-content-container">
                    <p id="Chat-title-text">{chatName}</p>
                    <div id="Chat-spacer"></div>
                    <button id="Chat-leave-btn">Leave Chat</button>
                </div>
            </div>
            <div className="temp-green" id="Chat-chatroom-list-container">
                {serverList.map((item) => {
                    return (
                        <Fragment key={item.serverID}>
                            <div className='Chat-chatroom-server' onClick={() => handleServerClick(item.serverID)}>
                                <p className='Chat-chatroom-server-name'>{item.serverName}</p>
                            </div>
                        </Fragment>
                    )
                })}
            </div>
            <div className="temp-purple" id="Chat-chatroom-main-content" ref={chatRef} onScroll={() => {handleScroll()}}>
                {messages.map((element) => {
                    if(element.username != username) return (
                        <Fragment key={element.message_id}>
                            <NonUserChatBubble userName={element.username} text={element.message} date={'today'}></NonUserChatBubble>
                        </Fragment>
                    )
                    else return (
                        <Fragment key={element.message_id}>
                            <UserChatBubble text={element.message} date={'today'}></UserChatBubble>
                        </Fragment>
                        )
                })}
            </div>
            <div className="temp-yellow" id="Chat-signout-container">
                <p id="Chat-signout-username">{username}</p>
                <button id="Chat-signout-button" onClick={() => console.log(messages)}>Sign Out</button>
            </div>
            <div className="temp-aqua" id="Chat-messaging-main-container">
                <div id="Chat-messaging-content-container">
                    <input type='text' id="Chat-message-box" onChange={(e) => setTextInput(e.target.value)} ref={inputRef}></input>
                    <button id="Chat-message-submit-btn" onClick={(e) => sendMessage()} disabled={textInput == ''}>Send</button>
                </div>
            </div>
        </div>
        </>
    )
}

export default Chat;