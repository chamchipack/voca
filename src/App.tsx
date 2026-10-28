import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Study from './pages/Study'
import Words from './pages/Words'
import Settings from './pages/Settings'
import CsvImport from './pages/CsvImport'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="study" element={<Study />} />
          <Route path="words" element={<Words />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/import" element={<CsvImport />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
