"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = "#ef4444" }: SparklineProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !data || data.length === 0) return <div className="w-24 h-10" />;

  const chartData = data.map((val, i) => ({ value: val, index: i }));
  
  return (
    <div className="w-24 h-10">
      {/* 
        ResponsiveContainer의 width(-1) 에러를 방지하기 위해 
        부모 div에 고정 크기를 주고, 내부 차트에도 명시적인 크기를 지정합니다.
      */}
      <LineChart width={96} height={40} data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <YAxis hide domain={['dataMin', 'dataMax']} />
      </LineChart>
    </div>
  );
}
