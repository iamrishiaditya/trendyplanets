import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { getPowerPoint } from './data/power'

// --- FUNKY 3D ORB COMPONENT ---
function FunkyOrb({ color, speed, distort }) {
  const meshRef = useRef()
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })
  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.8}>
      <MeshDistortMaterial color={color} envMapIntensity={1} clearcoat={1} clearcoatRoughness={0.1} metalness={0.8} roughness={0.2} distort={distort} speed={speed} />
    </Sphere>
  )
}
// --- FUTURE TIMELINE 3D SIMULATOR (Realistic Urban Infrastructure Node) ---
function ProjectedEcosystem({ localData, apiData, targetYear }) {
  const systemRef = useRef()
  const waterRef = useRef()
  const heatDomeRef = useRef()
  const landRef = useRef()

  const yearsAhead = targetYear - 2024;
  
  // Real NASA OLS Trends scaling across decades
  const heatTrend = (apiData.trends.temperature.perDecade / 10) * yearsAhead;
  const rainTrend = (apiData.trends.precipitation.perDecade / 10) * yearsAhead;

  // Actual starting rain from the NASA IMERG .HDF5 file you downloaded
  const startingRain = localData.rain_mm_hr !== 'N/A' ? localData.rain_mm_hr : 0.05;

  useFrame((state) => {
    if (!systemRef.current) return
    const t = state.clock.elapsedTime
    systemRef.current.rotation.y = t * 0.1 // Spin the city slowly
    
    // 1. URBAN FLOOD RISK: Rain intensity raises the local water plane
    // It scales up massively if NASA trends predict increasing future precipitation
    const floodRisk = startingRain * 2 + (rainTrend * 1.2);
    const targetWaterY = -1.2 + floodRisk;
    waterRef.current.position.y += (targetWaterY - waterRef.current.position.y) * 0.05;
    
    // 2. URBAN HEAT ISLAND EFFECT (Heat Dome)
    // Positive temperature trends create a suffocating red heat shield over the city block
    const heatStress = Math.max(0, heatTrend);
    const targetOpacity = Math.min(0.7, heatStress * 0.8);
    heatDomeRef.current.material.opacity += (targetOpacity - heatDomeRef.current.material.opacity) * 0.05;

    // 3. TERRAIN DESERTIFICATION (Vegetation Health)
    // If getting hotter, the land transitions from lush green to dry desert brown
    const dryingFactor = Math.min(1, Math.max(0, heatTrend * 0.5));
    const climateColor = new THREE.Color().lerpColors(
      new THREE.Color("#4ade80"), // Healthy vegetation
      new THREE.Color("#854d0e"), // Dry parched earth
      dryingFactor
    );
    landRef.current.material.color.lerp(climateColor, 0.1);
  })

  return (
    <group ref={systemRef}>
      {/* City Foundation (Slab of Earth) */}
      <mesh ref={landRef} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 1, 64]} />
        <meshStandardMaterial color="#4ade80" flatShading />
      </mesh>

      {/* Construction/Infrastructure Blocks (e.g. Substation, Facility, Residential) */}
      <group position={[0, 0, 0]}>
        <mesh position={[-0.5, 0.4, 0.5]} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.6, 0.6, -0.3]} castShadow>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-0.2, 0.25, -0.7]} castShadow>
          <boxGeometry args={[1, 0.5, 0.8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>

      {/* The Urban Heat Dome (Rises with Temperature) */}
      <mesh ref={heatDomeRef} position={[0, -0.01, 0]}>
        {/* A half-sphere covering the city */}
        <sphereGeometry args={[2.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* The Flood Water Level (Rises with Rain/IMERG anomalies) */}
      <mesh ref={waterRef} position={[0, -2, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 2.5, 64]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.65} />
      </mesh>
    </group>
  )
}
// -------------------------------------------------------------------------
const places = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
]

