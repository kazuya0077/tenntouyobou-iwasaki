
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartDataPoint } from '../types';

interface Props {
  data: ChartDataPoint[];
}

const RadarChartComponent: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#334155', fontSize: 10, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 5]} 
            tickCount={6}
            tick={{ fill: '#94a3b8', fontSize: 9 }} 
          />
          
          {/* 身体機能計測結果（黒線） */}
          <Radar
            name="身体機能"
            dataKey="physicalScore"
            stroke="#0f172a"
            strokeWidth={2}
            fill="#0f172a"
            fillOpacity={0.1}
          />

          {/* 自己認識（赤線） */}
          <Radar
            name="自己認識"
            dataKey="mentalScore"
            stroke="#ef4444"
            strokeWidth={2}
            fill="#ef4444"
            fillOpacity={0.1}
            strokeDasharray="4 4" 
          />
          
          <Tooltip 
            formatter={(value: number, name: string) => [`${value} / 5`, name]}
            contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChartComponent;
