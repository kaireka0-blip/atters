import { useMemo } from 'react';
import {
    Transaction,
    TransactionType,
    Card,
    CardType,
    FinancialPocket,
    PocketType,
    Project
} from '../../../types';
import { getMonthDateRange } from '../utils/financeHelpers';
import { PRODUCTION_COST_CATEGORIES, isProductionCostCategory } from '../components/FinanceReportsTab';

interface UseFinanceCalculationsParams {
    transactions: Transaction[];
    cards: Card[];
    pockets: FinancialPocket[];
    projects: Project[];
    filters: { searchTerm: string; dateFrom: string; dateTo: string };
    categoryFilter: { type: TransactionType | 'all'; category: string };
    reportFilters: { client: string; dateFrom: string; dateTo: string };
    profitReportFilters: { year: number; month: number };
    projectionMonths?: number;
}

export interface CashflowChartItem {
    label: string;
    income: number;
    expense: number;
    balance: number;
    isProjected?: boolean;
    projectedReceivables?: number;
    net: number;
}

export interface DecisionInsight {
    projectedNetTotal: number;
    projectedEndBalance: number;
    minProjectedBalance: number;
    upcomingReceivablesTotal: number;
    avgMonthlySurplus: number;
    status: 'healthy' | 'caution' | 'warning';
}

const isInternalTransfer = (transaction: Transaction) =>
    transaction.category?.trim().toLowerCase() === 'transfer internal'
    || transaction.description?.trim().toLowerCase().startsWith('transfer:');

