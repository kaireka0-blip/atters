/**
 * TeamMemberDetailModal
 *
 * Redesigned detail modal for a team / vendor member.
 *
 * Layout:
 *   ┌─ Profile header (avatar, name, role, category badge, contact)
 *   ├─ Snapshot row  (total acara · total pendapatan · rating)
 *   ├─ Tab nav       (Acara | Pembayaran | Kinerja | Portal)
 *   └─ Tab content   (scrollable)
 */

import React, { Fragment, useMemo, useState } from 'react';
import Modal from '../../../shared/ui/Modal';
import FreelancerProjects, { UnpaidTeamPaymentsSection } from './FreelancerProjects';
import PerformanceTab from './PerformanceTab';
import CreatePaymentTab from './CreatePaymentTab';
import {
  TeamMember,
  TeamProjectPayment,
  TeamPaymentRecord,
  Project,
  Card,
  FinancialPocket,
  PerformanceNoteType,
} from '../../../types';
import { dedupeCurrentTeamPayments, formatCurrency, formatDate, getEmployeeSalaryRecordNumber } from '../utils/teamUtils';
import { StarIcon, FileTextIcon, Share2Icon, PencilIcon, Trash2Icon } from '../../../constants';
import { Phone, Mail, CreditCard, ChevronDown, Pencil, Trash2, Save, X, Wallet } from 'lucide-react';
import { customizeUiText, useUiTextOverrides } from '../../../utils/uiTextCustomization';

// ─── Local types ──────────────────────────────────────────────────────────────

type DetailTab = 'projects' | 'salary' | 'payments' | 'performance' | 'create-payment';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamMemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMember: TeamMember;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  // Projects tab
  selectedMemberUnpaidProjects: TeamProjectPayment[];
  projectsToPay: string[];
  onToggleProject: (id: string) => void;
  onProceedToPayment: () => void;
  onPayProject: (projectPaymentId: string) => void;
  onPayMonthlySalary: (month: string) => void;
  teamProjectPayments: TeamProjectPayment[];
  teamPaymentRecords: TeamPaymentRecord[];
  projects: Project[];
  // Performance tab
  newNote: string;
  setNewNote: (note: string) => void;
  newNoteType: PerformanceNoteType;
  setNewNoteType: (type: PerformanceNoteType) => void;
  onSetRating: (rating: number) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  // Create-payment tab
  paymentAmount: number | '';
  setPaymentAmount: React.Dispatch<React.SetStateAction<number | ''>>;
  isInstallment: boolean;
  setIsInstallment: React.Dispatch<React.SetStateAction<boolean>>;
  onPay: () => void;
  renderPaymentSlipBody: (record: TeamPaymentRecord) => React.ReactNode;
  cards: Card[];
  monthlyBudgetPocket: FinancialPocket | undefined;
  paymentSourceId: string;
  setPaymentSourceId: (id: string) => void;
  onSign: () => void;
  // Portal
  onOpenQrModal: (member: TeamMember) => void;
  // Salary tab actions
  onEditFee?: (paymentId: string) => void;
  onDeleteFee?: (paymentId: string) => void;
  onViewSlip?: (record: TeamPaymentRecord) => void;
}

// ─── Snapshot stat ────────────────────────────────────────────────────────────

const SnapshotStat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
}> = ({ label, value, sub }) => (
  <div className="flex-1 min-w-0 text-center px-1.5 py-2 sm:px-2 sm:py-2.5">
    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-brand-text-secondary mb-1">
      {label}
    </p>
    <div className="text-sm sm:text-xl font-black text-brand-text-primary leading-none">{value}</div>
    {sub && <p className="text-[8px] sm:text-[9px] text-brand-text-secondary mt-1">{sub}</p>}
  </div>
);

// ─── Tab button ───────────────────────────────────────────────────────────────

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  badge?: number;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center gap-1.5 min-w-0 px-2 py-2 rounded-lg text-[10px] sm:text-xs font-semibold
      whitespace-nowrap transition-all duration-200
      ${active
        ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/25'
        : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-bg'
      }
    `}
  >
    {icon && <span className="hidden shrink-0 sm:inline-flex">{icon}</span>}
    <span className="truncate">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span
        className={`text-[9px] font-black px-1.25 py-0.5 rounded-full leading-none ${
          active ? 'bg-white/25 text-white' : 'bg-red-500/15 text-red-400 border border-red-500/25'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);

