import {useEffect, useState} from 'react'
import WeatherIcon from '../components/WeatherIcon'

const LAT = 35.5800790
const LON = 139.5461870

function labelFromCode(code){
  const map = {
    0:'晴天',1:'主に晴れ',2:'部分日照',3:'曇り',45:'霧',48:'霧(結露)',51:'弱い霧雨',53:'霧雨',55:'強い霧雨',61:'小雨',63:'中雨',65:'大雨',71:'雪',73:'みぞれ',75:'大雪',80:'にわか雨',81:'にわか強雨',82:'激しいにわか雨',95:'雷雨',96:'雹を伴う雷雨'
  }
  return map[code] ?? '不明'
}

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
          timezone: 'Asia/Tokyo'
        })
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

  if(loading) return <div className="p-6">読み込み中…</div>
  if(error) return <div className="p-6">エラー: {error}</div>
  if(!data) return null

  const times = data.hourly.time
  const temps = data.hourly.temperature_2m
  const precips = data.hourly.precipitation
  const codes = data.hourly.weathercode
  const rows = times.map((t, i)=>({time:t, temp:temps[i], precip:precips[i], code:codes[i]})).slice(0,168)

  const now = rows[0]
  const next12 = rows.slice(1,13)
  const next24 = rows.slice(0,24)

  const upcomingPrecip = next12.slice(0,3).some(r=>r.precip>0.5)

  // compute ranges for chart
  const tempVals = next24.map(r=>r.temp)
  const precipVals = next24.map(r=>r.precip)
  const tempMin = Math.min(...tempVals)
  const tempMax = Math.max(...tempVals)
  const precipMax = Math.max(...precipVals)

  const width = 760
  const height = 200
  const leftPad = 40
  const rightPad = 40

  const tempToY = t => {
    const plotH = height - 40
    return 20 + (1 - (t - tempMin) / (tempMax - tempMin || 1)) * plotH
  }
  const precipToY = p => {
    const plotH = height - 40
    return 20 + (1 - (p / (precipMax || 1))) * plotH
  }

  // daily summary (group by date)
  const dailyMap = {}
  rows.forEach(r=>{
    const date = r.time.slice(0,10)
    if(!dailyMap[date]) dailyMap[date] = {temps:[], precips:[], codes:[]}
    dailyMap[date].temps.push(r.temp)
    dailyMap[date].precips.push(r.precip)
    dailyMap[date].codes.push(r.code)
  })
  const daily = Object.keys(dailyMap).slice(0,7).map(date=>{
    const d = dailyMap[date]
    const min = Math.min(...d.temps)
    const max = Math.max(...d.temps)
    const sumPrecip = d.precips.reduce((a,b)=>a+b,0)
    // predominant code (mode)
    const mode = Object.entries(d.codes.reduce((acc,c)=>{acc[c]=(acc[c]||0)+1;return acc},{ })).sort((a,b)=>b[1]-a[1])[0][0]
    return {date, min, max, sumPrecip, code: Number(mode)}
  })

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">横浜市青葉区元石川町 — 1時間単位 週間予報</h1>
          <div className="text-sm text-slate-400">データ: Open-Meteo</div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="mr-4">
                <WeatherIcon code={now.code} size={72} />
              </div>
              <div>
                <div className="text-5xl font-bold">{now.temp}°C</div>
                <div className="text-slate-300">{labelFromCode(now.code)}</div>
                <div className="mt-2 text-sm text-slate-400">{now.time.replace('T',' ')} 現在</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm text-slate-300 mb-2">次の12時間</h3>
              <div className="flex space-x-3 overflow-x-auto py-2">
                {next12.map(r=> (
                  <div key={r.time} className="min-w-[100px] bg-slate-700/40 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-300">{r.time.slice(11,16)}</div>
                    <div className="my-1"><WeatherIcon code={r.code} size={28} /></div>
                    <div className="text-sm font-medium">{r.temp}°</div>
                    <div className="text-xs text-slate-400">{r.precip} mm</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <aside className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="text-sm text-slate-300">短時間の見どころ</div>
            <div className="mt-3 text-lg font-medium">{upcomingPrecip ? '短時間で降水の可能性あり ☔' : '当面は降水の可能性低め ☀️'}</div>

            <div className="mt-4 text-sm text-slate-400">
              座標: {LAT}, {LON}
            </div>
          </aside>
        </section>

        <section className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <h3 className="text-sm text-slate-300 mb-3">24時間の概観</h3>

          <div className="flex items-start">
            {/* left axis (temperature) */}
            <div className="w-10 text-xs text-slate-400 mr-2" style={{height:height}}>
              <div style={{height: '20px'}}></div>
              <div style={{height: (height-40)+'px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                <div>{tempMax}°C</div>
                <div>{Math.round((tempMax+tempMin)/2)}°C</div>
                <div>{tempMin}°C</div>
              </div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
              {/* grid lines */}
              <line x1={leftPad} y1={20} x2={width-rightPad} y2={20} stroke="#334155" />
              <line x1={leftPad} y1={height-20} x2={width-rightPad} y2={height-20} stroke="#334155" />

              {/* temp polyline */}
              <polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                points={next24.map((r,i)=>{
                  const x = leftPad + (i/23)*(width-leftPad-rightPad)
                  const y = tempToY(r.temp)
                  return `${x},${y}`
                }).join(' ')} />

              {/* precip bars (scaled to right axis) */}
              {next24.map((r,i)=>{
                const x = leftPad + (i/23)*(width-leftPad-rightPad)
                const barW = (width-leftPad-rightPad)/24*0.6
                const y = precipToY(r.precip)
                const h = (height-40) - (y-20)
                return <rect key={i} x={x-barW/2} y={y} width={barW} height={h} fill="#34d399" opacity={0.9} />
              })}

              {/* data labels for temp */}
              {next24.map((r,i)=>{
                const x = leftPad + (i/23)*(width-leftPad-rightPad)
                const y = tempToY(r.temp)
                return <text key={i} x={x+4} y={y-8} fontSize="10" fill="#cbe6ff">{r.temp}°</text>
              })}

              {/* bottom time labels */}
              {next24.map((r,i)=>{
                const x = leftPad + (i/23)*(width-leftPad-rightPad)
                return <text key={i} x={x} y={height-4} fontSize="9" fill="#94a3b8" textAnchor="middle">{r.time.slice(11,16)}</text>
              })}

            </svg>

            {/* right axis (precip) */}
            <div className="w-12 text-xs text-slate-400 ml-2" style={{height:height}}>
              <div style={{height: '20px'}}></div>
              <div style={{height: (height-40)+'px', display:'flex', flexDirection:'column', justifyContent:'space-between', alignItems:'flex-end'}}>
                <div>{precipMax} mm</div>
                <div>{(precipMax/2).toFixed(1)} mm</div>
                <div>0 mm</div>
              </div>
            </div>
          </div>

        </section>

        <section className="mt-6">
          <h3 className="text-sm text-slate-300 mb-2">日別予報（7日）</h3>
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {daily.map(d=> (
                <div key={d.date} className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-300">{d.date}</div>
                  <div className="my-2 flex justify-center"><WeatherIcon code={d.code} size={36} /></div>
                  <div className="text-sm font-medium">{Math.round(d.max)}° / {Math.round(d.min)}°</div>
                  <div className="text-xs text-slate-400">降水: {d.sumPrecip.toFixed(1)} mm</div>
                  <div className="text-xs text-slate-400">{labelFromCode(d.code)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm text-slate-300 mb-2">今後の詳細（1時間ごと）</h3>
          <div className="bg-slate-800 rounded-xl p-3 shadow-lg overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-2">日時</th>
                  <th className="py-2">気温</th>
                  <th className="py-2">降水量</th>
                  <th className="py-2">天気</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0,72).map(r=> (
                  <tr key={r.time} className="border-t border-slate-700">
                    <td className="py-2">{r.time.replace('T',' ')}</td>
                    <td className="py-2">{r.temp}°C</td>
                    <td className="py-2">{r.precip} mm</td>
                    <td className="py-2">{labelFromCode(r.code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
