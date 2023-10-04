import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState } from 'react';
import './login.css'
import {useNavigate} from 'react-router-dom';
import { useEffect } from 'react';


function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);
    let navigate = useNavigate();

    useEffect(() => {
        async function checkCookie() {
            if(sessionStorage.getItem('isLogged') != null){
                console.log('In here');
                //LoggedIn token found, verify that JWT is valid and skip Log in screen
                let rawResponse = await fetch('/auth/validateJWT');
                let jsonResponse = await rawResponse.json();
                if(jsonResponse.status == 100){
                    navigate('/');
                }
                else {
                    sessionStorage.removeItem('isLogged'); 
                }
                console.log(jsonResponse);
                }
            else {
                console.log('No such localStorage');
            }
    }
        checkCookie();
        return () => {
            console.log('Do nothing');
        }
    },[]);

   async function signIn(){
        try {
            let rawResponse = await fetch('/auth/user', {
                method: 'POST',
                headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({email: email, pass: password})
            })
            let jsonResponse = await rawResponse.json();
            if(jsonResponse.status == 100){
                setShowError(false);
                sessionStorage.setItem('isLogged','true');
                navigate('/');
            }
            else if(jsonResponse.status == 500){
                setShowError(true);
            }
        }
        catch(e) {
            console.log("Failed to handle Sign In: " + e) //Need better error handling.
        }
    }
    function isValidEmail(val){
        var re = /\S+@\S+\.\S+/;
        if(val == ''){
            return false;
        }
        return re.test(val) == true;
    }

    function changeEmail(val){
        setEmail(val);
        setShowError(false);
    }
    function changePassword(val){
        setShowError(false);
        setPassword(val);
    }

    return (
    <> 
        <div className='Login-container'>
            <div className='Login-Box'>
                {showError ? <p className='Login-fail-text'>Incorrect email or password. Try again.</p>: <></>}
                <div className='Login-main-items'>
                    <div className='Login-email-field'>
                        <p className='Login-label'>Email</p>
                        <input className={showError ? "Login-input Login-fail-border-coloring": "Login-input"} onChange={(e) => {changeEmail(e.target.value)}} type="text" id="login-email"></input>
                    </div>
                    <div className='Login-password-field'>
                        <p className='Login-label'>Password</p>
                        <input className={showError ? "Login-input Login-fail-border-coloring": "Login-input"} onChange={(e) => {changePassword(e.target.value)}} type="password" id="login-password"></input>
                    </div>
                    <input className="Login-button" type="submit" value="Login" onClick={signIn} disabled={(email == '' || password == '' || showError == true || !isValidEmail(email)) ? true:false}></input>
                </div>
            </div>
        </div>
        
    </>)
}

export default Login;