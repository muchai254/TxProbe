import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
} from 'react-router-dom'
import { useState, useCallback } from 'react'
import Landing from './components/Landing'
import TxAnalysis from './components/TxAnalysis'
import AddressAnalysis from './components/AddressAnalysis'

function TxRoute() {
  const { txid } = useParams<{ txid: string }>()
  const navigate = useNavigate()
  if (!txid) return <Navigate to="/" replace />
  return (
    <TxAnalysis txid={txid} source="landing" onBack={() => navigate('/')} />
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const [addressState, setAddressState] = useState<{ address: string } | null>(
    null,
  )

  const handleTxSubmit = useCallback(
    (txid: string) => {
      navigate(`/tx/${txid}`)
    },
    [navigate],
  )

  const handleAddressSubmit = useCallback(
    (address: string) => {
      setAddressState({ address })
      navigate('/address')
    },
    [navigate],
  )

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            onTxSubmit={handleTxSubmit}
            onAddressSubmit={handleAddressSubmit}
          />
        }
      />
      <Route path="/tx/:txid" element={<TxRoute />} />
      <Route
        path="/address"
        element={
          addressState ? (
            <AddressAnalysis
              address={addressState.address}
              onBack={() => {
                setAddressState(null)
                navigate('/')
              }}
              onTxClick={(txid) => navigate(`/tx/${txid}`)}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
