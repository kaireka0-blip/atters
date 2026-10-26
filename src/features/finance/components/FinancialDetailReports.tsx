import React, { useMemo, useState } from 'react';
import { Card, CardType, Project, Transaction, TransactionType } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { customizeUiText, useUiTextOverrides } from '../../../utils/uiTextCustomization';

type ReportView = 'clients' | 'categories' | 'balance';

interface Props {
  view: ReportView;
  transactions: Transaction[];
  projects: Project[];
  cards: Card[];
}

const FinancialDetailReports: React.FC<Props> = ({ view, transactions, projects, cards }) => {
  if (view === 'clients') return <ClientIncomeExpenseReport transactions={transactions} projects={projects} />;
  if (view === 'categories') return <CategoryIncomeExpenseReport transactions={transactions} />;
  return <BalanceSheetReport projects={projects} cards={cards} />;
};

const ClientIncomeExpenseReport: React.FC<Pick<Props, 'transactions' | 'projects'>> = ({ transactions, projects }) => {
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => {
    const projectClient = new Map(projects.map(project => [project.id, { id: project.clientId, name: project.clientName || 'Pengantin' }]));
    const totals = new Map<string, { id: string; name: string; income: number; expense: number; transactionCount: number; projects: Set<string>; transactions: Transaction[] }>();
    transactions.forEach(transaction => {
      const client = transaction.projectId ? projectClient.get(transaction.projectId) : undefined;
      const key = client?.id || '__unassigned__';
      const row = totals.get(key) || { id: key, name: client?.name || 'Tidak terhubung ke pengantin', income: 0, expense: 0, transactionCount: 0, projects: new Set<string>(), transactions: [] };
      if (transaction.type === TransactionType.INCOME) row.income += Number(transaction.amount) || 0;
      else if (transaction.type === TransactionType.EXPENSE) row.expense += Number(transaction.amount) || 0;
      row.transactionCount += 1;
      row.transactions.push(transaction);
      if (transaction.projectId) row.projects.add(transaction.projectId);
      totals.set(key, row);
    });
    return [...totals.values()].map(row => ({ ...row, projectCount: row.projects.size, profit: row.income - row.expense }))
      .sort((a, b) => b.profit - a.profit);
  }, [transactions, projects]);
  const sumIncome = rows.reduce((sum, row) => sum + row.income, 0);
  const sumExpense = rows.reduce((sum, row) => sum + row.expense, 0);
  const projectNames = new Map(projects.map(project => [project.id, project.projectName || project.packageName || 'Acara tanpa nama']));
  const toggleDetails = (key: string) => setExpandedDetails(previous => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const renderTransactionDetails = (row: (typeof rows)[number], type: TransactionType, detailKey: string) => {
    if (!expandedDetails.has(detailKey)) return null;
    const matchingTransactions = row.transactions.filter(transaction => transaction.type === type);
    const groupedByProject = new Map<string, Transaction[]>();
    matchingTransactions.forEach(transaction => {
      const key = transaction.projectId || '__general__';
      groupedByProject.set(key, [...(groupedByProject.get(key) || []), transaction]);
    });
    return <tr key={`${detailKey}-details`} className="bg-slate-50"><td colSpan={8} className="px-4 py-2">
      <div className="space-y-2">
        {[...groupedByProject.entries()].map(([projectId, eventTransactions]) => <section key={projectId} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
          <h4 className="mb-1 text-xs font-bold text-slate-800">{projectId === '__general__' ? 'Transaksi umum' : projectNames.get(projectId) || 'Acara'}</h4>
          {eventTransactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map(transaction => <div key={transaction.id} className="grid grid-cols-[minmax(80px,0.65fr)_minmax(0,2fr)_auto] gap-2 border-t border-slate-100 py-1 text-xs first:border-0">
            <span className="text-slate-500">{new Date(`${transaction.date.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID')}</span>
            <span className="break-words text-slate-700">{transaction.description || 'Transaksi'}</span>
            <strong className={type === TransactionType.INCOME ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(transaction.amount)}</strong>
          </div>)}
        </section>)}
      </div>
    </td></tr>;
  };
  return <ReportShell title="Pemasukan & Pengeluaran per Pengantin" subtitle="Laba bersih dihitung dari pemasukan dikurangi pengeluaran yang terhubung ke acara pengantin." >
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Summary label="Total pemasukan" value={formatCurrency(sumIncome)} tone="income" />
      <Summary label="Total pengeluaran" value={formatCurrency(sumExpense)} tone="expense" />
      <Summary label="Laba bersih" value={formatCurrency(sumIncome - sumExpense)} tone={sumIncome >= sumExpense ? 'profit' : 'loss'} />
    </div>
    <DataTable minWidth="min-w-[960px]" headers={['Pengantin', 'Acara', 'Transaksi', 'Pemasukan', 'Pengeluaran', 'Laba bersih', 'Rincian pemasukan', 'Rincian pengeluaran']} textKeys={['client', 'events', 'transactions', 'income', 'expense', 'profit', 'incomeDetails', 'expenseDetails']}>
      {rows.flatMap(row => {
        const incomeTransactions = row.transactions.filter(transaction => transaction.type === TransactionType.INCOME);
        const expenseTransactions = row.transactions.filter(transaction => transaction.type === TransactionType.EXPENSE);
        const incomeKey = `${row.id}::income`;
        const expenseKey = `${row.id}::expense`;
        return [
          <tr key={row.id} className="border-t border-[#E2E8F0]">
            <Cell strong>{row.name}</Cell><Cell>{row.projectCount}</Cell><Cell>{row.transactionCount}</Cell>
            <Cell align="right" color="income">{formatCurrency(row.income)}</Cell><Cell align="right" color="expense">{formatCurrency(row.expense)}</Cell>
            <Cell align="right" color={row.profit >= 0 ? 'income' : 'expense'} strong>{formatCurrency(row.profit)}</Cell>
            <Cell><button type="button" disabled={!incomeTransactions.length} aria-expanded={expandedDetails.has(incomeKey)} onClick={() => toggleDetails(incomeKey)} className="font-semibold text-emerald-700 hover:underline disabled:cursor-default disabled:text-slate-400">{incomeTransactions.length ? `Lihat (${incomeTransactions.length})` : '—'}</button></Cell>
            <Cell><button type="button" disabled={!expenseTransactions.length} aria-expanded={expandedDetails.has(expenseKey)} onClick={() => toggleDetails(expenseKey)} className="font-semibold text-rose-700 hover:underline disabled:cursor-default disabled:text-slate-400">{expenseTransactions.length ? `Lihat (${expenseTransactions.length})` : '—'}</button></Cell>
          </tr>,
          renderTransactionDetails(row, TransactionType.INCOME, incomeKey),
          renderTransactionDetails(row, TransactionType.EXPENSE, expenseKey),
        ].filter(Boolean);
      })}
      {!rows.length && <EmptyRow colSpan={8} />}
    </DataTable>
  </ReportShell>;
};

const CategoryIncomeExpenseReport: React.FC<Pick<Props, 'transactions'>> = ({ transactions }) => {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; category: string; type: TransactionType | 'Transfer Internal'; amount: number; transactions: Transaction[] }>();
    transactions.forEach(transaction => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) return;
      const category = transaction.category?.trim() || 'Tanpa kategori';
      const isTransfer = category.toLowerCase() === 'transfer internal' || transaction.description?.trim().toLowerCase().startsWith('transfer:');
      const type = isTransfer ? 'Transfer Internal' : transaction.type;
      const key = `${type}::${category}`;
      const row = map.get(key) || { key, category, type, amount: 0, transactions: [] };
      row.amount += Number(transaction.amount) || 0;
      row.transactions.push(transaction);
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [transactions, typeFilter]);
  // Categories are open by default; this set tracks only the ones the user closes.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());
  const toggleCategory = (key: string) => setCollapsedCategories(previous => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const income = grouped.filter(row => row.type === TransactionType.INCOME).reduce((sum, row) => sum + row.amount, 0);
  const expense = grouped.filter(row => row.type === TransactionType.EXPENSE).reduce((sum, row) => sum + row.amount, 0);
  return <ReportShell title="Pemasukan & Pengeluaran per Kategori" subtitle="Pilih kategori untuk melihat semua transaksi yang masuk ke dalamnya, termasuk kategori biaya tim/vendor." >
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jenis transaksi">
      {([['all', 'Semua'], [TransactionType.INCOME, 'Pemasukan'], [TransactionType.EXPENSE, 'Pengeluaran']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setTypeFilter(value); setCollapsedCategories(new Set()); }} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${typeFilter === value ? 'border-brand-accent bg-brand-accent text-white' : 'border-[#CBD5E1] bg-white text-[#475569]'}`}>{label}</button>)}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Summary label="Pemasukan" value={formatCurrency(income)} tone="income" />
      <Summary label="Pengeluaran" value={formatCurrency(expense)} tone="expense" />
      <Summary label="Selisih" value={formatCurrency(income - expense)} tone={income >= expense ? 'profit' : 'loss'} />
    </div>
    <DataTable headers={['Jenis', 'Kategori', 'Jumlah transaksi', 'Total']} textKeys={['type', 'category', 'transactionCount', 'total']}>
      {grouped.flatMap(row => [
        <tr key={row.key} className={`border-t border-[#E2E8F0] ${collapsedCategories.has(row.key) ? 'bg-white' : 'bg-brand-accent/5'}`}>
          <Cell><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-700' : row.type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>{row.type}</span></Cell>
          <Cell><button type="button" aria-expanded={!collapsedCategories.has(row.key)} onClick={() => toggleCategory(row.key)} className="text-left hover:underline"><span className="font-bold text-[#8F1616]">{row.category}</span><span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${collapsedCategories.has(row.key) ? 'bg-slate-100 text-slate-600' : 'bg-brand-accent/10 text-brand-accent'}`}>{collapsedCategories.has(row.key) ? 'Lihat transaksi' : 'Tutup rincian'}</span></button></Cell>
          <Cell>{row.transactions.length}</Cell><Cell align="right" strong color={row.type === TransactionType.INCOME ? 'income' : row.type === TransactionType.EXPENSE ? 'expense' : undefined}>{formatCurrency(row.amount)}</Cell>
        </tr>,
        ...(!collapsedCategories.has(row.key) ? [<tr key={`${row.key}-details`} className="bg-slate-50"><td colSpan={4} className="p-0"><div className="max-h-80 overflow-auto px-3 py-1">{row.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map(transaction => <div key={transaction.id} className="grid grid-cols-[minmax(100px,0.7fr)_minmax(0,2fr)_auto] gap-1 border-t border-slate-200 py-1 text-xs first:border-0"><span className="text-slate-500">{new Date(`${transaction.date.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID')}</span><span className="min-w-0"><span className="block break-words font-medium text-slate-800">{transaction.description || 'Transaksi'}</span><span className="text-[10px] text-slate-500">{transaction.projectId ? 'Terhubung ke acara' : 'Umum'} · {transaction.method}</span></span><strong className={row.type === TransactionType.INCOME ? 'text-emerald-700' : row.type === TransactionType.EXPENSE ? 'text-rose-700' : 'text-slate-700'}>{formatCurrency(transaction.amount)}</strong></div>)}</div></td></tr>] : [])
      ])}
      {!grouped.length && <EmptyRow colSpan={4} />}
    </DataTable>
  </ReportShell>;
};

const BalanceSheetReport: React.FC<Pick<Props, 'projects' | 'cards'>> = ({ projects, cards }) => {
  const dateLabel = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });
  const cashAndBank = cards.filter(card => card.cardType !== CardType.KREDIT).reduce((sum, card) => sum + Math.max(0, Number(card.balance) || 0), 0);
  const creditLiabilities = cards.filter(card => card.cardType === CardType.KREDIT).reduce((sum, card) => sum + Math.abs(Number(card.balance) || 0), 0);
  const receivables = projects.filter(project => !/dibatalkan|cancelled|canceled/i.test(project.status || '')).reduce((sum, project) => sum + Math.max(0, (Number(project.totalCost) || 0) - (Number(project.amountPaid) || 0)), 0);
  const assets = cashAndBank + receivables;
  const netPosition = assets - creditLiabilities;
  const cashShare = assets > 0 ? (cashAndBank / assets) * 100 : 0;
  const receivableShare = assets > 0 ? (receivables / assets) * 100 : 0;
  return <ReportShell title="Neraca Keuangan" subtitle={`Posisi saldo saat ini · ${dateLabel}. Berdasarkan saldo kartu, sisa tagihan acara, dan saldo kartu kredit yang tercatat.`}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5 sm:gap-3">
      <BalanceSummary label="Total aset" value={assets} color="emerald" />
      <BalanceSummary label="Kas & bank" value={cashAndBank} color="blue" />
      <BalanceSummary label="Piutang acara" value={receivables} color="sky" />
      <BalanceSummary label="Kewajiban" value={creditLiabilities} color="rose" />
      <BalanceSummary label="Posisi bersih" value={netPosition} color={netPosition >= 0 ? 'emerald' : 'rose'} />
    </div>
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-4" aria-label="Grafik komposisi aset">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-bold text-slate-900">Komposisi aset</h3><p className="mt-0.5 text-[11px] text-slate-500">Perbandingan kas & bank dengan piutang acara.</p></div>
        <strong className="text-sm text-slate-800">{formatCurrency(assets)}</strong>
      </div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Kas dan bank ${formatCurrency(cashAndBank)}, piutang acara ${formatCurrency(receivables)}`}>
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${cashShare}%` }} />
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${receivableShare}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Kas & bank</span><strong className="text-slate-800">{formatCurrency(cashAndBank)} <span className="font-medium text-slate-500">({cashShare.toFixed(1)}%)</span></strong></div>
        <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />Piutang acara</span><strong className="text-slate-800">{formatCurrency(receivables)} <span className="font-medium text-slate-500">({receivableShare.toFixed(1)}%)</span></strong></div>
      </div>
    </section>
    <DataTable headers={['Kelompok', 'Akun', 'Nilai']} textKeys={['group', 'account', 'value']}>
      <SectionRow title="ASET" />
      {cards.filter(card => card.cardType !== CardType.KREDIT).map(card => <tr key={card.id} className="border-t border-[#E2E8F0]"><Cell>Kas & bank</Cell><Cell>{card.cardHolderName} · {card.bankName}{card.cardType !== CardType.TUNAI && card.lastFourDigits ? ` ···· ${card.lastFourDigits}` : ''}</Cell><Cell align="right" color="income">{formatCurrency(Math.max(0, Number(card.balance) || 0))}</Cell></tr>)}
      {projects.filter(project => !/dibatalkan|cancelled|canceled/i.test(project.status || '') && Math.max(0, (Number(project.totalCost) || 0) - (Number(project.amountPaid) || 0)) > 0).map(project => <tr key={`receivable-${project.id}`} className="border-t border-[#E2E8F0]"><Cell>Piutang acara</Cell><Cell>{project.clientName || 'Pengantin'} · {project.projectName || project.packageName || 'Acara'}</Cell><Cell align="right" color="income">{formatCurrency(Math.max(0, (Number(project.totalCost) || 0) - (Number(project.amountPaid) || 0)))}</Cell></tr>)}
      <TotalRow label="Total aset" value={formatCurrency(assets)} />
      <SectionRow title="KEWAJIBAN" />
      {cards.filter(card => card.cardType === CardType.KREDIT).map(card => <tr key={card.id} className="border-t border-[#E2E8F0]"><Cell>Kartu kredit</Cell><Cell>{card.cardHolderName} · {card.bankName}{card.lastFourDigits ? ` ···· ${card.lastFourDigits}` : ''}</Cell><Cell align="right" color="expense">{formatCurrency(Math.abs(Number(card.balance) || 0))}</Cell></tr>)}
      <TotalRow label="Total kewajiban tercatat" value={formatCurrency(creditLiabilities)} />
      <SectionRow title="POSISI BERSIH" />
      <TotalRow label="Aset − kewajiban tercatat" value={formatCurrency(netPosition)} />
    </DataTable>
    <p className="text-[11px] leading-relaxed text-slate-500">Kantong tidak dijumlahkan terpisah karena merupakan alokasi dari saldo kartu. Neraca ini hanya merangkum aset dan kewajiban yang tersedia di aplikasi; kewajiban lain yang belum dicatat tidak termasuk.</p>
  </ReportShell>;
};

const ReportShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-5">
  <header><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></header>{children}
</section>;

const Summary: React.FC<{ label: string; value: string; tone: 'income' | 'expense' | 'profit' | 'loss' }> = ({ label, value, tone }) => <div className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-3"><p className="text-[11px] font-medium text-slate-500">{label}</p><p className={`mt-1 text-sm font-bold ${tone === 'income' || tone === 'profit' ? 'text-emerald-700' : 'text-rose-700'}`}>{value}</p></div>;

const BalanceSummary: React.FC<{ label: string; value: number; color: 'emerald' | 'blue' | 'sky' | 'rose' }> = ({ label, value, color }) => {
  const colorClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }[color];
  return <div className={`min-w-0 rounded-xl border p-3 ${colorClasses}`}><p className="text-[11px] font-medium opacity-80">{label}</p><p className="mt-1 break-words text-sm font-bold">{formatCurrency(value)}</p></div>;
};

