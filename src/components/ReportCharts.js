'use client'
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const chartStyle = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' }
const tooltipStyle = { background: '#162640', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }

export default function ReportCharts({ trendData, radarData, weeklyData }) {
  return (
    <>
      {trendData.length > 1 && (
        <div className="card animate-fade stagger-2" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Your Score Journey</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={chartStyle} />
              <YAxis domain={[0, 100]} tick={chartStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={70} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: 'Pass', fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} />
              <Line type="monotone" dataKey="score" stroke="#E30613" strokeWidth={2} dot={{ fill: '#E30613', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {radarData.some(r => r.score > 0) && (
        <div className="card animate-fade stagger-3" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Category Mastery</div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar dataKey="score" stroke="#E30613" fill="#E30613" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      {weeklyData.some(w => w.xp > 0) && (
        <div className="card animate-fade stagger-4" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Weekly XP Earned</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={chartStyle} />
              <YAxis tick={chartStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="xp" fill="#E30613" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}
