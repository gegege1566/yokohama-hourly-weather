import dynamic from 'next/dynamic'

const RadarMap = dynamic(() => import('./RadarMapClient'), {
  ssr: false,
  loading: () => (
    <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-300">
      地図コンポーネントを初期化中…
    </div>
  )
})

export default RadarMap
