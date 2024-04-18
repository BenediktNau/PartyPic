import React from "react";



function LoginPage() {
  return (
    <div className="wrapper, justify-center, w-screen, h-screen">
      <div className="h-full, w-full">
        <div className="flex justify-center">
          <form action="">
            <h1 className="flex justify-center">Login</h1>
            <div className="input-box, border-2">
              <input type="text" placeholder="Username" required />
            </div>
            <div className="">
              <button type="submit">Login</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
