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
                    <p className='Chat-nonuser-image-text'>J</p>
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
    const origin = useRef('');
    const offset = useRef(0);

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
            setMessages([mes,...messages]);
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
                setServerList(data.payload);
            }
            else {
                setChatName('<Please Join Servers>');
            }
        }).catch((e)=> {
            console.log(e);
        })
    } , []) //Get server list on mount


    async function handleServerClick(server){
        //fetch chat messages
        if(serverID != server){
            let rawResults = await fetch(`/user/getServerMessages/${server}`)
            //set chat messages
            let jsonResults = await rawResults.json()
            console.log(jsonResults);
            if(jsonResults.status == 400){
                setMessages([]);
            }
            else if(jsonResults.status == 100){
                setMessages(jsonResults.payload.data);
                origin.current = jsonResults.payload.origin;
                offset.current = jsonResults.payload.data;
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
            <div className="temp-purple" id="Chat-chatroom-main-content">
                {messages.map((element) => {
                    return (
                    <Fragment key={element.message_id}>
                        <NonUserChatBubble text={element.message} date={'today'}></NonUserChatBubble>
                    </Fragment>
                    )
                })}
            </div>
            <div className="temp-yellow" id="Chat-signout-container">
                <p id="Chat-signout-username">Pilot122x</p>
                <button id="Chat-signout-button">Sign Out</button>
            </div>
            <div className="temp-aqua" id="Chat-messaging-main-container">
                <div id="Chat-messaging-content-container">
                    <input type='text' id="Chat-message-box"></input>
                    <button id="Chat-message-submit-btn">Send</button>
                </div>
            </div>
        </div>
        </>
    )
}

export default Chat;