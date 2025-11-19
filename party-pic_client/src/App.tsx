
import './App.css'
import { AuthProvider, useAuth } from './auth.context'
import CameraView from './views/camera.view'

function App() {


  return (
    <div className=''>
      <AuthProvider >
        <CameraView />
      </AuthProvider>
    </div>
  )
}

export default App
