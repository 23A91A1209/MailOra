import React,{useState} from "react"
import PasswordInput from "../../components/PasswordInput"
import PasswordStrength from "../../components/PasswordStrength"
import toast from "react-hot-toast"
import "../../styles/auth.css"
import axiosClient from "../../helpers/axiosClient"
export default function ProfileChangePassword(){

const[oldPass,setOldPass]=useState("")
const[newPass,setNewPass]=useState("")
const[confirmPass,setConfirmPass]=useState("")
const[loading,setLoading]=useState(false)

const handleSubmit = async () => {

if(!oldPass || !newPass || !confirmPass){

toast.error("All fields are required")
return

}

if(newPass !== confirmPass){

toast.error("Passwords do not match")
return

}

setLoading(true)

try{

const response = await axiosClient.post("/auth/change-password",{
  oldPassword:oldPass,
  newPassword:newPass
})

const res = response.data

if(res.success){

toast.success("Password updated successfully")

setOldPass("")
setNewPass("")
setConfirmPass("")

}else{

toast.error("Old password incorrect")

}

}catch(err){

toast.error("Server error")

}

setLoading(false)

}

return(

<div className="auth-container">

<div className="auth-card">

<h2 className="auth-title">Change Password</h2>

<PasswordInput
placeholder="Old Password"
value={oldPass}
onChange={(e)=>setOldPass(e.target.value)}
/>

<PasswordInput
placeholder="New Password"
value={newPass}
onChange={(e)=>setNewPass(e.target.value)}
/>

<PasswordStrength password={newPass}/>

<PasswordInput
placeholder="Confirm Password"
value={confirmPass}
onChange={(e)=>setConfirmPass(e.target.value)}
/>

<button
className="auth-btn"
onClick={handleSubmit}
disabled={loading}
>

{loading ? "Updating..." : "Update Password"}

</button>

</div>

</div>

)

}
