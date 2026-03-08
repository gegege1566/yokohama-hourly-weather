import {useEffect, useState} from 'react'

const LAT = 35.5800790
const LON = 139.5461870

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData(){
      try{
        setLoading(true)
        const params = new URLSearchParams({
          latitude: LAT,
          longitude: LON,
          hourly: 'temperature_2m,precipitation,weathercode',
          timezone: 'Asia/Tokyo',
          past_days: 0
        })
        // 7日分は forecastdays handled by hourly arrays length; Open-Meteo returns many hours
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
        if(!res.ok) throw new Error('fetch failed')
        const json = await res.json()
        setData(json)
      }catch(e){
        setError(e.message)
      }finally{setLoading(false)}
    }
    fetchData()
  },[])

  if(loading) return <div style={{padding:20}}>読み込み中…</div>
  if(error) return <div style={{padding:20}}>エラー: {error}</div>
  if(!data) return null

  const times = data.hourly.time
  const temps = data.hourly.temperature_2m
  const precips = data.hourly.precipitation
  const codes = data.hourly.weathercode

  // show next 168 hours (7 days * 24)
  const rows = times.map((t, i)=>({time:t, temp:temps[i], precip:precips[i], code:codes[i]})).slice(0,168)

  return (
    <div style={{fontFamily:'system-ui, sans-serif', padding:20}}>
      <h1>横浜市青葉区元石川町 — 1時間単位 週間予報</h1>
      <p>座標: {LAT}, {LON} — データ元: Open-Meteo</p>
      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse', width:'100%'}}>
          <thead>
            <tr>
              <th style={{borderBottom:'1px solid #ddd', textAlign:'left', padding:8}}>日時</th>
              <th style={{borderBottom:'1px solid #ddd', textAlign:'right', padding:8}}>気温 (°C)</th>
              <th style={{borderBottom:'1px solid #ddd', textAlign:'right', padding:8}}>降水量 (mm)</th>
              <th style={{borderBottom:'1px solid #ddd', textAlign:'right', padding:8}}>天気コード</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.time}>
                <td style={{padding:8, borderBottom:'1px solid #f3f3f3'}}>{r.time.replace('T',' ')}</td>
                <td style={{padding:8, textAlign:'right', borderBottom:'1px solid #f3f3f3'}}>{r.temp}</td>
                <td style={{padding:8, textAlign:'right', borderBottom:'1px solid #f3f3f3'}}>{r.precip}</td>
                <td style={{padding:8, textAlign:'right', borderBottom:'1px solid #f3f3f3'}}>{r.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
