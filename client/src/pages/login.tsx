import React from 'react'

function LoginPage() {
  return (
    <div className='wrapper'>
      <form action=''>
        <h1>Login</h1>
        <div className='input-box'>
          <input type="text" placeholder='Username' required/>
        </div>
      </form>    
    </div>
  )
}

export default LoginPage
