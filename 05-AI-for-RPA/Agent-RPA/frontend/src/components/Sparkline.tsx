import React from 'react';

interface SparklineProps {
    data: number[];
    color: string;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color }) => {
    if (!data || data.length < 2) return <svg className="w-full h-8"><line x1="0" y1="16" x2="100%" y2="16" stroke={color} strokeWidth="2" opacity={0.2} strokeDasharray="4 4" /></svg>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max === min ? 1 : max - min;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${32 - ((v - min) / range) * 32}`).join(' ');
    
    const lastX = 100;
    const lastY = 32 - ((data[data.length - 1] - min) / range) * 32;

    return (
        <svg className="w-full h-8 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 32">
            <line x1="0" y1={lastY} x2="100" y2={lastY} stroke={color} strokeWidth="0.5" opacity={0.4} strokeDasharray="2 2" />
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx={lastX} cy={lastY} r="2.5" fill={color} className="animate-pulse" />
        </svg>
    );
};
