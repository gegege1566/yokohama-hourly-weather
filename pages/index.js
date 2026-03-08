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

  // quick summary: check if next 3 hours precip > 0.5
  const upcomingPrecip = next12.slice(0,3).some(r=>r.precip>0.5)

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
          <svg viewBox="0 0 800 200" className="w-full h-48">
            {/* simple temp line */}
            <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={next24.map((r,i)=>`${(i/23)*800},${120 - (r.temp- Math.min(...next24.map(x=>x.temp)))*3}`).join(' ')} />
            {/* precip bars */}
            {next24.map((r,i)=> (
              <rect key={i} x={(i/23)*800-6} y={140 - r.precip*6} width={10} height={r.precip*6} fill="#34d399" opacity={0.9} />
            ))}
          </svg>
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
