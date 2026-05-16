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

  const chartData = data.map((val, i) => ({ value: val, index: i }));
  
  if (!mounted) return <div className="w-24 h-10" />;

  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
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
      </ResponsiveContainer>
    </div>
  );
}