const metrics = [
  { key: 'temperature', label: 'Air temperature', unit: '°C', accent: '#ff935d', detail: 'Annual mean at 2 m' },
  { key: 'precipitation', label: 'Precipitation', unit: 'mm/day', accent: '#54c9ef', detail: 'Annual mean daily rate' },
  { key: 'humidity', label: 'Relative humidity', unit: '%', accent: '#bda6ff', detail: 'Annual mean at 2 m' },
  { key: 'wind', label: 'Wind speed', unit: 'm/s', accent: '#a4e775', detail: 'Annual mean at 2 m' },
]

const displayCoordinate = (value, positive, negative) =>
  Math.abs(value).toFixed(4) + '° ' + (value >= 0 ? positive : negative)

const signed = (value, places = 1) => (value > 0 ? '+' : '') + value.toFixed(places)

function MapEvents({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lon: event.latlng.lng, label: 'Selected point' })
    },
  })
  return null
}

function FocusMap({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 8), { duration: 0.65 })
  }, [map, point])
  return null
}

function MiniChart({ values, accent }) {
  const width = 220
  const height = 72
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = 5 + (index * 210) / (values.length - 1)
    const y = 7 + ((max - value) * 55) / range
    return x + ',' + y
  }).join(' ')
  return <svg className="mini-chart" viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
    <path d="M4 65 H216" className="chart-base" />
    <polyline points={points} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function Stat({ metric, values, trend }) {
  const latest = values.at(-1)
  const places = metric.key === 'temperature' || metric.key === 'wind' ? 1 : 0
  return <article className="stat-card">
    <div className="stat-top"><span className="stat-dot" style={{ background: metric.accent }} /><span>{metric.label}</span><strong style={{ color: trend.perDecade > 0 ? '#ff9a71' : '#67cdea' }}>{signed(trend.perDecade, places)} / decade</strong></div>
    <div className="stat-value">{latest.toFixed(places)}<small>{metric.unit}</small></div>
    <span className="stat-detail">{metric.detail}</span>
    <MiniChart values={values} accent={metric.accent} />
  </article>
}

