
import React,{useRef} from "react"

export default function OTPInput({otp,setOtp}){

const inputs = useRef([])

const handleChange=(value,index)=>{

if(!/^[0-9]?$/.test(value)) return

const newOtp=[...otp]
newOtp[index]=value
setOtp(newOtp)

if(value && index<5)
inputs.current[index+1].focus()

}

return(
<div className="otp-container">
{otp.map((digit,i)=>(
<input
key={i}
className="otp-box"
value={digit}
maxLength="1"
ref={el=>inputs.current[i]=el}
onChange={(e)=>handleChange(e.target.value,i)}
/>
))}
</div>
)
}
