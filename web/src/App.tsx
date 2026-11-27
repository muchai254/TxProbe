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
import HowItWorks from './components/HowItWorks'
import type { HistoryKind } from './lib/api'

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
  const [historyState, setHistoryState] = useState<{
    kind: HistoryKind
    id: string
  } | null>(null)

  const handleTxSubmit = useCallback(
    (txid: string) => {
      navigate(`/tx/${txid}`)
    },
    [navigate],
  )

  const handleHistorySubmit = useCallback(
    (kind: HistoryKind, id: string) => {
      setHistoryState({ kind, id })
      navigate(`/${kind}`)
    },
    [navigate],
  )

  const historyRoute = (kind: HistoryKind) =>
    historyState?.kind === kind ? (
      <AddressAnalysis
        kind={kind}
        address={historyState.id}
        onBack={() => {
          setHistoryState(null)
          navigate('/')
        }}
        onTxClick={(txid) => navigate(`/tx/${txid}`)}
      />
    ) : (
      <Navigate to="/" replace />
    )

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing
            onTxSubmit={handleTxSubmit}
            onHistorySubmit={handleHistorySubmit}
          />
        }
      />
      <Route path="/tx/:txid" element={<TxRoute />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/address" element={historyRoute('address')} />
      <Route path="/wallet" element={historyRoute('wallet')} />
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