function Inspector({ state, point, onOpenAdvanced, onRetry, onReset }) {
  const [simYear, setSimYear] = useState(2024);

  useEffect(() => {
    setSimYear(2024);
  }, [point]);

  if (!point) {
    return <aside className="inspector empty-state">
      <div className="three-container">
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 5, 2]} intensity={2} />
          <FunkyOrb color="#4cd8d6" speed={2} distort={0.4} />
        </Canvas>
      </div>
      <p className="eyebrow">Point inspector</p>
      <h1>Pick a point<br />on the map.</h1>
      <p>NASA Earth systems will load for the exact coordinates you select.</p>
      <div className="hint-line"><span>✦</span> Live satellite connection active</div>
    </aside>
  }

  if (state.status === 'loading') {
    return <aside className="inspector loading-state">
      <div className="three-container">
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 5, 2]} intensity={3} />
          <FunkyOrb color="#eaff67" speed={6} distort={0.8} />
        </Canvas>
      </div>
      <p className="eyebrow">Crunching Data Variables</p>
      <h1>Analyzing<br />this point.</h1>
      <p>Retrieving NASA meteorology and projecting trend impacts for {displayCoordinate(point.lat, 'N', 'S')}, {displayCoordinate(point.lon, 'E', 'W')}.</p>
    </aside>
  }

  if (state.status === 'error') {
    return <aside className="inspector error-state">
      <span className="error-mark">!</span>
      <p className="eyebrow">Data request paused</p>
      <h1>We could not load<br />this point.</h1>
      <p>{state.message}</p>
      <button className="solid-button" onClick={onRetry}>Try again <span>↗</span></button>
      <button className="quiet-button" onClick={onReset}>Choose another point</button>
    </aside>
  }
  if (state.status === 'geofence') {
    return <aside className="inspector error-state" style={{borderLeft: '5px solid #ff956a'}}>
      <span className="error-mark" style={{background: 'transparent', border: '1px solid #ff956a', color: '#ff956a'}}>✕</span>
      <p className="eyebrow" style={{color: '#ff956a'}}>Region Unsupported</p>
      <h1>Out of<br/>bounds.</h1>
      <p>{state.message}<br/><br/>You currently only have offline SRTM, IMERG, and LST datasets downloaded for <strong>New Delhi (28°N, 77°E)</strong>. Please click near there.</p>
      <button className="solid-button" onClick={onReset} style={{background: '#ff956a'}}>Clear coordinate <span>×</span></button>
    </aside>
  }

  const { data } = state
  const heat = data.trends.temperature.perDecade
  const rain = data.trends.precipitation.perDecade
  
  return <aside className="inspector result-state" style={{paddingTop: '20px'}}>
    
    <div className="inspector-top" style={{marginBottom: '15px'}}>
      <div><p className="eyebrow" style={{color: 'var(--lime)'}}>NASA PREDICTION SIMULATOR</p>
      <h1 style={{fontSize: '28px'}}>{point.label}</h1></div>
      <button className="close-point" aria-label="Clear selected point" onClick={onReset}>×</button>
    </div>

  {/* THE NEW HACKATHON 3D VISUALIZER WIDGET */}
    <div className="simulator-window" style={{ flexShrink: 0, minHeight: '340px' }}>
       <div className="canvas-frame" style={{ height: '240px', width: '100%' }}>
          <Canvas camera={{ position: [0, 3, 9] }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <ProjectedEcosystem localData={state.localData} apiData={state.data} targetYear={simYear} />
          </Canvas>
       </div>
       
       <div className="timeline-hud">
          <label className="time-lbl">TARGET YEAR: <span style={{ fontSize: '18px' }}>{simYear}</span></label>
          <input type="range" className="time-slider" min="2024" max="2150" value={simYear} onChange={(e) => setSimYear(parseInt(e.target.value, 10))} />
          <p className="time-info">Drag to fast-forward into the future! Earth’s geometry will morph, flood, or erupt physically depending on how severe NASA's baseline trends run in your location.</p>
       </div>
    </div>
    <div className="signal-stack" style={{marginTop: '0', borderTop: 'none'}}>
      <div className="signal"><span className="signal-icon heat">↗</span><div><strong>Heat trend {heat >= 0 ? 'rising' : 'falling'}</strong><p>{signed(heat, 1)} °C per decade in the retrieved record</p></div></div>
      <div className="signal"><span className="signal-icon rain">≈</span><div><strong>Rainfall trend {rain >= 0 ? 'rising' : 'falling'}</strong><p>{signed(rain, 1)} mm/day per decade in the retrieved record</p></div></div>
    </div>

    {/* REAL SUITABILITY MODEL powered by Python Backend parsing NASA files */}
    <div className="model-block funky-model">
      <div><span className="model-status ready" /> Data-Driven Feasibility (New Delhi Node)</div>
      
      <div className="score-row">
        <div className="score-box">
          <span className="score-label">Terrain Elevation</span>
          <strong className="score-val" style={{color: '#eaff67', fontSize: '18px !important'}}>
            {state.localData.elevation_meters !== 'N/A' ? `${state.localData.elevation_meters}` : '--' } <small>m</small>
          </strong>
        </div>
        <div className="score-box">
          <span className="score-label">Terrain Slope</span>
          <strong className="score-val" style={{color: state.localData.slope_percentage === 'N/A' ? '#a7bec5' : (state.localData.slope_percentage < 5 ? '#a4e775' : '#ff956a'), fontSize: '18px !important'}}>
            {state.localData.slope_percentage !== 'N/A' ? `${state.localData.slope_percentage}` : '--' } <small>%</small>
          </strong>
        </div>
        <div className="score-box">
          <span className="score-label">Peak Sat Rain</span>
          <strong className="score-val" style={{color: state.localData.rain_mm_hr > 2.0 ? '#ff956a' : '#4cd8d6', fontSize: '18px !important'}}>
            {state.localData.rain_mm_hr !== 'N/A' ? `${state.localData.rain_mm_hr}` : '--'} <small>mm/hr</small>
          </strong>
        </div>
      </div>
      
      <div className="score-row">
         <div className="score-box" style={{width: '100%', padding: '8px', background: '#0a1d26'}}>
             <span className="score-label" style={{marginBottom: '5px'}}>Vulnerability Summary</span>
             
             {/* Dynamic Warning for Slope */}
             {(state.localData.slope_percentage !== 'N/A') && (state.localData.slope_percentage < 5.0 ? (
               <div style={{color: '#a4e775', fontSize: '11px', fontWeight: 'bold'}}>✓ Slope ({state.localData.slope_percentage}%) is optimal for construction.</div>
             ) : (
               <div style={{color: '#ff956a', fontSize: '11px', fontWeight: 'bold'}}>⚠ Slope ({state.localData.slope_percentage}%) requires intensive grading/piling.</div>
             ))}

             {/* Dynamic Warning for Extreme Rain (Flood proxy) */}
             {(state.localData.rain_mm_hr !== 'N/A') && (state.localData.rain_mm_hr > 1.5 ? (
               <div style={{color: '#ff956a', fontSize: '11px', fontWeight: 'bold', marginTop:'4px'}}>⚠ IMERG Satellite flags high flood risk ({state.localData.rain_mm_hr} mm/hr) here!</div>
             ) : (
               <div style={{color: '#a4e775', fontSize: '11px', fontWeight: 'bold', marginTop:'4px'}}>✓ Precipitation rate presents normal drainage risk.</div>
             ))}

             {(state.localData.slope_percentage === 'N/A') && <div style={{color: '#ff956a', fontSize: '11px'}}>⚠ Unable to parse NASA Local Binaries.</div>}
         </div>
      </div>
      <p className="score-disclaimer">Values parsed instantly by Python local server from RAW offline NASA `.HDF5` (GPM IMERG) and `.hgt` (SRTM) matrixes mapped precisely to your coordinate click.</p>
    </div>
    
    <button className="solid-button" onClick={onOpenAdvanced}>Open advanced details <span>↗</span></button>
    <a className="source-link" href={data.sourceUrl} target="_blank" rel="noreferrer">View live NASA POWER response ↗</a>
  </aside>
}

