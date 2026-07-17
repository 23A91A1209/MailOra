
import React,{useState} from "react"
import {FiEye,FiEyeOff} from "react-icons/fi"

export default function PasswordInput({value,onChange,placeholder}){

const[show,setShow]=useState(false)

return(
<div className="password-wrapper">
<input
className="auth-input"
type={show?"text":"password"}
value={value}
onChange={onChange}
placeholder={placeholder}
/>

<span className="eye-icon" onClick={()=>setShow(!show)}>
{show?<FiEyeOff/>:<FiEye/>}
</span>

</div>
)
}
