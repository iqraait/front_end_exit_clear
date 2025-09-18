import { useState } from 'react'
import {Route,Routes} from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import HRPage from './pages/HRPage'
import DepartmentPage from './pages/DepartmentPage'
import SetDeptPassword from './pages/SetDeptPassword'
import HRRegister from './pages/HRRegister'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/reg" element={<HRRegister />} />
        <Route path="/hr-page" element={<HRPage />} />
        <Route path="/department-page" element={<DepartmentPage />} />
        <Route path="/set-password" element={<SetDeptPassword />} />
      
    </Routes>
      
    </>
  )
}

export default App