function AdvancedDrawer({ point, data, localData, onClose }) {
  if (!data) return null
  return <div className="drawer-backdrop" role="presentation">
    <section className="advanced-drawer" aria-label="Advanced point analysis">
      
      <header className="drawer-header">
        <div><p className="eyebrow">Advanced Site Intelligence</p>
        <h2>{point.label} <span>{displayCoordinate(point.lat, 'N', 'S')} · {displayCoordinate(point.lon, 'E', 'W')}</span></h2></div>
        <button className="close-drawer" onClick={onClose} aria-label="Close advanced details">×</button>
      </header>

      {/* SECTION 1: THE PYTHON LOCAL DATA PIPELINE */}
      <div className="local-data-grid">
        <h3 className="section-title">Offline NASA Multi-Satellite Extraction</h3>
        <p className="section-desc">Raw <code>.hgt</code>, <code>.HDF5</code>, and <code>.nc</code> matrix nodes instantly decoded by Python local server for pixel-accurate sub-layer analysis.</p>
        
        <div className="hackathon-boxes">
          <div className="h-box">
             <span>SRTM MATRIX</span>
             <strong>{localData?.elevation_meters !== 'N/A' ? localData?.elevation_meters : '--'} <em>m</em></strong>
             <small>Terrain Elevation</small>
          </div>
          <div className="h-box">
             <span>GPM IMERG HDF5</span>
             <strong style={{color: '#4cd8d6'}}>{localData?.rain_mm_hr !== 'N/A' ? localData?.rain_mm_hr : '--'} <em>mm/h</em></strong>
             <small>Peak Sat Rain</small>
          </div>
          <div className="h-box">
             <span>GRACE NETCDF</span>
             <strong style={{color: localData?.groundwater_anomaly_cm < 0 ? '#ff956a' : '#a4e775'}}>
               {localData?.groundwater_anomaly_cm !== 'N/A' ? localData?.groundwater_anomaly_cm : '--'} <em>cm</em>
             </strong>
             <small>Groundwater Anomaly</small>
          </div>
        </div>
      </div>

      {/* SECTION 2: THE API LAYER */}
      <div className="advanced-summary" style={{marginTop: '20px', borderTop: '1px solid var(--line)', paddingTop: '20px'}}>
        <div className="live-source"><span>●</span> Live NASA POWER API</div>
        <p style={{margin: '0'}}>10-Year historical meteorological API parameters processed in real-time. Showing decadal mean trends (OLS). </p>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => <Stat key={metric.key} metric={metric} values={data.series[metric.key]} trend={data.trends[metric.key]} />)}
      </div>

      <div className="advanced-bottom">
        <div><span className="small-title">Unified Stack</span><p>React + WebGL mapping combined with Python FastAPI Backend parsing 70MB+ of binary spatial arrays.</p></div>
        <div><span className="small-title">Construction Feasibility</span><p>Final project feasibility algorithms integrate GRACE structural bounds and SRTM load grading factors.</p></div>
      </div>
    </section>
  </div>
}

