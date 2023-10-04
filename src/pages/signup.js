import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState } from 'react';
import './signup.css'
import {useNavigate} from 'react-router-dom';
import { useEffect } from 'react';
import { isLowerCase, isSpecialCharacter, isUpperCase } from '../utility';



function SignUp(){
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState({
        emailError: false,
        emailErrorMsg: 'Invalid Format',
        passwordError:false,
        passwordErrorMsg: 'Min Length: 8',
        userNameError:false,
        userNameErrorMsg: 'Min Lenght: 3'
    });
    let navigate = useNavigate();

    function validateEmail(e){
        var re = /\S+@\S+\.\S+/;
        if(e.target.value == ''){
            setShowError({...showError,emailError:false});
        }
        else if(re.test(e.target.value) == true){
            setShowError({...showError,emailError:false});
        }
        else{
            setShowError({...showError,emailError:true,emailErrorMsg: 'Invalid Format'});
        }

        setEmail(e.target.value);
    }

    function validateUserName(e){
        let val = e.target.value;
        if(val == ''){
            setShowError({...showError,userNameError:false});
        }
        else if(val.length < 3){
            setShowError({...showError,userNameError:true,userNameErrorMsg: 'Min Lenght: 3'});
        }
        else{
            setShowError({...showError,userNameError:false});
        }
        setUserName(val);
    }

    function validatePassword(e){
        let val = e.target.value;
        if(val == ''){
            setShowError({...showError,passwordError:false});
        }
        else if(val.length < 8){
            setShowError({...showError,passwordError:true, passwordErrorMsg: 'Min Length: 8'});
        }
        else {
            let upperCaseCount = 0; let lowerCaseCount = 0; let specialCount = 0;
            for(let c of val){
                if(isSpecialCharacter(c)) ++specialCount;
                else if(isUpperCase(c)) ++upperCaseCount;
                else if(isLowerCase(c)) ++lowerCaseCount;
            }
            if(upperCaseCount == 0){
                setShowError({...showError,passwordError:true,passwordErrorMsg:'Must include uppercase letters!'});
            }
            else if(lowerCaseCount == 0){
                setShowError({...showError,passwordError:true,passwordErrorMsg:'Must include lowercase letters!'});
            }
            else if(specialCount == 0){
                setShowError({...showError,passwordError:true,passwordErrorMsg:'Must include special characters!'});
            }
            else{
                setShowError({...showError,passwordError:false});
            }
        }
        setPassword(val);
    }

    async function signup(){
        try {
        const rawResponse = await fetch('/user/signup', {
            method:'POST',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({email:email,username:userName, password:password})
        });
        let response = await rawResponse.json();
        if(response.status == 100){
            navigate('/login');
        }
        else if(response.status == 501){ //User name taken
            setShowError({...showError,userNameError:true,userNameErrorMsg: 'Username in use'});
        }
        else if(response.status == 502) { //Email in use
            setShowError({...showError,emailError:true,emailErrorMsg: 'Email in use'});
        }
        else if(response.status == 503) { //Both in use
            setShowError({...showError,userNameError:true,userNameErrorMsg: 'Username in use',emailError:true,emailErrorMsg: 'Email in use'});
        }
        }
        catch{
            console.log('Failed to sign up') //Better error handling needed
        }
    }

    return (
        <>
         <div className='Signup-container'>
            <div className='Signup-Box'>
                <div className='Signup-main-items'>
                    <div className='Signup-username-field'>
                        <p className='Signup-label'>User Name {showError.userNameError ? <p className='Signup-fail-text Signup-inline'>({showError.userNameErrorMsg})</p>:<></>}</p>
                        <input className={showError.userNameError ? "Signup-input Signup-fail-border-coloring": "Signup-input"} onChange={(e) => {validateUserName(e)}} type="text" id="Signup-username"></input>
                    </div>
                    <div className='Signup-email-field'>
                        <p className='Signup-label'>Email {showError.emailError ? <p className='Signup-fail-text Signup-inline'>({showError.emailErrorMsg})</p>:<></>}</p>
                        <input className={showError.emailError ? "Signup-input Signup-fail-border-coloring": "Signup-input"} onChange={(e) => {validateEmail(e)}} type="text" id="Signup-email"></input>
                    </div>
                    <div className='Signup-password-field'>
                        <p className='Signup-label'>Password {showError.passwordError ? <p className='Signup-fail-text Signup-inline'> ({showError.passwordErrorMsg})</p>:<></>}</p>
                        <input className={showError.passwordError ? "Signup-input Signup-fail-border-coloring": "Signup-input"} onChange={(e) => {validatePassword(e)}} type="password" id="Signup-password"></input>
                    </div>
                    <input className="Signup-button" type="submit" value="Sign Up" onClick={() => signup()} disabled={(showError.passwordError || showError.emailError || showError.userNameError || userName == '' || email == '' || password == '') ? true:false}></input>
                </div>
            </div>
        </div>
        </>
    )
}

export default SignUp;