export function useFinanceCalculations({
    transactions: rawTransactions,
    cards,
    pockets,
    projects,
    filters,
    categoryFilter,
    reportFilters,
    profitReportFilters,
    projectionMonths = 6
}: UseFinanceCalculationsParams) {
    // Strictly deduplicate transactions by ID to guarantee calculations and table never double count
    const transactions = useMemo(() => {
        const seen = new Set<string>();
        const res: Transaction[] = [];
        for (const t of rawTransactions) {
            if (t && t.id && !seen.has(t.id)) {
                seen.add(t.id);
                res.push(t);
            }
        }
        return res;
    }, [rawTransactions]);

    // Calculate historical baseline & future forecast with upcoming project receivables
    const { cashflowChartData, projectionDecisionInsights, historicalMonthsCount } = useMemo(() => {
        const now = new Date();
        const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = (date: Date) => date.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
        const monthlyHistorical: Record<string, { income: number; expense: number; year: number; month: number }> = {};
        // Internal movement between cards/pockets is recorded for audit, but it
        // is neither operating income nor expense and must not distort cash flow.
        const historicalTransactions = transactions.filter(t => new Date(t.date) <= now && !isInternalTransfer(t));

        historicalTransactions.forEach(t => {
            const date = new Date(t.date);
            const key = monthKey(date);
            if (!monthlyHistorical[key]) {
                monthlyHistorical[key] = {
                    income: 0,
                    expense: 0,
                    year: date.getFullYear(),
                    month: date.getMonth()
                };
            }
            if (t.type === TransactionType.INCOME) monthlyHistorical[key].income += t.amount;
            else if (t.type === TransactionType.EXPENSE) monthlyHistorical[key].expense += t.amount;
        });

        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstTransaction = historicalTransactions.reduce<Date | null>((earliest, transaction) => {
            const date = new Date(transaction.date);
            const month = new Date(date.getFullYear(), date.getMonth(), 1);
            return !earliest || month < earliest ? month : earliest;
        }, null);
        const firstMonth = firstTransaction || currentMonth;
        const historicalEntries: Array<[string, { income: number; expense: number; year: number; month: number }]> = [];
        for (const date = new Date(firstMonth); date <= currentMonth; date.setMonth(date.getMonth() + 1)) {
            const key = monthKey(date);
            historicalEntries.push([
                key,
                monthlyHistorical[key] || {
                    income: 0,
                    expense: 0,
                    year: date.getFullYear(),
                    month: date.getMonth()
                }
            ]);
        }
        const historicalMonthsCount = historicalTransactions.length > 0 ? historicalEntries.length : 0;

        // Average over six calendar months so months without transactions count as zero.
        const recentMonths = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
            const key = monthKey(date);
            return monthlyHistorical[key] || { income: 0, expense: 0 };
        });
        const avgIncome = Math.round(recentMonths.reduce((sum, val) => sum + val.income, 0) / recentMonths.length);
        const avgExpense = Math.round(recentMonths.reduce((sum, val) => sum + val.expense, 0) / recentMonths.length);

        // Reconstruct month-end balances from the current account balance and the transaction ledger.
        const currentAssets = cards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
        const historicalNet = historicalTransactions.reduce((sum, transaction) => {
            return sum + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount);
        }, 0);
        let runningBalance = currentAssets - historicalNet;
        const chartItems: CashflowChartItem[] = [];

        historicalEntries.forEach(([label, vals]) => {
            const net = vals.income - vals.expense;
            runningBalance += net;
            chartItems.push({
                label: monthLabel(new Date(vals.year, vals.month, 1)),
                income: vals.income,
                expense: vals.expense,
                balance: runningBalance,
                isProjected: false,
                net
            });
        });

        // Projections always start from the current calendar month, even if there are no recent transactions.
        const baseYear = now.getFullYear();
        const baseMonth = now.getMonth();

        // Project upcoming months if projectionMonths > 0
        let totalProjectedNet = 0;
        let totalUpcomingReceivables = 0;
        let minBalanceInProjection = runningBalance;

        if (projectionMonths > 0) {
            for (let i = 1; i <= projectionMonths; i++) {
                const targetDate = new Date(baseYear, baseMonth + i, 1);
                const targetYear = targetDate.getFullYear();
                const targetMonthIndex = targetDate.getMonth();
                const label = monthLabel(targetDate);

                // Allocate the real outstanding project balance to its recorded event month.
                const monthProjects = projects.filter(p => {
                    if (/dibatalkan|canceled|cancelled/i.test(p.status || '')) return false;
                    const pDate = new Date(p.deadlineDate || p.date || '');
                    return !isNaN(pDate.getTime()) &&
                           pDate.getFullYear() === targetYear &&
                           pDate.getMonth() === targetMonthIndex;
                });

                const receivablesInMonth = monthProjects.reduce((sum, p) => {
                    const totalCost = Number(p.totalCost) || 0;
                    const amountPaid = Number(p.amountPaid) || 0;
                    const remaining = Math.max(0, totalCost - amountPaid);
                    return sum + remaining;
                }, 0);

                totalUpcomingReceivables += receivablesInMonth;

                const projectedIncome = avgIncome + receivablesInMonth;
                const projectedExpense = avgExpense;
                const projectedNet = projectedIncome - projectedExpense;

                runningBalance += projectedNet;
                totalProjectedNet += projectedNet;
                if (runningBalance < minBalanceInProjection) {
                    minBalanceInProjection = runningBalance;
                }

                chartItems.push({
                    label,
                    income: projectedIncome,
                    expense: projectedExpense,
                    balance: runningBalance,
                    isProjected: true,
                    projectedReceivables: receivablesInMonth,
                    net: projectedNet
                });
            }
        }

        // Deterministic indicators derived from the same transaction and project records.
        const avgMonthlySurplus = projectionMonths > 0 ? Math.round(totalProjectedNet / projectionMonths) : 0;
        let status: 'healthy' | 'caution' | 'warning' = 'healthy';

        if (minBalanceInProjection < 0) {
            status = 'warning';
        } else if (totalProjectedNet < 0) {
            status = 'caution';
        }

        const decisionInsights: DecisionInsight = {
            projectedNetTotal: totalProjectedNet,
            projectedEndBalance: runningBalance,
            minProjectedBalance: minBalanceInProjection,
            upcomingReceivablesTotal: totalUpcomingReceivables,
            avgMonthlySurplus,
            status
        };

        return {
            cashflowChartData: chartItems,
            projectionDecisionInsights: decisionInsights,
            historicalMonthsCount
        };
    }, [transactions, cards, projects, projectionMonths]);

    const cashflowMetrics = useMemo(() => {
        const historicalData = cashflowChartData.filter(item => !item.isProjected).slice(-6);
        if (historicalData.length === 0) {
            return { avgIncome: 0, avgExpense: 0, runway: 'N/A', burnRate: 0 };
        }
        const totalIncome = historicalData.reduce((sum, month) => sum + month.income, 0);
        const totalExpense = historicalData.reduce((sum, month) => sum + month.expense, 0);

        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const recentTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date >= sixMonthsAgo && date <= now && !isInternalTransfer(t);
        });
        const recentNetChange = recentTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0) - recentTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const monthlyBurnRate = recentNetChange > 0 ? recentNetChange / 6 : 0;

        let runway = 'Tidak ada defisit';
        if (monthlyBurnRate > 0) {
            const totalAssets = cards.reduce((sum, card) => sum + card.balance, 0);
            const runwayInMonths = totalAssets / monthlyBurnRate;
            runway = `${runwayInMonths.toFixed(1)} bulan`;
        }

        return {
            avgIncome: totalIncome / historicalData.length,
            avgExpense: totalExpense / historicalData.length,
            runway,
            burnRate: monthlyBurnRate
        };
    }, [transactions, cards, cashflowChartData]);

    const { summary, thisMonthIncome, thisMonthExpense } = useMemo(() => {
        const totalAssets = cards.reduce((sum, c) => sum + c.balance, 0);
        const pocketsTotal = pockets.reduce((sum, p) => sum + p.amount, 0);

        const now = new Date();
        const { from, to } = getMonthDateRange(now);
        const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(to); toDate.setHours(23, 59, 59, 999);

        const thisMonthTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= fromDate && txDate <= toDate;
        });

        const totalIncomeThisMonth = thisMonthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseThisMonth = thisMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

        return {
            summary: { totalAssets, pocketsTotal, totalIncomeThisMonth, totalExpenseThisMonth },
            thisMonthIncome: thisMonthTransactions.filter(t => t.type === TransactionType.INCOME).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            thisMonthExpense: thisMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    }, [cards, pockets, transactions]);

    const monthlyBudgetPocket = useMemo(() => pockets.find(p => p.type === PocketType.EXPENSE), [pockets]);

    const categoryTotals = useMemo<{ income: Record<string, number>; expense: Record<string, number> }>(() => {
        const income: Record<string, number> = {};
        const expense: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === TransactionType.INCOME) {
                income[t.category] = (income[t.category] || 0) + t.amount;
            } else {
                expense[t.category] = (expense[t.category] || 0) + t.amount;
            }
        });

        return { income, expense };
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(t.date);
            const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
            const to = filters.dateTo ? new Date(filters.dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);

            const searchMatch = (
                t.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
            const dateMatch = (!from || date >= from) && (!to || date <= to);

            let categoryMatch = true;
            if (categoryFilter.type !== 'all') {
                if (t.type !== categoryFilter.type) {
                    categoryMatch = false;
                } else if (categoryFilter.category !== 'Semua' && t.category !== categoryFilter.category) {
                    categoryMatch = false;
                }
            }

            return searchMatch && dateMatch && categoryMatch;
        });
    }, [transactions, filters, categoryFilter]);

    const filteredSummary = useMemo(() => {
        const income = filteredTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, net: income - expense };
    }, [filteredTransactions]);

    const cashflowFilteredSummary = useMemo(() => {
        const economicTransactions = filteredTransactions.filter(transaction => !isInternalTransfer(transaction));
        const income = economicTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const expense = economicTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, net: income - expense };
    }, [filteredTransactions]);

    const reportClientOptions = useMemo(() => {
        const clientMap = projects.reduce((acc, p) => {
            if (!acc[p.clientId]) {
                acc[p.clientId] = p.clientName;
            }
            return acc;
        }, {} as Record<string, string>);
        return Object.entries(clientMap).map(([id, name]) => ({ id, name }));
    }, [projects]);

    const reportTransactions = useMemo(() => transactions.filter(t => {
        const date = new Date(t.date);
        const from = reportFilters.dateFrom ? new Date(reportFilters.dateFrom) : null;
        const to = reportFilters.dateTo ? new Date(reportFilters.dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);

        const dateMatch = (!from || date >= from) && (!to || date <= to);

        const projectIdsForClient = projects
            .filter(p => p.clientId === reportFilters.client)
            .map(p => p.id);

        const clientMatch = reportFilters.client === 'all' || (t.projectId && projectIdsForClient.includes(t.projectId));

        return dateMatch && clientMatch;
    }), [transactions, projects, reportFilters]);

    const projectProfitabilityData = useMemo(() => {
        const { year, month } = profitReportFilters;

        // 1. Filter projects that have an event date within the selected month/year
        const projectsInMonth = projects.filter(p => {
            const projectDate = new Date(p.date);
            return projectDate.getFullYear() === year && projectDate.getMonth() === month;
        });

        // 2. Get a unique list of clientIds from these projects
        const clientIdsInMonth = [...new Set(projectsInMonth.map(p => p.clientId))];

        // 3. For each unique clientId, calculate profitability
        return clientIdsInMonth.map(clientId => {
            const client = reportClientOptions.find(c => c.id === clientId);
            if (!client) return null;

            const clientProjectsInMonth = projectsInMonth.filter(p => p.clientId === clientId);
            const clientProjectIdsInMonth = clientProjectsInMonth.map(p => p.id);

            // Find all transactions linked to this client's projects in this month
            const relevantTransactions = transactions.filter(t => t.projectId && clientProjectIdsInMonth.includes(t.projectId));

            const totalIncome = relevantTransactions
                .filter(t => t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);

            // Semua pengeluaran yang di-tag ke acara ini dihitung sebagai biaya produksi
            const totalCost = relevantTransactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);

            const totalCustomCosts = clientProjectsInMonth.reduce((sum, p) => sum + (p.customCosts?.reduce((s, c) => s + c.amount, 0) || 0), 0);
            // Hitung Transport dari transaksi aktual yang di-tag ke acara
            const totalTransportCosts = relevantTransactions
                .filter(t => t.type === TransactionType.EXPENSE && isProductionCostCategory(t.category) && t.category.toLowerCase().includes('transport'))
                .reduce((sum, t) => sum + t.amount, 0);
            // Harga package = total pembayaran dikurangi biaya tambahan dan transport
            const totalPackageRevenue = clientProjectsInMonth.reduce((sum, p) => sum + (p.totalCost - (p.customCosts?.reduce((s, c) => s + c.amount, 0) || 0)), 0) - totalTransportCosts;

            const profit = totalIncome - totalCost;

            return {
                clientId,
                clientName: client.name,
                totalIncome,
                totalCost,
                profit,
                totalPackageRevenue,
                totalCustomCosts,
                totalTransportCosts,
                projects: clientProjectsInMonth
            };
        }).filter(Boolean);
    }, [profitReportFilters, projects, transactions, reportClientOptions]);

    const profitReportMetrics = useMemo(() => {
        if (projectProfitabilityData.length === 0) {
            return { totalProfit: 0, mostProfitableClient: 'N/A', profitableProjectsCount: 0, avgProfit: 0 };
        }
        const totalProfit = projectProfitabilityData.reduce((sum, item) => sum + (item?.profit || 0), 0);
        const mostProfitableClient = [...projectProfitabilityData].sort((a, b) => (b?.profit || 0) - (a?.profit || 0))[0]?.clientName || 'N/A';
        const profitableProjectsCount = projectProfitabilityData.filter(item => (item?.profit || 0) > 0).length;
        const avgProfit = totalProfit / projectProfitabilityData.length;
        return { totalProfit, mostProfitableClient, profitableProjectsCount, avgProfit };
    }, [projectProfitabilityData]);

    const reportYearOptions = useMemo(() => {
        const years = new Set<number>(transactions.map(t => new Date(t.date).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [transactions]);

    const generalReportMetrics = useMemo(() => {
        if (reportFilters.client !== 'all') return null;
        const reportIncome = reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const reportExpense = reportTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        const incomeDonut = Object.entries(reportTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {} as Record<string, number>)).map(([l, v], i) => ({ label: l, value: v, color: ['#34d399', '#60a5fa', '#38bdf8', '#a3e635', '#4ade80'][i % 5] }));
        const expenseDonut = Object.entries(reportTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {} as Record<string, number>)).map(([l, v], i) => ({ label: l, value: v, color: ['#f87171', '#fb923c', '#facc15', '#ef4444', '#f472b6'][i % 5] }));
        return { reportIncome, reportExpense, incomeDonut, expenseDonut };
    }, [reportTransactions, reportFilters.client]);

    const cardStats = useMemo(() => {
        const creditDebt = cards
            .filter(c => c.cardType === CardType.KREDIT)
            .reduce((sum, c) => sum + Math.abs(Number(c.balance) || 0), 0);

        const debitAndCashAssets = cards
            .filter(c => c.cardType !== CardType.KREDIT)
            .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

        const cashBalance = cards
            .filter(c => c.cardType === CardType.TUNAI)
            .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

        const cardIdSet = new Set(cards.map(c => c.id));
        const transactionCounts = transactions.reduce((acc, t) => {
            if (t.cardId && cardIdSet.has(t.cardId)) {
                acc[t.cardId] = (acc[t.cardId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const idsByUsage = Object.keys(transactionCounts).sort((a, b) => transactionCounts[b] - transactionCounts[a]);
        const mostUsedCardId = idsByUsage[0] || null;
        const mostUsedCard = mostUsedCardId ? cards.find(c => c.id === mostUsedCardId) : null;
        const mostUsedCardName = mostUsedCard ? `${mostUsedCard.bankName} (${mostUsedCard.lastFourDigits ? '...' + mostUsedCard.lastFourDigits : ''})` : 'N/A';
        const mostUsedCardTxCount = mostUsedCardId ? transactionCounts[mostUsedCardId] : 0;

        const topUsedCards = idsByUsage.slice(0, 3).map(id => {
            const card = cards.find(c => c.id === id);
            return { id, name: card ? `${card.bankName} (${card.lastFourDigits ? '...' + card.lastFourDigits : ''})` : id, count: transactionCounts[id] };
        });
        return { creditDebt, debitAndCashAssets, cashBalance, mostUsedCardName, mostUsedCardTxCount, topUsedCards };
    }, [cards, transactions]);

    const expenseDonutData = useMemo(() => {
        const expenseByCategory = transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const colors = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
        return Object.entries(expenseByCategory)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    }, [transactions]);

    const incomeDonutData = useMemo(() => {
        const incomeByCategory = transactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const colors = ['#34d399', '#60a5fa', '#38bdf8', '#a3e635', '#22d3ee'];
        return Object.entries(incomeByCategory)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    }, [transactions]);

    return {
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
        reportYearOptions,
        generalReportMetrics,
        cardStats,
        expenseDonutData,
        incomeDonutData,
        projectionDecisionInsights,
        historicalMonthsCount
    };
}


