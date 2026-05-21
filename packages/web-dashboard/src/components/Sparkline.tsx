"use client";

import React, { useEffect, useRef, useState } from 'react';
import { LineChart, Line, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  fullWidth?: boolean;
}

export function Sparkline({ data, color = "#ef4444", height = 40, fullWidth = false }: SparklineProps) {
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(96);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!fullWidth || !containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width || 96);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fullWidth]);

  const chartWidth = fullWidth ? containerWidth : 96;
  const placeholder = fullWidth
    ? <div className="w-full" style={{ height }} />
    : <div className="w-24" style={{ height }} />;

  if (!mounted || !data || data.length === 0) return placeholder;

  const chartData = data.map((val, i) => ({ value: val, index: i }));

  return (
    <div
      ref={containerRef}
      className={fullWidth ? "w-full" : "w-24"}
      style={{ height }}
    >
      <LineChart width={chartWidth} height={height} data={chartData}>
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
