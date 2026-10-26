import React, { useState } from 'react';
import { TrendingUp, ShieldAlert, Calendar, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export interface ChartDataPoint {
    label: string;
    income: number;
    expense: number;
    balance: number;
    isProjected?: boolean;
    projectedReceivables?: number;
    net?: number;
}

export interface DecisionInsight {
    projectedNetTotal: number;
    projectedEndBalance: number;
    minProjectedBalance: number;
    upcomingReceivablesTotal: number;
    avgMonthlySurplus: number;
    status: 'healthy' | 'caution' | 'warning';
}

export interface InteractiveCashflowChartProps {
    data: ChartDataPoint[];
    projectionMonths?: number;
    onProjectionMonthsChange?: (months: number) => void;
    decisionInsights?: DecisionInsight;
    showControls?: boolean;
    compact?: boolean;
}

const InteractiveCashflowChart: React.FC<InteractiveCashflowChartProps> = React.memo(({
    data,
    projectionMonths = 6,
    onProjectionMonthsChange,
    decisionInsights,
    showControls = true,
    compact = false
}) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ChartDataPoint } | null>(null);

    const width = 840;
    const height = compact ? 260 : 310;
    const padding = { top: 25, right: 25, bottom: 45, left: 75 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#F4F6F9]/40 rounded-2xl border border-dashed border-[#EAEFF4]">
                <div className="w-14 h-14 rounded-2xl bg-white border border-[#EAEFF4] flex items-center justify-center mb-3 shadow-xs">
                    <TrendingUp className="w-7 h-7 text-[#2563EB]" />
                </div>
                <p className="text-sm font-bold text-[#2A3547] mb-1">Belum Ada Data Arus Kas</p>
                <p className="text-xs text-[#5A6A85]">Mulai catat transaksi atau jadwalkan acara untuk melihat grafik arus kas & proyeksi ke depan.</p>
            </div>
        );
    }

    const maxBarValue = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
    const minBalance = Math.min(...data.map(d => d.balance), 0);
    const maxBalance = Math.max(...data.map(d => d.balance), 1);

    const bandWidth = chartWidth / data.length;
    const barWidth = Math.max(3, bandWidth * 0.38);

    const xScale = (index: number) => padding.left + index * bandWidth + bandWidth / 2;
    const yBarScale = (value: number) => chartHeight - (value / maxBarValue) * chartHeight;
    const yLineScale = (value: number) => {
        const range = maxBalance - minBalance;
        if (range === 0) return chartHeight / 2;
        return chartHeight - ((value - minBalance) / range) * chartHeight;
    };

    // Find boundary index between historical and projected data
    const firstProjectedIndex = data.findIndex(d => d.isProjected);
    const hasProjection = firstProjectedIndex !== -1;

    // Build historical balance path & projected balance path
    let historicalPath = '';
    let projectedPath = '';

    data.forEach((d, i) => {
        const x = xScale(i);
        const y = padding.top + yLineScale(d.balance);
        if (!d.isProjected) {
            historicalPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        } else {
            // First projected point connects from the last historical point
            if (projectedPath === '') {
                const prevIndex = i - 1;
                if (prevIndex >= 0) {
                    const prevX = xScale(prevIndex);
                    const prevY = padding.top + yLineScale(data[prevIndex].balance);
                    projectedPath += `M ${prevX} ${prevY} L ${x} ${y} `;
                } else {
                    projectedPath += `M ${x} ${y} `;
                }
            } else {
                projectedPath += `L ${x} ${y} `;
            }
        }
    });

    const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, index: number) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (svg) {
            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const { x, y } = point.matrixTransform(svg.getScreenCTM()?.inverse());
            setTooltip({ x, y: Math.max(10, y - 10), data: data[index] });
        }
    };

    const handleMouseLeave = () => setTooltip(null);

    // Y-Axis grid lines and labels for bars
    const yBarAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = maxBarValue * (i / 4);
        return { value: (value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1), y: padding.top + yBarScale(value) };
    });

    return (
        <div className="space-y-4">
            {/* Interactive Control Header */}
            {showControls && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F4F6F9]/60 rounded-xl border border-[#EAEFF4]">
                    {/* Horizon Controls */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#5A6A85] mr-1.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                            Lihat ke depan:
                        </span>
                        {[
                            { value: 0, label: 'Tanpa perkiraan' },
                            { value: 3, label: '+3 Bulan' },
                            { value: 6, label: '+6 Bulan' },
                            { value: 12, label: '+12 Bulan' }
                        ].map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onProjectionMonthsChange && onProjectionMonthsChange(opt.value)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    projectionMonths === opt.value
                                        ? 'bg-[#2563EB] text-white shadow-xs'
                                        : 'bg-white text-[#5A6A85] hover:text-[#2A3547] border border-[#EAEFF4]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                </div>
            )}

            {/* Legend & Indicator Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold px-1">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
                        <span className="text-[#5A6A85]">Pemasukan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DB2777]"></span>
                        <span className="text-[#5A6A85]">Pengeluaran</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-[#2563EB] rounded-full"></span>
                        <span className="text-[#5A6A85]">Saldo tercatat</span>
                    </div>
                    {hasProjection && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-4 border-t-2 border-dashed border-[#2563EB]"></span>
                            <span className="text-[#2563EB] font-bold">Perkiraan saldo</span>
                        </div>
                    )}
                </div>

                {hasProjection && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full grad-brand text-white text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        {`Perkiraan ${projectionMonths} bulan`}
                    </span>
                )}
            </div>

            {/* SVG Chart Container */}
            <div className="relative bg-white border border-[#EAEFF4] rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
                    <defs>
                        <clipPath id="cashflowClip">
                            <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} />
                        </clipPath>
                        {/* Striped pattern for projected bars */}
                        <pattern id="projectedHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" />
                        </pattern>
                    </defs>

                    {/* Projected Background Highlight Area */}
                    {hasProjection && (
                        <g>
                            <rect
                                x={xScale(firstProjectedIndex) - bandWidth / 2}
                                y={padding.top}
                                width={width - padding.right - (xScale(firstProjectedIndex) - bandWidth / 2)}
                                height={chartHeight}
                                fill="#F4F6F9"
                                opacity="0.65"
                                rx="4"
                            />
                            {/* Boundary Demarcation Line */}
                            <line
                                x1={xScale(firstProjectedIndex) - bandWidth / 2}
                                y1={padding.top}
                                x2={xScale(firstProjectedIndex) - bandWidth / 2}
                                y2={height - padding.bottom}
                                stroke="#2563EB"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                            />
                            <text
                                x={xScale(firstProjectedIndex) - bandWidth / 2 + 6}
                                y={padding.top + 14}
                                fill="#2563EB"
                                fontSize="10"
                                fontWeight="bold"
                                letterSpacing="0.5"
                            >
                                PROYEKSI KE DEPAN ►
                            </text>
                        </g>
                    )}

                    {/* Y-Axis Grid Lines & Labels */}
                    {yBarAxisLabels.map(({ value, y }, i) => (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={width - padding.right}
                                y2={y}
                                stroke="#EAEFF4"
                                strokeDasharray="3 3"
                            />
                            <text
                                x={padding.left - 10}
                                y={y + 4}
                                textAnchor="end"
                                fill="#5A6A85"
                                fontSize="10"
                                fontWeight="600"
                            >
                                {value}jt
                            </text>
                        </g>
                    ))}

                    {/* X-Axis Baseline */}
                    <line
                        x1={padding.left}
                        y1={height - padding.bottom}
                        x2={width - padding.right}
                        y2={height - padding.bottom}
                        stroke="#EAEFF4"
                        strokeWidth="1.5"
                    />

                    {/* X-Axis Labels */}
                    {data.map((d, i) => (
                        <g key={`x-label-${i}`}>
                            <text
                                x={xScale(i)}
                                y={height - padding.bottom + 18}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight={d.isProjected ? "bold" : "600"}
                                fill={d.isProjected ? "#2563EB" : "#5A6A85"}
                            >
                                {d.label}
                            </text>
                            {d.isProjected && (
                                <circle cx={xScale(i)} cy={height - padding.bottom + 26} r="2" fill="#2563EB" />
                            )}
                        </g>
                    ))}

                    {/* Chart Bars & Lines */}
                    <g clipPath="url(#cashflowClip)">
                        {/* Bars */}
                        {data.map((d, i) => {
                            const x = xScale(i);
                            const incomeHeight = chartHeight - yBarScale(d.income);
                            const expenseHeight = chartHeight - yBarScale(d.expense);
                            const isHovered = tooltip && tooltip.data.label === d.label;

                            return (
                                <g key={`bars-${i}`}>
                                    {/* Expense Bar (Coral) */}
                                    <rect
                                        x={x - barWidth}
                                        y={padding.top + yBarScale(d.expense)}
                                        width={barWidth - 1}
                                        height={Math.max(2, expenseHeight)}
                                        fill="#DB2777"
                                        rx="3"
                                        opacity={d.isProjected ? 0.6 : (isHovered ? 1 : 0.85)}
                                        className="transition-all duration-300"
                                    />
                                    {d.isProjected && (
                                        <rect
                                            x={x - barWidth}
                                            y={padding.top + yBarScale(d.expense)}
                                            width={barWidth - 1}
                                            height={Math.max(2, expenseHeight)}
                                            fill="url(#projectedHatch)"
                                            rx="3"
                                        />
                                    )}

                                    {/* Income Bar (Cyan/Green) */}
                                    <rect
                                        x={x + 1}
                                        y={padding.top + yBarScale(d.income)}
                                        width={barWidth - 1}
                                        height={Math.max(2, incomeHeight)}
                                        fill="#16A34A"
                                        rx="3"
                                        opacity={d.isProjected ? 0.6 : (isHovered ? 1 : 0.85)}
                                        className="transition-all duration-300"
                                    />
                                    {d.isProjected && (
                                        <rect
                                            x={x + 1}
                                            y={padding.top + yBarScale(d.income)}
                                            width={barWidth - 1}
                                            height={Math.max(2, incomeHeight)}
                                            fill="url(#projectedHatch)"
                                            rx="3"
                                        />
                                    )}
                                </g>
                            );
                        })}

                        {/* Historical Balance Line */}
                        {historicalPath && (
                            <path
                                d={historicalPath}
                                fill="none"
                                stroke="#2563EB"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Projected Balance Line (Dashed) */}
                        {projectedPath && (
                            <path
                                d={projectedPath}
                                fill="none"
                                stroke="#2563EB"
                                strokeWidth="2.5"
                                strokeDasharray="4 4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Balance Data Points */}
                        {data.map((d, i) => {
                            const isHovered = tooltip && tooltip.data.label === d.label;
                            const cx = xScale(i);
                            const cy = padding.top + yLineScale(d.balance);

                            return (
                                <g key={`point-${i}`}>
                                    {d.isProjected && (
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={isHovered ? 8 : 5}
                                            fill="#2563EB"
                                            opacity="0.2"
                                            className="animate-pulse"
                                        />
                                    )}
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={isHovered ? 5.5 : 3.5}
                                        fill={d.isProjected ? '#2563EB' : '#2A3547'}
                                        stroke="#FFFFFF"
                                        strokeWidth="2"
                                        className="transition-all duration-150"
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {/* Interactive Hover Strips */}
                    {data.map((d, i) => (
                        <rect
                            key={`interaction-${i}`}
                            x={padding.left + i * bandWidth}
                            y={padding.top}
                            width={bandWidth}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseMove={(e) => handleMouseMove(e, i)}
                            onMouseLeave={handleMouseLeave}
                        />
                    ))}

                    {/* Tooltip Overlay */}
                    {tooltip && (
                        <g className="pointer-events-none" transform={`translate(${Math.min(width - 230, Math.max(10, tooltip.x - 110))}, ${Math.max(10, tooltip.y - 120)})`}>
                            <foreignObject width="220" height="150">
                                <div className="p-3 bg-white/95 backdrop-blur-md border border-[#EAEFF4] rounded-xl shadow-xl text-xs">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EAEFF4]">
                                        <span className="font-bold text-[#2A3547] text-xs">{tooltip.data.label}</span>
                                        {tooltip.data.isProjected ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold grad-brand text-white uppercase tracking-wider">
                                                Proyeksi
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F4F6F9] text-[#5A6A85] uppercase tracking-wider">
                                                Aktual
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5 text-[#5A6A85]">
                                                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                                                Pemasukan:
                                            </span>
                                            <span className="font-bold text-[#166534]">{formatCurrency(tooltip.data.income)}</span>
                                        </div>
                                        {tooltip.data.isProjected && Boolean(tooltip.data.projectedReceivables) && (
                                            <div className="flex items-center justify-between text-[10px] text-[#5A6A85] pl-3 italic">
                                                <span>↳ Piutang Acara:</span>
                                                <span className="font-semibold text-[#2563EB]">{formatCurrency(tooltip.data.projectedReceivables || 0)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5 text-[#5A6A85]">
                                                <span className="w-2 h-2 rounded-full bg-[#DB2777]"></span>
                                                Pengeluaran:
                                            </span>
                                            <span className="font-bold text-[#DC2626]">{formatCurrency(tooltip.data.expense)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#EAEFF4]">
                                            <span className="text-[#5A6A85] font-semibold">Net Bulanan:</span>
                                            <span className={`font-bold ${(tooltip.data.income - tooltip.data.expense) >= 0 ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
                                                {(tooltip.data.income - tooltip.data.expense) >= 0 ? '+' : ''}{formatCurrency(tooltip.data.income - tooltip.data.expense)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#EAEFF4]">
                                            <span className="text-[#2A3547] font-bold">Saldo Akhir:</span>
                                            <span className="font-extrabold text-[#2563EB]">{formatCurrency(tooltip.data.balance)}</span>
                                        </div>
                                    </div>
                                </div>
                            </foreignObject>
                        </g>
                    )}
                </svg>
            </div>

            {/* Decision Support Insights Footer */}
            {hasProjection && decisionInsights && (
                <div className="bg-gradient-to-r from-[#F8FAFC] via-[#EEF2F7] to-[#F8FAFC] p-4 rounded-2xl border border-[#EAEFF4] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {decisionInsights.status === 'healthy' ? (
                                <div className="p-1.5 rounded-lg solid-green text-white">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                            ) : decisionInsights.status === 'caution' ? (
                                <div className="p-1.5 rounded-lg solid-orange text-white">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                            ) : (
                                <div className="p-1.5 rounded-lg bg-red-600 text-white">
                                    <ShieldAlert className="w-4 h-4" />
                                </div>
                            )}
                            <div>
                                <h5 className="text-xs font-bold text-[#2A3547] uppercase tracking-wider">
                                    Ringkasan Perkiraan Kas ({projectionMonths} bulan)
                                </h5>
                                <p className="text-[11px] text-[#5A6A85] font-medium">
                                    Estimasi dari transaksi 6 bulan terakhir dan sisa pembayaran acara
                                </p>
                            </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            decisionInsights.status === 'healthy'
                                ? 'solid-green text-white'
                                : decisionInsights.status === 'caution'
                                ? 'solid-orange text-white'
                                : 'bg-red-600 text-white'
                        }`}>
                            {decisionInsights.status === 'healthy' ? 'Saldo Proyeksi Positif' : decisionInsights.status === 'caution' ? 'Defisit Terproyeksi' : 'Saldo Berpotensi Negatif'}
                        </span>
                    </div>

                    {/* 4 Decision Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-[#EAEFF4]">
                            <span className="text-[10px] uppercase font-bold text-[#5A6A85] block">Perkiraan Saldo Akhir</span>
                            <span className="text-sm font-extrabold text-[#2A3547] mt-0.5 block truncate">
                                {formatCurrency(decisionInsights.projectedEndBalance)}
                            </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#EAEFF4]">
                            <span className="text-[10px] uppercase font-bold text-[#5A6A85] block">Estimasi Net Kas</span>
                            <span className={`text-sm font-extrabold mt-0.5 block truncate flex items-center gap-0.5 ${
                                decisionInsights.projectedNetTotal >= 0 ? 'text-[#166534]' : 'text-[#DC2626]'
                            }`}>
                                {decisionInsights.projectedNetTotal >= 0 ? (
                                    <ArrowUpRight className="w-3.5 h-3.5 inline" />
                                ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5 inline" />
                                )}
                                {formatCurrency(decisionInsights.projectedNetTotal)}
                            </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#EAEFF4]">
                            <span className="text-[10px] uppercase font-bold text-[#5A6A85] block">Sisa Pembayaran Acara</span>
                            <span className="text-sm font-extrabold text-[#2563EB] mt-0.5 block truncate">
                                {formatCurrency(decisionInsights.upcomingReceivablesTotal)}
                            </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#EAEFF4]">
                            <span className="text-[10px] uppercase font-bold text-[#5A6A85] block">Rata-rata Surplus/Bln</span>
                            <span className={`text-sm font-extrabold mt-0.5 block truncate ${
                                decisionInsights.avgMonthlySurplus >= 0 ? 'text-[#166534]' : 'text-[#DC2626]'
                            }`}>
                                {formatCurrency(decisionInsights.avgMonthlySurplus)}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#EAEFF4] text-xs text-[#2A3547] flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            Estimasi dihitung langsung dari transaksi tersimpan. Sisa pembayaran dialokasikan ke bulan tanggal acara; jadwal pelunasan khusus tidak tersedia.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
});

export default InteractiveCashflowChart;