// ─── Salary tab content ───────────────────────────────────────────────────────

const thBase = 'px-2.5 py-2 text-left text-[9px] font-black uppercase tracking-widest text-brand-text-secondary sm:px-3 sm:text-[10px]';
const tdBase = 'px-2.5 py-2.5 align-middle text-brand-text-primary sm:px-3';

const SalaryTabContent: React.FC<{
  member: TeamMember;
  projects: Project[];
  teamProjectPayments: TeamProjectPayment[];
  memberPaymentRecords: TeamPaymentRecord[];
  selectedMemberUnpaidProjects: TeamProjectPayment[];
  onEditFee?: (paymentId: string) => void;
  onDeleteFee?: (paymentId: string) => void;
  onViewSlip?: (record: TeamPaymentRecord) => void;
  onPayProject: (projectPaymentId: string) => void;
}> = ({ member, projects, teamProjectPayments, memberPaymentRecords, selectedMemberUnpaidProjects, onEditFee, onDeleteFee, onViewSlip, onPayProject }) => {
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const rows = useMemo(() => {
    const currentPayments = dedupeCurrentTeamPayments(teamProjectPayments);
    return projects
      .filter((project) => project.team?.some((m) => m.memberId === member.id))
      .map((project) => {
        const assigned = project.team?.find((m) => m.memberId === member.id);
        const payment = currentPayments.find(
          (p) => p.projectId === project.id && p.teamMemberId === member.id,
        );
        const fee = assigned?.fee ?? payment?.fee ?? 0;
        const isPaid = payment?.status === 'Paid';
        const record = payment
          ? memberPaymentRecords.find((r) => r.projectPaymentIds.includes(payment.id))
          : undefined;
        return {
          projectId: project.id,
          paymentId: payment?.id,
          date: project.date,
          name: project.projectName,
          role: assigned?.role || payment?.role || '-',
          fee,
          paid: isPaid ? fee : 0,
          isPaid,
          paidDate: record?.date,
          record,
        };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [member.id, projects, teamProjectPayments, memberPaymentRecords]);

  const filteredRows = rows.filter(row => paymentFilter === 'all' || (paymentFilter === 'paid' ? row.isPaid : !row.isPaid));
  const unpaidCount = rows.filter(row => !row.isPaid).length;
  const paidCount = rows.filter(row => row.isPaid).length;

  const totals = rows.reduce(
    (acc, row) => ({ fee: acc.fee + row.fee, paid: acc.paid + row.paid }),
    { fee: 0, paid: 0 },
  );
  const remaining = totals.fee - totals.paid;

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-border px-3 py-6 text-center text-xs text-brand-text-secondary">
        Belum ada data Pembayaran untuk anggota ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-brand-border bg-brand-bg px-2 py-2.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Total Pembayaran</p>
          <p className="mt-1 text-sm font-black text-brand-text-primary sm:text-base">{formatCurrency(totals.fee)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Sudah Dibayar</p>
          <p className="mt-1 text-sm font-black text-emerald-700 sm:text-base">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Sisa</p>
          <p className="mt-1 text-sm font-black text-amber-700 sm:text-base">{formatCurrency(remaining)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          ['all', 'Semua', rows.length],
          ['unpaid', 'Belum Dibayar', unpaidCount],
          ['paid', 'Lunas', paidCount],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPaymentFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors sm:text-xs ${paymentFilter === key ? 'border-brand-accent bg-brand-accent text-white' : 'border-brand-border bg-brand-bg text-brand-text-secondary hover:border-brand-accent/40'}`}
          >
            {label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${paymentFilter === key ? 'bg-white/20 text-white' : 'bg-brand-surface text-brand-text-primary'}`}>{count}</span>
          </button>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-border px-3 py-6 text-center text-xs text-brand-text-secondary">
          {paymentFilter === 'paid' ? 'Belum ada pembayaran yang lunas.' : 'Semua pembayaran sudah lunas.'}
        </p>
      ) : <div className="overflow-hidden rounded-xl border border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-brand-bg">
              <tr className="border-b border-brand-border">
                <th className={`${thBase} whitespace-nowrap`}>Tanggal</th>
                <th className={thBase}>Acara</th>
                <th className={`${thBase} hidden sm:table-cell`}>Peran</th>
                <th className={`${thBase} text-right`}>Pembayaran</th>
                <th className={thBase}>Status</th>
                <th className={`${thBase} hidden whitespace-nowrap md:table-cell`}>Tgl Bayar</th>
                <th className={`${thBase} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {filteredRows.map((row) => (
                <tr key={row.projectId} className="hover:bg-brand-bg/40">
                  <td className={`${tdBase} whitespace-nowrap text-brand-text-secondary`}>
                    {row.date ? formatDate(row.date) : '-'}
                  </td>
                  <td className={`${tdBase} font-semibold`}>{row.name}</td>
                  <td className={`${tdBase} hidden text-brand-text-secondary sm:table-cell`}>{row.role}</td>
                  <td className={`${tdBase} whitespace-nowrap text-right font-bold`}>{formatCurrency(row.fee)}</td>
                  <td className={tdBase}>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold sm:text-[10px] ${
                        row.isPaid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {row.isPaid ? 'Lunas' : 'Belum Dibayar'}
                    </span>
                  </td>
                  <td className={`${tdBase} hidden whitespace-nowrap text-brand-text-secondary md:table-cell`}>
                    {row.paidDate ? formatDate(row.paidDate) : '-'}
                  </td>
                  <td className={`${tdBase} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      {!row.isPaid && (() => {
                        const unpaidPayment = selectedMemberUnpaidProjects.find(item => item.id === row.paymentId || item.projectId === row.projectId);
                        return unpaidPayment ? (
                          <button
                            type="button"
                            onClick={() => onPayProject(unpaidPayment.id)}
                            title={`Bayar ${row.name}`}
                            className="inline-flex items-center gap-1 rounded-md bg-brand-accent px-2 py-1.5 text-[9px] font-bold text-white transition-colors hover:bg-brand-accent-hover sm:text-[10px]"
                          >
                            <Wallet className="h-3 w-3" /> Bayar
                          </button>
                        ) : null;
                      })()}
                      {row.paymentId && onEditFee && (
                        <button
                          onClick={() => onEditFee(row.paymentId)}
                          title="Edit fee"
                          className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-bg border border-transparent hover:border-brand-border transition-all"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {row.paymentId && onDeleteFee && (
                        <button
                          onClick={() => onDeleteFee(row.paymentId)}
                          title="Hapus fee"
                          className="p-1.5 rounded-lg text-brand-text-secondary hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {row.isPaid && row.record && onViewSlip && (
                        <button
                          onClick={() => onViewSlip(row.record)}
                          title="Lihat slip pembayaran"
                          className="p-1.5 rounded-lg text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/20 transition-all"
                        >
                          <FileTextIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-border bg-brand-bg font-black text-brand-text-primary">
                <td className={`${tdBase} whitespace-nowrap`}>Total</td>
                <td className={tdBase} colSpan={2} />
                <td className={`${tdBase} whitespace-nowrap text-right`}>{formatCurrency(totals.fee)}</td>
                <td className={tdBase} colSpan={2}>
                  <span className="text-emerald-700">Dibayar {formatCurrency(totals.paid)}</span>
                  <span className="mx-1.5 text-brand-text-secondary">·</span>
                  <span className="text-amber-700">Sisa {formatCurrency(remaining)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      }
    </div>
  );
};

const EmployeeSalaryContent: React.FC<{
  member: TeamMember;
  records: TeamPaymentRecord[];
  cards: Card[];
  monthlyBudgetPocket?: FinancialPocket;
  paymentSourceId: string;
  setPaymentSourceId: (id: string) => void;
  onPayMonthlySalary: (month: string) => void;
}> = ({ member, records, cards, monthlyBudgetPocket, paymentSourceId, setPaymentSourceId, onPayMonthlySalary }) => {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const salaryRecordPrefix = `PAY-SAL-${member.id.slice(-6).toUpperCase()}-`;
  const salaryRecords = records
    .filter(record => record.recordNumber.startsWith(salaryRecordPrefix))
    .sort((left, right) => right.date.localeCompare(left.date));
  const alreadyPaid = salaryRecords.some(record => record.recordNumber === getEmployeeSalaryRecordNumber(member.id, month));
  const monthlySalary = Number(member.standardFee) || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 px-3 py-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Gaji Bulanan</p>
          <p className="mt-1 text-base font-black text-brand-accent">{formatCurrency(monthlySalary)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Total Gaji Dibayar</p>
          <p className="mt-1 text-base font-black text-emerald-700">{formatCurrency(salaryRecords.reduce((sum, record) => sum + record.totalAmount, 0))}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-brand-border bg-brand-bg/50 p-3 sm:p-4">
        <div>
          <h4 className="text-xs font-bold text-brand-text-primary sm:text-sm">Bayar Gaji Bulanan</h4>
          <p className="mt-0.5 text-[10px] text-brand-text-secondary sm:text-xs">Pembayaran dicatat sebagai pengeluaran dan masuk ke riwayat gaji karyawan.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-[10px] font-semibold text-brand-text-secondary sm:text-xs">
            Periode gaji
            <input type="month" value={month} onChange={event => setMonth(event.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-2 text-xs text-brand-text-primary" />
          </label>
          <label className="space-y-1 text-[10px] font-semibold text-brand-text-secondary sm:text-xs">
            Sumber dana
            <select value={paymentSourceId} onChange={event => setPaymentSourceId(event.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-2 text-xs text-brand-text-primary">
              <option value="">Pilih sumber dana...</option>
              {monthlyBudgetPocket && <option value={`pocket-${monthlyBudgetPocket.id}`}>{monthlyBudgetPocket.name} · {formatCurrency(monthlyBudgetPocket.amount)}</option>}
              {cards.map(card => <option key={card.id} value={`card-${card.id}`}>{card.bankName}{card.lastFourDigits !== 'CASH' ? ` · **** ${card.lastFourDigits}` : ''} · {formatCurrency(card.balance)}</option>)}
            </select>
          </label>
        </div>
        {alreadyPaid ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">Gaji periode ini sudah dibayarkan.</p>
        ) : (
          <button type="button" onClick={() => onPayMonthlySalary(month)} disabled={monthlySalary <= 0 || !paymentSourceId} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
            Bayar {formatCurrency(monthlySalary)} untuk {new Date(`${month}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold text-brand-text-primary sm:text-sm">Riwayat Gaji</h4>
        {salaryRecords.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-border px-3 py-5 text-center text-xs text-brand-text-secondary">Belum ada riwayat pembayaran gaji.</p>
        ) : salaryRecords.map(record => {
          const period = record.recordNumber.split('-').at(-1) || '';
          const periodLabel = /^\d{6}$/.test(period)
            ? new Date(Number(period.slice(0, 4)), Number(period.slice(4, 6)) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
            : formatDate(record.date);
          return (
            <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5">
              <div><p className="text-xs font-semibold text-brand-text-primary">{periodLabel}</p><p className="text-[10px] text-brand-text-secondary">Dibayar {formatDate(record.date)}</p></div>
              <strong className="shrink-0 text-xs text-emerald-700">{formatCurrency(record.totalAmount)}</strong>
            </div>
          );
        })}
      </section>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const TeamMemberDetailModal: React.FC<TeamMemberDetailModalProps> = ({
  isOpen,
  onClose,
  selectedMember,
  detailTab,
  setDetailTab,
  selectedMemberUnpaidProjects,
  projectsToPay,
  onToggleProject,
  onProceedToPayment,
  onPayProject,
  onPayMonthlySalary,
  teamProjectPayments,
  teamPaymentRecords,
  projects,
  newNote,
  setNewNote,
  newNoteType,
  setNewNoteType,
  onSetRating,
  onAddNote,
  onDeleteNote,
  paymentAmount,
  setPaymentAmount,
  isInstallment,
  setIsInstallment,
  onPay,
  renderPaymentSlipBody,
  cards,
  monthlyBudgetPocket,
  paymentSourceId,
  setPaymentSourceId,
  onSign,
  onOpenQrModal,
  onEditFee,
  onDeleteFee,
  onViewSlip,
}) => {
  const uiTextOverrides = useUiTextOverrides();
  const memberPaymentRecords = useMemo(
    () => teamPaymentRecords.filter((r) => r.teamMemberId === selectedMember.id),
    [teamPaymentRecords, selectedMember.id],
  );

  const currentTeamPayments = useMemo(
    () => dedupeCurrentTeamPayments(teamProjectPayments),
    [teamProjectPayments],
  );

  const memberProjects = useMemo(
    () => projects.filter((project) => project.team?.some((member) => member.memberId === selectedMember.id)),
    [projects, selectedMember.id],
  );

  const totalCompletedEvents = useMemo(
    () => memberProjects.filter((project) => project.status === 'Selesai').length,
    [memberProjects],
  );

  const totalEarnings = useMemo(
    () =>
      currentTeamPayments
        .filter((p) => p.teamMemberId === selectedMember.id && p.status === 'Paid')
        .reduce((sum, p) => sum + p.fee, 0),
    [currentTeamPayments, selectedMember.id],
  );

  const isEmployee = selectedMember.category === 'Karyawan';
  const salaryRecordPrefix = `PAY-SAL-${selectedMember.id.slice(-6).toUpperCase()}-`;
  const salaryRecords = memberPaymentRecords.filter(record => record.recordNumber.startsWith(salaryRecordPrefix));
  const totalSalaryPaid = salaryRecords.reduce((sum, record) => sum + record.totalAmount, 0);
  const isProjectsActive = detailTab === 'projects' || detailTab === 'create-payment';
  const avatarLetter = selectedMember.name?.charAt(0).toUpperCase() ?? '?';
  const isVendor = selectedMember.category === 'Vendor';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="4xl"
    >
      <div className="flex flex-col gap-2.5 -mt-1">

        {/* ── Profile header ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-accent overflow-hidden flex items-center justify-center shrink-0 text-white text-2xl sm:text-3xl font-black shadow-lg shadow-brand-accent/25">
            {selectedMember.avatarUrl ? (
              <img src={selectedMember.avatarUrl} alt={`${selectedMember.name} avatar`} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
            ) : avatarLetter}
          </div>

          {/* Info */}
          <div className="w-full flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-brand-text-primary leading-tight truncate">
                  {selectedMember.name}
                </h3>
                <p className="text-[11px] sm:text-sm text-brand-text-secondary mt-0.5">{selectedMember.role}</p>
              </div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] sm:text-[11px] font-bold border shrink-0 ${
                  isVendor
                    ? 'solid-purple text-white border-purple-600'
                    : 'solid-blue text-white border-blue-600'
                }`}
              >
                {selectedMember.category || (isVendor ? 'Vendor' : 'Tim')}
              </span>
            </div>

            {/* Contact chips */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 sm:justify-start">
              {selectedMember.phone && (
                <a
                  href={`tel:${selectedMember.phone}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] text-brand-text-secondary bg-brand-bg border border-brand-border hover:text-brand-text-primary transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {selectedMember.phone}
                </a>
              )}
              {selectedMember.email && (
                <a
                  href={`mailto:${selectedMember.email}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] text-brand-text-secondary bg-brand-bg border border-brand-border hover:text-brand-text-primary transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  {selectedMember.email}
                </a>
              )}
              {selectedMember.noRek && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] text-brand-text-secondary bg-brand-bg border border-brand-border">
                  <CreditCard className="w-3 h-3" />
                  {selectedMember.bankName ? `${selectedMember.bankName} · ` : ''}{selectedMember.noRek}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Snapshot stats row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 divide-x divide-brand-border bg-brand-bg border border-brand-border rounded-lg sm:rounded-2xl overflow-hidden">
          <SnapshotStat
            label={isEmployee ? 'Gaji Bulanan' : customizeUiText('team.detail.stat.completed', 'Acara Selesai', uiTextOverrides)}
            value={isEmployee ? <span className="text-sm font-black">{formatCurrency(Number(selectedMember.standardFee) || 0)}</span> : totalCompletedEvents}
          />
          <SnapshotStat
            label={isEmployee ? 'Total Gaji Dibayar' : customizeUiText('team.detail.stat.income', 'Total Pendapatan', uiTextOverrides)}
            value={
              <span className="text-base font-black">{formatCurrency(isEmployee ? totalSalaryPaid : totalEarnings)}</span>
            }
            sub={isEmployee ? 'Riwayat pembayaran' : customizeUiText('team.detail.stat.lifetime', 'Lifetime', uiTextOverrides)}
          />
          <SnapshotStat
            label={customizeUiText('team.detail.stat.rating', 'Rating', uiTextOverrides)}
            value={
              <span className="inline-flex items-center gap-1 justify-center">
                {selectedMember.rating.toFixed(1)}
                <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
              </span>
            }
            sub={customizeUiText('team.detail.stat.ratingScale', 'dari 5', uiTextOverrides)}
          />
        </div>

        {/* ── Tab navigation ──────────────────────────────────────────────── */}
        <div className={`grid ${isEmployee ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'} gap-1 p-0.5 bg-brand-bg border border-brand-border rounded-lg sm:rounded-2xl`}>
          {!isEmployee && <TabBtn
            active={isProjectsActive}
            onClick={() => setDetailTab('projects')}
            icon={<FileTextIcon className="w-3.5 h-3.5 shrink-0" />}
            label={customizeUiText('team.detail.tab.projects', 'Acara', uiTextOverrides)}
            badge={memberProjects.length}
          />}
          <TabBtn
            active={detailTab === 'salary' || detailTab === 'payments'}
            onClick={() => setDetailTab('salary')}
            icon={<Wallet className="w-3.5 h-3.5 shrink-0" />}
            label={isEmployee ? 'Gaji Bulanan' : customizeUiText('team.detail.tab.salary', 'Pembayaran', uiTextOverrides)}
            badge={isEmployee ? salaryRecords.length : selectedMemberUnpaidProjects.length}
          />
          <TabBtn
            active={detailTab === 'performance'}
            onClick={() => setDetailTab('performance')}
            icon={<StarIcon className="w-3.5 h-3.5 shrink-0" />}
            label={customizeUiText('team.detail.tab.performance', 'Kinerja', uiTextOverrides)}
          />
          <TabBtn
            active={false}
            onClick={() => onOpenQrModal(selectedMember)}
            icon={<Share2Icon className="w-3.5 h-3.5 shrink-0" />}
            label={customizeUiText('team.detail.tab.portal', 'Portal', uiTextOverrides)}
          />
        </div>

        {/* ── Tab content (scrollable) ────────────────────────────────────── */}
        <div className="max-h-[50vh] overflow-y-auto pr-1 pb-1">

          {/* Tab: Acara Pernikahan */}
          {!isEmployee && detailTab === 'projects' && (
            <FreelancerProjects
              projects={memberProjects}
              memberId={selectedMember.id}
            />
          )}

          {/* Tab: Pembayaran */}
          {(detailTab === 'salary' || detailTab === 'payments') && (
            isEmployee ? <EmployeeSalaryContent
              member={selectedMember}
              records={memberPaymentRecords}
              cards={cards}
              monthlyBudgetPocket={monthlyBudgetPocket}
              paymentSourceId={paymentSourceId}
              setPaymentSourceId={setPaymentSourceId}
              onPayMonthlySalary={onPayMonthlySalary}
            /> : <SalaryTabContent
              member={selectedMember}
              projects={projects}
              teamProjectPayments={teamProjectPayments}
              memberPaymentRecords={memberPaymentRecords}
              selectedMemberUnpaidProjects={selectedMemberUnpaidProjects}
              onEditFee={onEditFee}
              onDeleteFee={onDeleteFee}
              onViewSlip={onViewSlip}
              onPayProject={onPayProject}
            />
          )}

          {/* Tab: Kinerja */}
          {detailTab === 'performance' && (
            <PerformanceTab
              member={selectedMember}
              onSetRating={onSetRating}
              newNote={newNote}
              setNewNote={setNewNote}
              newNoteType={newNoteType}
              setNewNoteType={setNewNoteType}
              onAddNote={onAddNote}
              onDeleteNote={onDeleteNote}
            />
          )}

          {/* Tab: Buat Pembayaran */}
          {detailTab === 'create-payment' && (
            <CreatePaymentTab
              member={selectedMember}
              paymentDetails={{
                projects: selectedMemberUnpaidProjects.filter((p) =>
                  projectsToPay.includes(p.id),
                ),
                total: typeof paymentAmount === 'number' ? paymentAmount : 0,
              }}
              paymentAmount={paymentAmount}
              setPaymentAmount={setPaymentAmount}
              isInstallment={isInstallment}
              setIsInstallment={setIsInstallment}
              onPay={onPay}
              onSetTab={() => setDetailTab('projects')}
              renderPaymentDetailsContent={() =>
                renderPaymentSlipBody({
                  id: `TEMP-${Date.now()}`,
                  recordNumber: `PAY-FR-${selectedMember.id.slice(-4)}-${Date.now()}`,
                  teamMemberId: selectedMember.id,
                  date: new Date().toISOString(),
                  projectPaymentIds: projectsToPay,
                  totalAmount: typeof paymentAmount === 'number' ? paymentAmount : 0,
                })
              }
              cards={cards}
              monthlyBudgetPocket={monthlyBudgetPocket}
              paymentSourceId={paymentSourceId}
              setPaymentSourceId={setPaymentSourceId}
              onSign={onSign}
            />
          )}

        </div>
      </div>
    </Modal>
  );
};

export default TeamMemberDetailModal;
