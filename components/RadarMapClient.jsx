'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {MapContainer, TileLayer, CircleMarker, ScaleControl} from 'react-leaflet'

const LAT = 35.580079
const LON = 139.546187
const DEFAULT_ZOOM = 10
const MIN_ZOOM = 5
const MAX_ZOOM = 11
const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const RAINVIEWER_ENDPOINT = 'https://api.rainviewer.com/public/weather-maps.json'

function formatFrameTime(epochSeconds){
  try{
    return new Date(epochSeconds * 1000).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }catch(e){
    return '—'
  }
}

export default function RadarMapClient(){
  const [frames, setFrames] = useState([])
  const [host, setHost] = useState('https://tilecache.rainviewer.com')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(()=>{
    async function load(){
      try{
        setLoading(true)
        setError(null)
        const res = await fetch(RAINVIEWER_ENDPOINT)
        if(!res.ok) throw new Error('RainViewer API 取得に失敗しました')
        const json = await res.json()
        const past = json?.radar?.past ?? []
        const nowcast = json?.radar?.nowcast ?? []
        const combined = [...past, ...nowcast]
        if(!combined.length){
          throw new Error('レーダー画像のフレームが取得できませんでした')
        }
        setFrames(combined)
        setHost(json.host || 'https://tilecache.rainviewer.com')
        setCurrentIndex(Math.max(0, combined.length - 1))
      }catch(e){
        setError(e.message)
      }finally{
        setLoading(false)
      }
    }
    load()

    const refreshId = setInterval(load, 5 * 60 * 1000)
    return ()=> clearInterval(refreshId)
  },[])

  useEffect(()=>{
    if(intervalRef.current) clearInterval(intervalRef.current)
    if(!playing || frames.length <= 1) return
    intervalRef.current = setInterval(()=>{
      setCurrentIndex(idx => (idx + 1) % frames.length)
    }, 1200)
    return ()=> intervalRef.current && clearInterval(intervalRef.current)
  }, [playing, frames])

  const currentFrame = frames[currentIndex]
  const frameLabel = currentFrame ? formatFrameTime(currentFrame.time) : '—'
  const sliderDisabled = !frames.length

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-slate-300">エリア表示 + 雨雲レーダー</p>
          <p className="text-xs text-slate-400">RainViewer 提供タイル / 5分更新</p>
        </div>
        <div className="text-xs text-emerald-300 font-mono">{frameLabel}</div>
      </div>

      {loading && (
        <div className="text-sm text-slate-300">雨雲レーダーを読み込み中…</div>
      )}

      {error && (
        <div className="text-sm text-rose-300">{error}</div>
      )}

      {!loading && !error && (
        <div>
          <MapContainer
            center={[LAT, LON]}
            zoom={DEFAULT_ZOOM}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            maxBounds={[ [LAT - 3, LON - 3], [LAT + 3, LON + 3] ]}
            maxBoundsViscosity={0.5}
            scrollWheelZoom
            className="w-full rounded-lg"
            style={{height: 420}}
            whenCreated={(map)=>{
              mapRef.current = map
              map.on('zoomend', ()=>{
                const current = map.getZoom()
                if(current > MAX_ZOOM) {
                  map.setView(map.getCenter(), MAX_ZOOM, {animate:false})
                } else if(current < MIN_ZOOM) {
                  map.setView(map.getCenter(), MIN_ZOOM, {animate:false})
                }
              })
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {currentFrame && (
              <TileLayer
                key={currentFrame.time}
                url={`${host}${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`}
                opacity={0.65}
                zIndex={5}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_ZOOM}
                tileSize={256}
                detectRetina={false}
                errorTileUrl={TRANSPARENT_TILE}
                attribution='Radar &copy; <a href="https://rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
              />
            )}
            <CircleMarker center={[LAT, LON]} radius={8} color="#34d399" fillColor="#34d399" fillOpacity={0.8} />
            <ScaleControl position="bottomleft" />
          </MapContainer>

          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-3">
              <button
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm"
                onClick={()=> setPlaying(p=>!p)}
                disabled={sliderDisabled}
              >
                {playing ? '⏸ 停止' : '▶️ 再生'}
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm"
                onClick={()=> setCurrentIndex(idx => idx <= 0 ? frames.length - 1 : idx - 1)}
                disabled={sliderDisabled}
              >
                ←
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm"
                onClick={()=> setCurrentIndex(idx => (idx + 1) % (frames.length || 1))}
                disabled={sliderDisabled}
              >
                →
              </button>
              <div className="text-xs text-slate-400">{frames.length}フレーム</div>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(0, frames.length - 1)}
              value={currentIndex}
              onChange={e=> setCurrentIndex(Number(e.target.value))}
              disabled={sliderDisabled}
              className="w-full accent-emerald-400"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              {frames.map((frame, idx)=> (
                <span key={frame.time} className={idx === currentIndex ? 'text-emerald-300' : undefined}>
                  {new Date(frame.time * 1000).toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'})}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              ※ RainViewer のレーダータイルはズーム 5〜12 のみ表示可能です。降水が無い時間帯は地図のみ表示されます。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