function App() {
  const [point, setPoint] = useState(null)
  const [state, setState] = useState({ status: 'idle', data: null, message: '' })
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const requestId = useRef(0)

  const analyze = async (nextPoint) => {
    const id = ++requestId.current
    setPoint(nextPoint)
    setAdvancedOpen(false)
    setState({ status: 'loading', data: null, localData: null, message: '' })
    
    try {
      // 1. Ask our local Python Backend if we have raw data for this coordinate
      const pyResponse = await fetch(`http://127.0.0.1:8000/api/local-data?lat=${nextPoint.lat}&lon=${nextPoint.lon}`)
      const pyData = await pyResponse.json()

      if (!pyData.supported) {
         if (id === requestId.current) setState({ status: 'geofence', data: null, message: pyData.message })
         return;
      }

      // 2. If it's supported, grab the live Climate history from NASA API
      const data = await getPowerPoint(nextPoint.lat, nextPoint.lon)
      
      // Save BOTH python's processed data and the live NASA API data!
      if (id === requestId.current) setState({ status: 'ready', data, localData: pyData.metrics, message: '' })
    } catch (error) {
      if (id === requestId.current) setState({ status: 'error', data: null, message: 'Make sure your Python Backend (server.py) is running on port 8000!' })
    }
  }

  const reset = () => {
    requestId.current += 1
    setPoint(null)
    setState({ status: 'idle', data: null, message: '' })
    setAdvancedOpen(false)
  }

  return <main className="tool-shell">
    <header className="toolbar">
      <a className="tool-logo" href="/" aria-label="TrendyPlanets home"><span className="logo-planet"><i /></span><span>trendy<span>planets</span></span></a>
      <div className="toolbar-center"><span className="pulse" /> NASA POWER live layer <b>·</b> click to analyze</div>
      <div className="toolbar-right"><span>Earth trend workspace</span><button onClick={reset}>Reset</button></div>
    </header>
    <section className="workspace">
      <div className="map-pane">
        <div className="map-chrome">
          <div><p className="eyebrow">2D field map</p><strong>Tap any location to inspect</strong></div>
          <div className="quick-places">{places.map((place) => <button key={place.name} onClick={() => analyze({ ...place, label: place.name })}>{place.name}</button>)}</div>
        </div>
        <MapContainer center={[22.8, 78.9]} zoom={4.65} zoomControl={false} className="field-map" minZoom={3}>
          <TileLayer attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents onSelect={analyze} />
          <FocusMap point={point} />
          {point && <CircleMarker center={[point.lat, point.lon]} radius={10} pathOptions={{ color: '#eaff67', fillColor: '#0d6776', fillOpacity: 1, weight: 3 }}><Tooltip direction="top" offset={[0,-10]} opacity={1}>{point.label}</Tooltip></CircleMarker>}
        </MapContainer>
        <div className="map-footer"><span>© OpenStreetMap contributors</span><span>NASA POWER meteorology · direct point query</span></div>
      </div>
      <Inspector state={state} point={point} onOpenAdvanced={() => setAdvancedOpen(true)} onRetry={() => analyze(point)} onReset={reset} />
    </section>
    {advancedOpen && <AdvancedDrawer point={point} data={state.data} localData={state.localData} onClose={() => setAdvancedOpen(false)} />}
  </main>
}

export default App