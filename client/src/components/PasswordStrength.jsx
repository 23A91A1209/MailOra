
import React from "react"

export default function PasswordStrength({password}){

const getStrength=()=>{

let score=0

if(password.length>6) score++
if(/[A-Z]/.test(password)) score++
if(/[0-9]/.test(password)) score++
if(/[!@#$%^&*]/.test(password)) score++

return score
}

const strength=getStrength()
const labels=["Weak","Fair","Good","Strong"]

return(
<div style={{marginBottom:"15px"}}>

<div style={{height:"6px",background:"#333",borderRadius:"4px"}}>
<div
style={{
width:`${strength*25}%`,
height:"6px",
background: strength<=1?"red":strength==2?"orange":"lime"
}}
/>
</div>

<p style={{fontSize:"12px",marginTop:"5px",color:"#bbb"}}>
{password && labels[strength-1]}
</p>

</div>
)
}
