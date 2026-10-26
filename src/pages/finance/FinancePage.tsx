import React, { useState, useMemo } from 'react';
import {
    Transaction,
    TransactionType,
    FinancialPocket,
    Profile,
    Project,
    Card,
    TeamMember,
    TeamProjectPayment,
    TeamPaymentRecord,
} from '../../types';

import { PlusIcon, DownloadIcon } from '../../constants';

import { FinanceHeaderStats } from '../../features/finance/components/FinanceHeaderStats';
import { FinanceTabs } from '../../features/finance/components/FinanceTabs';
import { MobileCollapsibleSection } from '../../components/ui/MobileProgressiveDisclosure';
import TransactionsTab from '../../features/finance/components/TransactionsTab';
import PocketsTab from '../../features/finance/components/PocketsTab';
import CardsTab from '../../features/finance/components/CardsTab';
import CashflowTab from '../../features/finance/components/CashflowTab';
import FinanceReportsTab from '../../features/finance/components/FinanceReportsTab';
import FinanceFormModal from '../../features/finance/components/FinanceFormModal';
import FinanceHistoryModal from '../../features/finance/components/FinanceHistoryModal';
import FinanceStatDetailModal from '../../features/finance/components/FinanceStatDetailModal';

import { useFinance } from '../../features/finance/hooks/useFinance';
import { useFinanceCalculations } from '../../features/finance/hooks/useFinanceCalculations';
import { useFinanceOperations } from '../../features/finance/hooks/useFinanceOperations';
import {
    getTransactionSubDescription,
    pocketIcons
} from '../../features/finance/utils/financeHelpers';
import {
    downloadTransactionsCSV,
    downloadProfitReportCSV,
    exportTransactionsToExcel,
    exportReportToExcel,
    exportProfitReportToExcel,
    exportCardsToExcel
} from '../../features/finance/utils/financeExport';
import {
    downloadReportPdf,
    buildReportFileName,
    ReportSection,
} from '../../shared/utils/reportPdf';