const DataTable: React.FC<{ headers: string[]; textKeys?: string[]; children: React.ReactNode; minWidth?: string }> = ({ headers, textKeys, children, minWidth = 'min-w-[640px]' }) => {
  const uiTextOverrides = useUiTextOverrides();
  return <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]"><table className={`w-full ${minWidth} border-collapse text-left text-xs`}><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{headers.map((header, index) => <th key={header} className={`px-3 py-2 font-bold ${index > 1 ? 'text-right' : ''}`}>{textKeys?.[index] ? customizeUiText(`table.financeReport.${textKeys[index]}`, header, uiTextOverrides) : header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
};

const Cell: React.FC<{ children: React.ReactNode; align?: 'right'; color?: 'income' | 'expense'; strong?: boolean }> = ({ children, align, color, strong }) => <td className={`px-3 py-1.5 ${align === 'right' ? 'text-right' : ''} ${strong ? 'font-bold' : 'font-medium'} ${color === 'income' ? 'text-emerald-700' : color === 'expense' ? 'text-rose-700' : 'text-slate-700'}`}>{children}</td>;
const EmptyRow = ({ colSpan }: { colSpan: number }) => <tr><td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">Tidak ada transaksi pada filter ini.</td></tr>;
const SectionRow = ({ title }: { title: string }) => <tr className="border-t border-slate-200 bg-slate-100"><td colSpan={3} className="px-3 py-2 text-[10px] font-extrabold tracking-wide text-slate-700">{title}</td></tr>;
const TotalRow = ({ label, value }: { label: string; value: string }) => <tr className="border-t border-slate-200 bg-slate-50"><td colSpan={2} className="px-3 py-2.5 font-bold text-slate-900">{label}</td><td className="px-3 py-2.5 text-right font-bold text-slate-900">{value}</td></tr>;

export default FinancialDetailReports;
