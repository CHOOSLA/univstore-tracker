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

  // mounted된 이후 ResizeObserver 등록 + 초기 너비 측정
  useEffect(() => {
    if (!fullWidth || !containerRef.current) return;
    const el = containerRef.current;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullWidth, mounted]);

  const chartWidth = fullWidth ? containerWidth : 96;
  const chartData = data?.map((val, i) => ({ value: val, index: i })) ?? [];

  return (
    <div
      ref={containerRef}
      className={fullWidth ? "w-full" : "w-24"}
      style={{ height }}
    >
      {mounted && data && data.length > 0 && (
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
      )}
    </div>
  );
}
