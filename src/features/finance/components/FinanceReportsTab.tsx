import React from 'react';
import { Card, Profile, Project, Transaction, TransactionType } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { DownloadIcon } from '../../../constants';
import ClientProfitabilityReport from './ClientProfitabilityReport';
import GeneralFinancialReport from './GeneralFinancialReport';
import type { GeneralFinancialReportMetrics } from './GeneralFinancialReport';
import { MobileCollapsibleSection } from '../../../components/ui/MobileProgressiveDisclosure';
import FinancialDetailReports from './FinancialDetailReports';
import EventProfitabilityTab from './EventProfitabilityTab';

export type FinanceReportView = 'all' | 'overview' | 'clients' | 'categories' | 'balance';

export const PRODUCTION_COST_CATEGORIES = [
    "Gaji Tim / Vendor",
    "Transport",
    "Transportasi",
    "Konsumsi",
    "Sewa Tempat",
    "Sewa Alat",
    "Produksi Fisik"
];

// Helper: returns true if the category matches any production cost category
// Uses partial/case-insensitive matching so variants like "Transport & Akomodasi Fotografi" are also caught
export function isProductionCostCategory(category: string): boolean {
    if (!category) return false;
    const normalized = category.toLowerCase();
    return PRODUCTION_COST_CATEGORIES.some(c => normalized.includes(c.toLowerCase()));
}

interface ReportFilters {
    client: string;
    dateFrom: string;
    dateTo: string;
}

interface ClientOption {
    id: string;
    name: string;
}

interface FinanceReportsTabProps {
    reportView?: FinanceReportView;
    reportFilters: ReportFilters;
    setReportFilters: React.Dispatch<React.SetStateAction<ReportFilters>>;
    reportClientOptions: ClientOption[];
    handleDownloadReportExcel: () => void;
    handleDownloadReportPDF: () => void;
    isExportingReportPDF?: boolean;
    generalReportMetrics: GeneralFinancialReportMetrics | null;
    reportTransactions: Transaction[];
    profile: Profile;
    projects: Project[];
    cards?: Card[];
    profitReportFilters?: { year: number; month: number };
    setProfitReportFilters?: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
    profitReportMetrics?: { totalProfit: number; avgProfit: number; mostProfitableClient: string; profitableProjectsCount: number };
    projectProfitabilityData?: any[];
    handleDownloadProfitReportCSV?: () => void;
    handleDownloadProfitReportExcel?: () => void;
    onEditTransaction?: (transaction: Transaction) => void;
    onDeleteTransaction?: (id: string) => void;
    onAddTransaction?: () => void;
}

const MobileTransactionsTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <div className="rounded-xl bg-brand-surface border border-brand-border overflow-hidden">
        <h4 className="px-3 py-2 font-semibold border-b border-brand-border">Transaksi</h4>
        <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-brand-bg/70 text-brand-text-secondary">
                    <tr>
                        <th className="w-[76px] border-r border-brand-border !px-2 !py-2 text-[10px]">Tanggal</th>
                        <th className="border-r border-brand-border !px-2 !py-2 text-[10px]">Transaksi</th>
                        <th className="w-[102px] !px-2 !py-2 text-right text-[10px]">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(transaction => (
                        <tr key={transaction.id} className="border-t border-brand-border">
                            <td className="border-r border-brand-border !px-2 !py-2 align-top whitespace-nowrap text-[10px] text-brand-text-secondary">
                                {new Date(transaction.date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="border-r border-brand-border !px-2 !py-2 align-top">
                                <p className="text-[11px] font-medium text-brand-text-primary break-words">{transaction.description}</p>
                                <p className="text-[10px] text-brand-text-secondary break-words">{transaction.category}</p>
                            </td>
                            <td className={`!px-2 !py-2 align-top text-right whitespace-nowrap text-[10px] font-semibold ${transaction.type === TransactionType.INCOME ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
                                {formatCurrency(transaction.amount)}
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={3} className="!px-3 !py-5 text-center text-xs text-brand-text-secondary">Tidak ada data.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const FinanceReportsTab: React.FC<FinanceReportsTabProps> = ({
    reportView = 'overview',
    reportFilters,
    setReportFilters,
    reportClientOptions,
    handleDownloadReportExcel,
    handleDownloadReportPDF,
    isExportingReportPDF = false,
    generalReportMetrics,
    reportTransactions,
    profile,
    projects,
    cards = [],
    profitReportFilters,
    setProfitReportFilters,
    profitReportMetrics,
    projectProfitabilityData = [],
    handleDownloadProfitReportCSV,
    handleDownloadProfitReportExcel,
    onEditTransaction,
    onDeleteTransaction,
    onAddTransaction,
}) => {
    const [activeReportSection, setActiveReportSection] = React.useState<'overview' | 'clients' | 'categories' | 'balance' | 'event'>('overview');
    const reportSections = [
        { id: 'overview', label: 'Umum' },
        { id: 'clients', label: 'Per Pengantin' },
        { id: 'categories', label: 'Per Kategori' },
        { id: 'balance', label: 'Neraca' },
    ] as const;
    const showTransactionFilters = reportView !== 'balance'
        && !(reportView === 'all' && (activeReportSection === 'balance' || activeReportSection === 'event'));

    return (
        <div className="space-y-4 sm:space-y-6 printable-area widget-animate">
            {showTransactionFilters && <MobileCollapsibleSection
                title="Filter & Ekspor Laporan"
                subtitle={reportFilters.client === 'all' ? 'Semua Pengantin' : 'Pengantin Terpilih'}
                variant="filter"
                actionLabelOpen="Filter"
                actionLabelClose="Tutup"
                className="non-printable"
            >
                <div className="bg-brand-surface p-3 sm:p-4 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center non-printable border border-brand-border">
                    <h4 className="text-sm font-semibold text-brand-text-light whitespace-nowrap">Filter Laporan:</h4>
                    <select
                        name="client"
                        value={reportFilters.client}
                        onChange={e => setReportFilters(p => ({ ...p, client: e.target.value }))}
                        className="input-field !rounded-lg !border p-2 text-sm w-full md:w-auto"
                    >
                        <option value="all">Semua Pengantin</option>
                        {reportClientOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                        <input
                            type="date"
                            name="dateFrom"
                            value={reportFilters.dateFrom}
                            onChange={e => setReportFilters(p => ({ ...p, dateFrom: e.target.value }))}
                            className="input-field !rounded-lg !border p-2 text-sm w-full"
                            title="Dari Tanggal"
                        />
                        <input
                            type="date"
                            name="dateTo"
                            value={reportFilters.dateTo}
                            onChange={e => setReportFilters(p => ({ ...p, dateTo: e.target.value }))}
                            className="input-field !rounded-lg !border p-2 text-sm w-full"
                            title="Sampai Tanggal"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                        <button
                            onClick={handleDownloadReportExcel}
                            className="button-secondary inline-flex items-center justify-center gap-2 flex-1 md:flex-none min-h-[40px] text-xs sm:text-sm font-semibold"
                        >
                            <DownloadIcon className="w-4 h-4 flex-shrink-0" />Unduh Excel
                        </button>
                        <button
                            onClick={handleDownloadReportPDF}
                            disabled={isExportingReportPDF}
                            className="button-primary inline-flex items-center justify-center gap-2 flex-1 md:flex-none min-h-[40px] text-xs sm:text-sm font-semibold"
                        >
                            <DownloadIcon className="w-4 h-4 flex-shrink-0" />{isExportingReportPDF ? 'Menyiapkan PDF...' : 'Unduh PDF'}
                        </button>
                    </div>
                </div>
            </MobileCollapsibleSection>}

            {reportView === 'all' && <div className="scrollbar-hide flex w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-brand-border bg-white p-1.5 sm:flex-wrap sm:gap-2 sm:p-2" role="tablist" aria-label="Tab laporan keuangan">
                {reportSections.map(section => <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={activeReportSection === section.id}
                    onClick={() => setActiveReportSection(section.id)}
                    className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 ${activeReportSection === section.id ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-secondary hover:bg-brand-bg'}`}
                >{section.label}</button>)}
            </div>}

            {reportView !== 'overview' && reportView !== 'all' ? (
                <FinancialDetailReports
                    view={reportView}
                    transactions={reportTransactions}
                    projects={projects}
                    cards={cards}
                />
            ) : reportView === 'overview' || activeReportSection === 'overview' ? <>
            {/* Mobile simple report */}
            <div className="md:hidden space-y-3">
                {generalReportMetrics && reportFilters.client === 'all' && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Income</p>
                                <p className="font-semibold text-[#166534]">{formatCurrency(generalReportMetrics.reportIncome)}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Expense</p>
                                <p className="font-semibold text-[#DC2626]">{formatCurrency(generalReportMetrics.reportExpense)}</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Net</p>
                                <p className={`font-semibold ${generalReportMetrics.reportIncome >= generalReportMetrics.reportExpense ? 'text-[#166534]' : 'text-[#DC2626]'}`}>{formatCurrency(generalReportMetrics.reportIncome - generalReportMetrics.reportExpense)}</p>
                            </div>
                        </div>
                        <MobileTransactionsTable transactions={reportTransactions} />
                    </>
                )}
                {reportFilters.client !== 'all' && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Income</p>
                                <p className="font-semibold text-[#166534]">
                                    {formatCurrency(reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0))}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Biaya Produksi</p>
                                <p className="font-semibold text-[#DC2626]">
                                    {formatCurrency(reportTransactions.filter(t => t.type === TransactionType.EXPENSE && isProductionCostCategory(t.category)).reduce((s, t) => s + t.amount, 0))}
                                </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/5 border border-brand-border p-3">
                                <p className="text-[11px] text-brand-text-secondary">Laba</p>
                                <p className={`font-semibold ${reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0) >= reportTransactions.filter(t => t.type === TransactionType.EXPENSE && isProductionCostCategory(t.category)).reduce((s, t) => s + t.amount, 0) ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
                                    {formatCurrency(
                                        reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0) -
                                        reportTransactions.filter(t => t.type === TransactionType.EXPENSE && isProductionCostCategory(t.category)).reduce((s, t) => s + t.amount, 0)
                                    )}
                                </p>
                            </div>
                        </div>
                        <MobileTransactionsTable transactions={reportTransactions} />
                    </div>
                )}
            </div>

            {/* Desktop report */}
            {reportFilters.client !== 'all' ? (
                <div className="hidden md:block">
                    <ClientProfitabilityReport
                        transactions={reportTransactions}
                        clientName={reportClientOptions.find(c => c.id === reportFilters.client)?.name || ''}
                        periodText={`${reportFilters.dateFrom || ''} - ${reportFilters.dateTo || ''}`}
                        profile={profile}
                        projects={projects}
                        onEditTransaction={onEditTransaction}
                        onDeleteTransaction={onDeleteTransaction}
                        onAddTransaction={onAddTransaction}
                    />
                </div>
            ) : (
                generalReportMetrics && (
                    <div className="hidden md:block">
                        <GeneralFinancialReport
                            metrics={generalReportMetrics}
                            transactions={reportTransactions}
                            periodText={`${reportFilters.dateFrom || ''} - ${reportFilters.dateTo || ''}`}
                            profile={profile}
                            onEditTransaction={onEditTransaction}
                            onDeleteTransaction={onDeleteTransaction}
                            onAddTransaction={onAddTransaction}
                        />
                    </div>
                )
            )}
            </> : null}
            {reportView === 'all' && activeReportSection !== 'overview' && activeReportSection !== 'event' && <FinancialDetailReports
                view={activeReportSection}
                transactions={reportTransactions}
                projects={projects}
                cards={cards}
            />}
            {reportView === 'all' && activeReportSection === 'event' && profitReportFilters && setProfitReportFilters && profitReportMetrics && handleDownloadProfitReportCSV && handleDownloadProfitReportExcel && <EventProfitabilityTab
                    profitReportFilters={profitReportFilters}
                    setProfitReportFilters={setProfitReportFilters}
                    profitReportMetrics={profitReportMetrics}
                    projectProfitabilityData={projectProfitabilityData}
                    projects={projects}
                    profile={profile}
                    handleDownloadProfitReportCSV={handleDownloadProfitReportCSV}
                    handleDownloadProfitReportExcel={handleDownloadProfitReportExcel}
                />}
        </div>
    );
};

export default FinanceReportsTab;


