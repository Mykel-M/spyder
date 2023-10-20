import './chat.css'
import { useState } from 'react';
import { useEffect } from 'react';
import { Fragment } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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

function ServerSearchItem({props,updateServerList, popUpOpen}){
    async function joinServer(){
        let rawResults = await fetch('/api/joinServer', {
            method:'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({serverID:props.room_id})
        })
        let jsonResuls = await rawResults.json();
        if(jsonResuls.status == 100){
            updateServerList(props.room_name, props.room_id);
            popUpOpen(false);
        }
        else {
            alert('Unable to Join this server, possible server Issues');
        }

    }

    return (
    <>
        <div className='ServerCard-container'>
            <h1>{props.room_name}</h1>
            <p>{props.description}</p>
            <button onClick={joinServer}>Join Server</button>
        </div>
    </>
    )
}


function ChatRoomsPopUp({showPopUp, addToServerList}){
    const [isLeftActive, setLeftActive] = useState(true);
    const [newServerName, setNewServerName] = useState('');
    const [newServerDesc, setNewServerDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showError, setShowError] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    async function submitUserInfo(){
        
        let rawResults = await fetch('/api/createServer', {
            method:'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({serverName: newServerName, serverDesc: newServerDesc})
        })
        let jsonResults = await rawResults.json();
        if(jsonResults.status == 100){
            //Success
            alert('Server has been successfully created');
            //Add server to user serverlist
            addToServerList(newServerName, jsonResults.payload.serverid);
            showPopUp(false);
        }
        else if(jsonResults.status == 400){
            //Failure
            setShowError(true);
        }
        else {
            alert('Server Error, Please try again momentarily');
        }
    }

    async function serverSearch() {
        let query = encodeURIComponent(searchQuery);
        let rawResults = await fetch(`/api/search?q=${searchQuery}`);
        let jsonResults = await rawResults.json();
        if(jsonResults.status == 100){
            console.log(jsonResults.payload.data);
            setSearchResults([...jsonResults.payload.data]);
        }
        else if(jsonResults.status == 400){
            setSearchResults([]);
            alert('No Results Found');
        }
        else {
            alert('Server error');
        }
    }

    return (
    <>
        <div className='ChatRoomsPopUp-popup'>
            <button id='ChatRoomsPopUp-close-btn' onClick={() => {showPopUp(false)}}>X</button>
            <div className='ChatRoomsPopUp-headers-container'>
                <div className={'ChatRoomsPopUp-header ' + (isLeftActive ? 'active':'')} onClick={() => setLeftActive(true)}><p>Find Server</p></div>
                <div className={'ChatRoomsPopUp-header ' + (isLeftActive ? '':'active')} onClick={() => setLeftActive(false)}><p>Create Server</p></div>
            </div>
            <div className='ChatRoomsPopUp-content-container'>   
            {isLeftActive ? 
            (<>            
                <div className='ChatRoomsPopUp-search-container'>
                    <input id='ChatRoomsPopUp-searchbox' type='text' onChange={(e) => setSearchQuery(e.target.value)}/>
                    <input id='ChatRoomsPopUp-submitSearch' type='button' value={'Search'} onClick={serverSearch} disabled={searchQuery.length < 3}></input>
                </div>
                <div className='ChatRoomsPopUp-results-container'>
                    {searchResults.map((item) => {
                        return (
                            <Fragment key={item.room_id}>
                                <ServerSearchItem props={item} updateServerList={addToServerList} popUpOpen={showPopUp}></ServerSearchItem>
                            </Fragment>
                        )
                    })}
                    
                </div>
            </>): 
            <>
                <div id='ChatRoomsPopUp-createServer-container'>
                    <div className='ChatRoomsPopUp-main-content'>
                        <p className='ChatRoomsPopUp-title'>Server Name {showError ? <span id='ChatRoomsPopUp-error-text'>(Server name taken)</span> : <></>}</p>
                        <input type='text' className={showError ? 'ChatRoomsPopUp-error-border' : ''} id='ChatRoomsPopUp-inputField' onChange={(e) => {setNewServerName(e.target.value); setShowError(false)}}></input>
             
                        <p className='ChatRoomsPopUp-title'>Server Description</p>
                        <textarea id='ChatRoomsPopUp-textAreaField' onChange={(e) => {setNewServerDesc(e.target.value)}}></textarea>
                    </div>
                    <div id='ChatRoomsPopUp-button-container'>
                        <input type='button' id='ChatRoomsPopUp-submit' value='Submit' onClick={() => {submitUserInfo()}}></input>
                    </div>
                </div>
            </>}
            </div>
        </div>
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
    const [displayPopUp, setDisplayPopUp] = useState(false);
    const origin = useRef('');
    const offset = useRef(0);
    const inputRef = useRef(null);
    const chatRef = useRef(null);
    let navigate = useNavigate();

    
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
        //Unsubscribe from previous chat
        if(serverID != 0 && server != serverID){
            const event = {
                type:'unsubscribe',
                data: server
            }
            webSocket.send(JSON.stringify(event));
        }
        //fetch chat messages
        if(serverID != server){
            let rawResults = await fetch(`/user/getServerMessages/${server}`)
            //set chat messages
            let jsonResults = await rawResults.json()
            console.log('In here for server: ' + server);
            console.log(jsonResults);
            if(jsonResults.status == 400){
                setMessages([]);
                origin.current = jsonResults.payload.origin;
            }
            else if(jsonResults.status == 100){
                setMessages([...jsonResults.payload.data]);
                origin.current = jsonResults.payload.origin;
                offset.current = jsonResults.payload.offset;
                console.log('In here: ' + server);
                console.log(jsonResults);
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

    function addToServerList(name, id){
        setServerList([...serverList, {serverID:id, serverName:name}]);
    }

    async function leaveServer() {
        let rawResponse = await fetch(`/api/leaveServer/${serverID}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        })
        let jsonResponse = await rawResponse.json();
        if(jsonResponse.status == 100){
            let copy = serverList.filter((item) => {
                return item.serverID != serverID;
            })
            setServerList(copy);
            if(copy.length >= 1) {
                handleServerClick(copy[0].serverID)
            }
            else {
                setServerID(0);
                setChatName('Default');
            }
            
        }
        else if(jsonResponse.status == 200){
            alert('Invalid Request, No longer in server');
        }
        else {
            alert('Server Error');
        }
    }

    async function signout(){
        let rawResponse = await fetch('/user/signout', {
            method:'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        })

        let jsonData = await rawResponse.json();
        if(jsonData.status == 100){
            sessionStorage.removeItem('isLogged');
            navigate('/login')
        }
    }

    return (
        <>
       {displayPopUp ? <ChatRoomsPopUp showPopUp={setDisplayPopUp} addToServerList={addToServerList}></ChatRoomsPopUp> : <></>}
        <div id="Chat-container-grid">
            <div className="temp-red" id="Chat-chatroom-btn-container">
                <button id='Chat-addchatroom-btn' onClick={() => {setDisplayPopUp(true);}}>Add Chat Room</button>
            </div>
            <div id="Chat-chatroom-desc-main-container">
                <div id="Chat-chatroom-desc-content-container">
                    <p id="Chat-title-text">{chatName}</p>
                    <div id="Chat-spacer"></div>
                    <button id="Chat-leave-btn" onClick={() => leaveServer()}>Leave Chat</button>
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
                <button id="Chat-signout-button" onClick={() => alert(serverID)}>Sign Out</button>
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