const formatRupiah = (amount: number): string =>
    `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;

interface FinanceProps {
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    profile: Profile;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    teamMembers: TeamMember[];
    teamProjectPayments: TeamProjectPayment[];
    setTeamProjectPayments: React.Dispatch<React.SetStateAction<TeamProjectPayment[]>>;
    teamPaymentRecords: TeamPaymentRecord[];
    setTeamPaymentRecords: React.Dispatch<React.SetStateAction<TeamPaymentRecord[]>>;
}

export type FinanceTabType =
    | 'transactions'
    | 'pockets'
    | 'cards'
    | 'cashflow'
    | 'laporan'
    | 'report-clients'
    | 'report-categories'
    | 'balance-sheet'
    | 'labaAcara Pernikahan';

// ── Small inline icon so we don't need to import a wallet icon ─────────────
const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4z" />
        <path d="M12 2v4M6 2v4" />
        <circle cx="17" cy="12" r="1" fill="currentColor" />
    </svg>
);

const Finance: React.FC<FinanceProps> = ({
    transactions,
    setTransactions,
    pockets,
    setPockets,
    projects,
    setProjects,
    profile,
    cards,
    setCards,
    teamProjectPayments,
    setTeamProjectPayments,
    teamPaymentRecords,
    setTeamPaymentRecords,
}) => {
    const showNotification = (_message: string) => {};

    const { handleDelete, handleAddTransaction, handleUpdateTransaction } = useFinance(
        transactions,
        setTransactions,
        pockets,
        setPockets,
        cards,
        setCards,
        showNotification,
        teamProjectPayments,
        setTeamProjectPayments,
        teamPaymentRecords,
        setTeamPaymentRecords,
    );

    // ── Navigation & Modal State ─────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<FinanceTabType>('transactions');
    const [historyModalState, setHistoryModalState] = useState<{
        type: 'card' | 'pocket';
        item: Card | FinancialPocket | null;
    } | null>(null);
    const [activeStatModal, setActiveStatModal] = useState<'assets' | 'pockets' | 'income' | 'expense' | null>(null);

    // ── Filters ──────────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({ searchTerm: '', dateFrom: '', dateTo: '' });
    const [categoryFilter, setCategoryFilter] = useState<{ type: TransactionType | 'all'; category: string }>({
        type: 'all',
        category: 'Semua'
    });
    const [reportFilters, setReportFilters] = useState({ client: 'all', dateFrom: '', dateTo: '' });
    const [profitReportFilters, setProfitReportFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth()
    });
    const [transactionProjectMonthFilter, setTransactionProjectMonthFilter] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [projectionMonths, setProjectionMonths] = useState<number>(6);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // ── Calculations ─────────────────────────────────────────────────────────
    const {
        cashflowChartData,
        cashflowMetrics,
        summary,
        thisMonthIncome,
        thisMonthExpense,
        monthlyBudgetPocket,
        categoryTotals,
        filteredTransactions,
        filteredSummary,
        cashflowFilteredSummary,
        reportClientOptions,
        reportTransactions,
        projectProfitabilityData,
        profitReportMetrics,
        generalReportMetrics,
        cardStats,
        expenseDonutData,
        incomeDonutData,
        projectionDecisionInsights
    } = useFinanceCalculations({
        transactions,
        cards,
        pockets,
        projects,
        filters,
        categoryFilter,
        reportFilters,
        profitReportFilters,
        projectionMonths
    });

    // ── Business Operations ───────────────────────────────────────────────────
    const {
        modalState,
        isSubmitting,
        form,
        setForm,
        hasMore,
        isLoadingMore,
        loadMoreTransactions,
        handleOpenModal,
        handleCloseModal,
        handleSubmit,
        handleFormChange,
        handleFilterChange,
        handleTutupAnggaran
    } = useFinanceOperations({
        transactions,
        setTransactions,
        pockets,
        setPockets,
        cards,
        setCards,
        projects,
        setProjects,
        handleAddTransaction,
        handleUpdateTransaction,
        showNotification,
        monthlyBudgetPocket,
        setFilters,
        setTransactionProjectMonthFilter
    });

    // ── Export context (hanya untuk memperkaya kolom; data sudah ter-filter per vendor) ──
    const financeExportContext = useMemo(() => ({
        companyName: profile.companyName,
        cards,
        pockets,
        projects,
        transactions
    }), [profile.companyName, cards, pockets, projects, transactions]);

    // ── CSV handlers (existing, dipertahankan) ────────────────────────────────
    const handleDownloadTransactionsCSVClick = () =>
        downloadTransactionsCSV(filteredTransactions, transactions, filteredSummary, financeExportContext);
    const handleDownloadProfitReportCSVClick = () =>
        downloadProfitReportCSV(projectProfitabilityData, profitReportFilters);

    // ── Excel handlers (penyempurnaan; tombol CSV tetap ada) ──────────────────
    const handleDownloadTransactionsExcelClick = (): void => {
        void exportTransactionsToExcel(filteredTransactions, transactions, filteredSummary, financeExportContext);
    };
    const handleDownloadReportExcelClick = (): void => {
        void exportReportToExcel(reportTransactions, reportFilters, reportClientOptions, financeExportContext);
    };
    const handleDownloadProfitReportExcelClick = (): void => {
        void exportProfitReportToExcel(projectProfitabilityData, profitReportFilters, financeExportContext);
    };
    const handleDownloadCardsExcelClick = (): void => {
        void exportCardsToExcel(cards, pockets, cardStats, financeExportContext);
    };

    // ── Unduh laporan PDF (ringkasan + tabel sesuai filter tanggal) ───────────
    const financePeriodLabel = filters.dateFrom || filters.dateTo
        ? `${filters.dateFrom || '...'} s/d ${filters.dateTo || '...'}`
        : 'Semua Periode';

    const handleDownloadFinancePdf = async (
        transactionsToExport: Transaction[] = filteredTransactions,
        periodLabel: string = financePeriodLabel,
        clientLabel?: string,
    ) => {
        if (isExportingPdf) return;
        setIsExportingPdf(true);
        try {
            const exportIncome = transactionsToExport
                .filter(transaction => transaction.type === TransactionType.INCOME)
                .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
            const exportExpense = transactionsToExport
                .filter(transaction => transaction.type === TransactionType.EXPENSE)
                .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
            const categoryGroups = new Map<string, { type: TransactionType; category: string; total: number; transactions: Transaction[] }>();
            transactionsToExport.forEach(transaction => {
                const category = transaction.category?.trim() || 'Tanpa kategori';
                const key = `${transaction.type}::${category}`;
                const group = categoryGroups.get(key) || { type: transaction.type, category, total: 0, transactions: [] };
                group.total += Number(transaction.amount) || 0;
                group.transactions.push(transaction);
                categoryGroups.set(key, group);
            });
            const sortedCategoryGroups = [...categoryGroups.values()].sort((left, right) => {
                const typeCompare = (left.type === TransactionType.INCOME ? 0 : 1) - (right.type === TransactionType.INCOME ? 0 : 1);
                return typeCompare || right.total - left.total || left.category.localeCompare(right.category);
            });
            const categoryRows: (string | number)[][] = sortedCategoryGroups.map(group => [
                group.type === TransactionType.INCOME ? 'Pemasukan' : 'Pengeluaran',
                group.category,
                group.total,
            ]);
            const categoryDetailSections: ReportSection[] = sortedCategoryGroups.map(group => ({
                title: `Rincian Transaksi: ${group.type === TransactionType.INCOME ? 'Pemasukan' : 'Pengeluaran'} - ${group.category}`,
                columns: [
                    { header: 'Tanggal', width: 1.2 },
                    { header: 'Deskripsi', width: 3.2 },
                    { header: 'Metode', width: 1.2 },
                    { header: 'Jumlah', width: 1.5, isCurrency: true, tone: group.type === TransactionType.INCOME ? 'positive' : 'auto' },
                ],
                rows: group.transactions.slice().sort((left, right) => right.date.localeCompare(left.date)).map(transaction => [
                    transaction.date ? new Date(transaction.date).toLocaleDateString('id-ID') : '-',
                    transaction.description || '-',
                    transaction.method || '-',
                    group.type === TransactionType.INCOME ? transaction.amount : -Math.abs(transaction.amount),
                ]),
                emptyText: 'Tidak ada transaksi pada kategori ini.',
            }));

            // ── Rekap laba per pengantin (transaksi sesuai filter tanggal) ──
            const projectById = new Map(projects.map(project => [project.id, project]));
            const clientProfitMap = new Map<string, { name: string; income: number; expense: number; projectIds: Set<string> }>();
            transactionsToExport.forEach(transaction => {
                if (!transaction.projectId) return;
                const project = projectById.get(transaction.projectId);
                if (!project) return;
                const entry = clientProfitMap.get(project.clientId) || {
                    name: project.clientName || project.projectName || 'Tanpa Pengantin',
                    income: 0,
                    expense: 0,
                    projectIds: new Set<string>(),
                };
                if (transaction.type === TransactionType.INCOME) entry.income += transaction.amount;
                else entry.expense += transaction.amount;
                entry.projectIds.add(project.id);
                clientProfitMap.set(project.clientId, entry);
            });

            const profitClients = Array.from(clientProfitMap.values())
                .sort((left, right) => (right.income - right.expense) - (left.income - left.expense));
            const profitRows: (string | number)[][] = profitClients.map(entry => [
                entry.name,
                entry.projectIds.size,
                entry.income,
                entry.expense,
                entry.income - entry.expense,
            ]);
            const profitTotals = profitClients.reduce((acc, entry) => ({
                events: acc.events + entry.projectIds.size,
                income: acc.income + entry.income,
                expense: acc.expense + entry.expense,
            }), { events: 0, income: 0, expense: 0 });
            profitRows.push([
                `TOTAL (${profitClients.length} pengantin)`,
                profitTotals.events,
                profitTotals.income,
                profitTotals.expense,
                profitTotals.income - profitTotals.expense,
            ]);

            // ── Rekap saldo akun (kartu & kantong) ──
            const accountRows: (string | number)[][] = [
                ...cards.map(card => [
                    `${card.bankName}${card.lastFourDigits ? ` •••• ${card.lastFourDigits}` : ''}`,
                    `Kartu ${card.cardType}`,
                    Number(card.balance) || 0,
                ]),
                ...pockets.map(pocket => [pocket.name, `Kantong ${pocket.type}`, Number(pocket.amount) || 0]),
            ];

            const sections: ReportSection[] = [
                {
                    title: 'Daftar Transaksi',
                    columns: [
                        { header: 'Tanggal', width: 1.1 },
                        { header: 'Keterangan', width: 2.4 },
                        { header: 'Kategori', width: 1.4 },
                        { header: 'Tipe', width: 0.9 },
                        { header: 'Jumlah', width: 1.5, isCurrency: true, tone: 'auto' },
                    ],
                    rows: transactionsToExport.map(transaction => [
                        transaction.date ? new Date(transaction.date).toLocaleDateString('id-ID') : '-',
                        transaction.description || '-',
                        transaction.category || '-',
                        transaction.type === TransactionType.INCOME ? 'Masuk' : 'Keluar',
                        transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount,
                    ]),
                    emptyText: 'Tidak ada transaksi pada periode ini.',
                },
                {
                    title: 'Ringkasan per Kategori',
                    columns: [
                        { header: 'Tipe', width: 1.1 },
                        { header: 'Kategori', width: 2.4 },
                        { header: 'Total', width: 1.5, isCurrency: true },
                    ],
                    rows: categoryRows,
                    emptyText: 'Belum ada data kategori.',
                },
                ...categoryDetailSections,
                {
                    title: 'Rekap Laba per Pengantin',
                    columns: [
                        { header: 'Pengantin', width: 2 },
                        { header: 'Acara', width: 0.8, align: 'right' },
                        { header: 'Pemasukan', width: 1.5, isCurrency: true, tone: 'positive' },
                        { header: 'Pengeluaran', width: 1.5, isCurrency: true, tone: 'negative' },
                        { header: 'Laba Bersih', width: 1.5, isCurrency: true, tone: 'auto' },
                    ],
                    rows: profitRows,
                    emptyText: 'Belum ada transaksi proyek pada periode ini.',
                },
                {
                    title: 'Rekap Saldo Akun & Kantong',
                    columns: [
                        { header: 'Nama Akun', width: 2.4 },
                        { header: 'Tipe', width: 1.6 },
                        { header: 'Saldo', width: 1.6, isCurrency: true },
                    ],
                    rows: accountRows,
                    emptyText: 'Belum ada akun atau kantong terdaftar.',
                },
            ];

            const periodKey = periodLabel === 'Semua Periode'
                ? 'semua-periode'
                : periodLabel.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

            await downloadReportPdf({
                title: 'Laporan Keuangan',
                subtitle: clientLabel ? `${profile.companyName} · ${clientLabel}` : profile.companyName,
                periodLabel,
                profile,
                filename: buildReportFileName('Laporan-Keuangan', periodKey),
                summaryCards: [
                    { label: 'Total Pemasukan', value: formatRupiah(exportIncome), tone: 'positive' },
                    { label: 'Total Pengeluaran', value: formatRupiah(exportExpense), tone: 'negative' },
                    {
                        label: 'Laba Bersih',
                        value: formatRupiah(exportIncome - exportExpense),
                        tone: exportIncome >= exportExpense ? 'positive' : 'negative',
                    },
                    { label: 'Jumlah Transaksi', value: String(transactionsToExport.length) },
                ],
                sections,
                footerNote: `Dibuat otomatis oleh sistem pada ${new Date().toLocaleString('id-ID')}.`,
            });
        } catch (error) {
            console.error('[FinancePage] Gagal membuat laporan PDF:', error);
        } finally {
            setIsExportingPdf(false);
        }
    };

    const reportPdfPeriodLabel = reportFilters.dateFrom || reportFilters.dateTo
        ? `${reportFilters.dateFrom || '...'} s/d ${reportFilters.dateTo || '...'}`
        : 'Semua Periode';
    const reportPdfClientLabel = reportFilters.client === 'all'
        ? undefined
        : reportClientOptions.find(client => client.id === reportFilters.client)?.name || 'Pengantin terpilih';
    const handleDownloadFilteredReportPdf = () => {
        void handleDownloadFinancePdf(reportTransactions, reportPdfPeriodLabel, reportPdfClientLabel);
    };

    // ── Tab content ───────────────────────────────────────────────────────────
    const renderTabContent = () => {
        switch (activeTab) {
            case 'transactions':
                return (
                    <TransactionsTab
                        monthlyBudgetPocket={monthlyBudgetPocket}
                        onTutupAnggaran={handleTutupAnggaran}
                        categoryTotals={categoryTotals}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={setCategoryFilter}
                        filters={filters}
                        handleFilterChange={handleFilterChange}
                        handleDownloadTransactionsCSV={handleDownloadTransactionsCSVClick}
                        handleDownloadTransactionsExcel={handleDownloadTransactionsExcelClick}
                        filteredSummary={filteredSummary}
                        filteredTransactions={filteredTransactions}
                        getTransactionSubDescription={(t) => getTransactionSubDescription(t, cards, pockets, projects)}
                        onOpenModal={handleOpenModal}
                        onDeleteTransaction={(id) => handleDelete('transaction', id)}
                        hasMore={hasMore}
                        loadMoreTransactions={loadMoreTransactions}
                        isLoadingMore={isLoadingMore}
                    />
                );
            case 'pockets':
                return (
                    <PocketsTab
                        pockets={pockets}
                        cards={cards}
                        summary={summary}
                        onOpenModal={handleOpenModal}
                        onDeletePocket={(id) => handleDelete('pocket', id)}
                        onViewHistory={(p) => setHistoryModalState({ type: 'pocket', item: p })}
                    />
                );
            case 'cards':
                return (
                    <CardsTab
                        cards={cards}
                        pockets={pockets}
                        cardStats={cardStats}
                        onOpenModal={handleOpenModal}
                        onDeleteCard={(id) => handleDelete('card', id)}
                        onViewHistory={(card) => setHistoryModalState({ type: 'card', item: card })}
                        handleDownloadCardsExcel={handleDownloadCardsExcelClick}
                    />
                );
            case 'cashflow':
                return (
                    <CashflowTab
                        cashflowMetrics={cashflowMetrics}
                        filteredSummary={cashflowFilteredSummary}
                        cashflowChartData={cashflowChartData}
                        expenseDonutData={expenseDonutData}
                        incomeDonutData={incomeDonutData}
                        decisionInsights={projectionDecisionInsights}
                        projectionMonths={projectionMonths}
                        onProjectionMonthsChange={setProjectionMonths}
                    />
                );
            case 'laporan':
            case 'report-clients':
            case 'report-categories':
            case 'balance-sheet':
            case 'labaAcara Pernikahan':
                return (
                    <FinanceReportsTab
                        reportView="all"
                        reportFilters={reportFilters}
                        setReportFilters={setReportFilters}
                        reportClientOptions={reportClientOptions}
                        handleDownloadReportExcel={handleDownloadReportExcelClick}
                        handleDownloadReportPDF={handleDownloadFilteredReportPdf}
                        isExportingReportPDF={isExportingPdf}
                        generalReportMetrics={generalReportMetrics}
                        reportTransactions={reportTransactions}
                        profile={profile}
                        projects={projects}
                        cards={cards}
                        profitReportFilters={profitReportFilters}
                        setProfitReportFilters={setProfitReportFilters}
                        profitReportMetrics={profitReportMetrics}
                        projectProfitabilityData={projectProfitabilityData}
                        handleDownloadProfitReportCSV={handleDownloadProfitReportCSVClick}
                        handleDownloadProfitReportExcel={handleDownloadProfitReportExcelClick}
                        onEditTransaction={(t) => handleOpenModal('transaction', 'edit', t)}
                        onDeleteTransaction={(id) => handleDelete('transaction', id)}
                        onAddTransaction={() => handleOpenModal('transaction', 'add')}
                    />
                );
            default:
                return null;
        }
    };

    // ── All-time totals for header stat cards ────────────────────────────────
    const allTimeTotals = useMemo(() => {
        const income = transactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    }, [transactions]);

    // ── Derived values for summary panel ─────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* ── Page header bar ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 non-printable">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ECF2FF] border border-[#d8e6ff]
                                    flex items-center justify-center flex-shrink-0 shadow-xs">
                        <WalletIcon className="w-5 h-5 text-[#5D87FF]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#2A3547] leading-tight">Keuangan</h1>
                        <p className="text-xs text-[#5A6A85] font-medium leading-tight hidden sm:block">
                            {transactions.length} transaksi &middot; {cards.length} kartu &middot; {pockets.length} kantong
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadFinancePdf}
                        disabled={isExportingPdf}
                        className="bg-white hover:bg-[#F4F6F9] text-[#2A3547] font-bold rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm border border-[#EAEFF4] inline-flex items-center gap-1.5 transition-all disabled:opacity-60"
                    >
                        <DownloadIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">{isExportingPdf ? 'Menyiapkan...' : 'Unduh PDF'}</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal('transaction', 'add')}
                        className="bg-[#5D87FF] hover:bg-[#4871e3] text-white font-bold rounded-xl px-4 py-2.5 text-xs sm:text-sm shadow-md shadow-[#5D87FF]/25 inline-flex items-center gap-1.5 transition-all"
                    >
                        <PlusIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Tambah Transaksi</span>
                        <span className="sm:hidden">+ Transaksi</span>
                    </button>
                </div>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────────── */}
            <FinanceHeaderStats summary={summary} allTimeTotals={allTimeTotals} setActiveStatModal={setActiveStatModal} />

            {/* ── Tab bar (shared desktop + mobile) ────────────────────────── */}
            <FinanceTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* ── Tab content ──────────────────────────────────────────────── */}
            <div className="widget-animate">
                {renderTabContent()}
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            <FinanceFormModal
                modalState={modalState}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                form={form}
                setForm={setForm}
                handleFormChange={handleFormChange}
                isSubmitting={isSubmitting}
                profile={profile}
                cards={cards}
                pockets={pockets}
                projects={projects}
                transactionProjectMonthFilter={transactionProjectMonthFilter}
                setTransactionProjectMonthFilter={setTransactionProjectMonthFilter}
                pocketIcons={pocketIcons}
            />

            <FinanceHistoryModal
                historyModalState={historyModalState}
                onClose={() => setHistoryModalState(null)}
                transactions={transactions}
                cards={cards}
            />

            <FinanceStatDetailModal
                activeStatModal={activeStatModal}
                onClose={() => setActiveStatModal(null)}
                cards={cards}
                pockets={pockets}
                thisMonthIncome={thisMonthIncome}
                thisMonthExpense={thisMonthExpense}
            />
        </div>
    );
};

export default Finance;
