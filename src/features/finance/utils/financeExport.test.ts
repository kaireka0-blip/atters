import { describe, expect, it } from 'vitest';
import type { Worksheet } from 'exceljs';
import { CardType, PaymentStatus, PocketType, TransactionType } from '../../../types';
import type { Card, FinancialPocket, Project, Transaction } from '../../../types';
import {
    buildCardsWorkbook,
    buildProfitReportWorkbook,
    buildReportWorkbook,
    buildTransactionsWorkbook,
} from './financeExport';

const headerIndex = (sheet: Worksheet, header: string) => {
    const headers = sheet.getRow(1).values as (string | undefined)[];
    return headers.indexOf(header);
};

const cellValue = (sheet: Worksheet, rowNumber: number, header: string) => {
    const index = headerIndex(sheet, header);
    if (index < 0) throw new Error(`Header "${header}" tidak ditemukan di sheet ${sheet.name}`);
    return sheet.getRow(rowNumber).getCell(index).value;
};

const summaryValue = (sheet: Worksheet, item: string) => {
    for (let row = 5; row <= sheet.rowCount; row += 1) {
        if (sheet.getRow(row).getCell(2).value === item) {
            return sheet.getRow(row).getCell(3).value;
        }
    }
    return undefined;
};

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 'trx-1',
    date: '2026-10-05',
    description: 'Pembayaran DP',
    amount: 5000000,
    type: TransactionType.INCOME,
    category: 'DP',
    method: 'Transfer Bank',
    ...overrides,
});

const buildCard = (overrides: Partial<Card> = {}): Card => ({
    id: 'card-1',
    cardHolderName: 'Vena WO',
    bankName: 'BCA',
    cardType: CardType.DEBIT,
    lastFourDigits: '1234',
    expiryDate: '09/28',
    balance: 7500000,
    colorGradient: 'from-blue-500 to-sky-400',
    ...overrides,
});

const buildProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    projectName: 'Pernikahan Andi & Sinta',
    clientName: 'Andi',
    clientId: 'client-1',
    projectType: 'Pernikahan',
    packageName: 'Paket Gold',
    packageId: 'package-1',
    addOns: [],
    date: '2026-10-20',
    location: 'Bandung',
    progress: 50,
    status: 'Berjalan',
    totalCost: 20000000,
    amountPaid: 5000000,
    paymentStatus: PaymentStatus.DP_TERBAYAR,
    team: [],
    ...overrides,
});

describe('financeExport — workbook Transaksi', () => {
    const filtered = [
        buildTransaction({ id: 'trx-1', date: '2026-10-05', amount: 5000000, type: TransactionType.INCOME, category: 'DP', cardId: 'card-1', projectId: 'project-1' }),
        buildTransaction({ id: 'trx-2', date: '2026-10-08', amount: 1500000, type: TransactionType.EXPENSE, description: 'Sewa alat', category: 'Sewa Alat', method: 'Tunai' }),
    ];
    const all = [...filtered, buildTransaction({ id: 'trx-3', date: '2026-09-30', amount: 2500000, type: TransactionType.INCOME, category: 'Pelunasan' })];

    it('memuat sheet Ringkasan + Transaksi dengan header lengkap', () => {
        const workbook = buildTransactionsWorkbook(filtered, all, { income: 5000000, expense: 1500000, net: 3500000 }, {
            companyName: 'Attera Visual',
            cards: [buildCard()],
            projects: [buildProject()],
        });

        expect(workbook.worksheets.map(ws => ws.name)).toEqual(['Ringkasan', 'Transaksi']);

        const sheet = workbook.getWorksheet('Transaksi')!;
        const headers = (sheet.getRow(1).values as (string | undefined)[]).slice(1);
        expect(headers).toEqual([
            'No', 'Tanggal', 'ID Transaksi', 'Keterangan', 'Kategori', 'Jenis Transaksi',
            'Nominal', 'Metode Pembayaran', 'Kartu / Rekening', 'Proyek / Klien', 'Catatan / Bukti',
        ]);
        expect(sheet.rowCount).toBe(filtered.length + 1);
    });

    it('menyimpan nominal sebagai angka, tanggal sebagai Date, dan format kolom sesuai', () => {
        const workbook = buildTransactionsWorkbook(filtered, all, { income: 5000000, expense: 1500000, net: 3500000 }, {
            cards: [buildCard()],
            projects: [buildProject()],
        });
        const sheet = workbook.getWorksheet('Transaksi')!;

        expect(cellValue(sheet, 2, 'Tanggal')).toBeInstanceOf(Date);
        expect(typeof cellValue(sheet, 2, 'Nominal')).toBe('number');
        expect(cellValue(sheet, 2, 'Nominal')).toBe(5000000);
        expect(cellValue(sheet, 2, 'No')).toBe(1);
        expect(cellValue(sheet, 3, 'No')).toBe(2);
        expect(cellValue(sheet, 2, 'Jenis Transaksi')).toBe('Pemasukan');
        expect(cellValue(sheet, 3, 'Jenis Transaksi')).toBe('Pengeluaran');

        const amountColumn = sheet.getColumn(headerIndex(sheet, 'Nominal'));
        expect(String(amountColumn.numFmt)).toContain('Rp');
        const dateColumn = sheet.getColumn(headerIndex(sheet, 'Tanggal'));
        expect(String(dateColumn.numFmt)).toBe('dd/mm/yyyy');
    });

    it('menerapkan freeze header dan auto filter', () => {
        const workbook = buildTransactionsWorkbook(filtered, all, { income: 5000000, expense: 1500000, net: 3500000 });
        const sheet = workbook.getWorksheet('Transaksi')!;
        expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
        expect(sheet.autoFilter).toMatchObject({ from: { row: 1, column: 1 }, to: { row: 1, column: 11 } });
    });

    it('mengisi kolom Kartu/Rekening dan Proyek/Klien dari relasi', () => {
        const workbook = buildTransactionsWorkbook(filtered, all, { income: 5000000, expense: 1500000, net: 3500000 }, {
            cards: [buildCard()],
            projects: [buildProject()],
        });
        const sheet = workbook.getWorksheet('Transaksi')!;
        expect(cellValue(sheet, 2, 'Kartu / Rekening')).toBe('BCA ••••1234');
        expect(cellValue(sheet, 2, 'Proyek / Klien')).toBe('Pernikahan Andi & Sinta — Andi');
        expect(cellValue(sheet, 3, 'Kartu / Rekening')).toBe('');
    });

    it('konsisten dengan angka halaman Keuangan (semua data & filter aktif)', () => {
        const workbook = buildTransactionsWorkbook(filtered, all, { income: 5000000, expense: 1500000, net: 3500000 });
        const summary = workbook.getWorksheet('Ringkasan')!;

        // Ringkasan filter aktif
        expect(summaryValue(summary, 'Total pemasukan (filter aktif)')).toBe(5000000);
        expect(summaryValue(summary, 'Total pengeluaran (filter aktif)')).toBe(1500000);
        expect(summaryValue(summary, 'Saldo bersih (filter aktif)')).toBe(3500000);

        // Ringkasan semua data = penjumlahan transaksi tanpa filter status (aturan halaman Keuangan)
        const expectedIncome = all.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const expectedExpense = all.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        expect(summaryValue(summary, 'Total pemasukan (semua data)')).toBe(expectedIncome);
        expect(summaryValue(summary, 'Total pengeluaran (semua data)')).toBe(expectedExpense);
        expect(summaryValue(summary, 'Saldo bersih (semua data)')).toBe(expectedIncome - expectedExpense);
        expect(summaryValue(summary, 'Jumlah transaksi diexport')).toBe(filtered.length);
    });
});

describe('financeExport — workbook Laporan', () => {
    it('tidak menggandakan transaksi akibat relasi proyek (satu transaksi = satu baris)', () => {
        const transactions = [
            buildTransaction({ id: 'trx-1', amount: 4000000, type: TransactionType.INCOME, projectId: 'project-1' }),
            buildTransaction({ id: 'trx-2', amount: 1000000, type: TransactionType.EXPENSE, projectId: 'project-1' }),
        ];
        const workbook = buildReportWorkbook(
            transactions,
            { client: 'client-1', dateFrom: '', dateTo: '' },
            [{ id: 'client-1', name: 'Andi' }],
            { projects: [buildProject(), buildProject({ id: 'project-2', projectName: 'Acara Kedua' })] },
        );
        const summary = workbook.getWorksheet('Ringkasan')!;
        const sheet = workbook.getWorksheet('Transaksi')!;

        expect(sheet.rowCount).toBe(transactions.length + 1);
        expect(summaryValue(summary, 'Total pemasukan')).toBe(4000000);
        expect(summaryValue(summary, 'Total pengeluaran')).toBe(1000000);
        expect(summaryValue(summary, 'Saldo bersih')).toBe(3000000);
        expect(summaryValue(summary, 'Jumlah transaksi')).toBe(2);
    });
});

describe('financeExport — workbook Laba per Acara', () => {
    const profitData = [
        { clientId: 'client-1', clientName: 'Andi', totalIncome: 12000000, totalCost: 7000000, profit: 5000000, totalPackageRevenue: 10000000, totalCustomCosts: 1000000, totalTransportCosts: 1000000, projects: [{ id: 'p1' }] },
        { clientId: 'client-2', clientName: 'Budi', totalIncome: 3000000, totalCost: 5000000, profit: -2000000, totalPackageRevenue: 3000000, totalCustomCosts: 0, totalTransportCosts: 0, projects: [{ id: 'p2' }] },
    ];

    it('menyusun kolom laba, status, dan ringkasan periode', () => {
        const workbook = buildProfitReportWorkbook(profitData, { year: 2026, month: 9 }, { companyName: 'Attera Visual' });
        expect(workbook.worksheets.map(ws => ws.name)).toEqual(['Ringkasan', 'Laba per Acara Pernikahan']);

        const sheet = workbook.getWorksheet('Laba per Acara Pernikahan')!;
        expect(cellValue(sheet, 2, 'Nama Pengantin')).toBe('Andi');
        expect(cellValue(sheet, 2, 'Laba Bersih')).toBe(5000000);
        expect(cellValue(sheet, 2, 'Status')).toBe('Profit');
        expect(cellValue(sheet, 3, 'Status')).toBe('Rugi');

        const summary = workbook.getWorksheet('Ringkasan')!;
        expect(summaryValue(summary, 'Total laba bersih')).toBe(3000000);
        expect(summaryValue(summary, 'Jumlah pengantin')).toBe(2);
    });
});

describe('financeExport — workbook Kartu & Akun', () => {
    it('memuat sheet Kartu & Akun dan Kantong dengan saldo numerik', () => {
        const cards = [buildCard()];
        const pockets: FinancialPocket[] = [{
            id: 'pocket-1',
            name: 'Anggaran Bulanan',
            description: 'Budget operasional',
            icon: 'piggy-bank',
            type: PocketType.EXPENSE,
            amount: 2000000,
            goalAmount: 5000000,
            sourceCardId: 'card-1',
        }];
        const transactions = [
            buildTransaction({ id: 'trx-1', cardId: 'card-1' }),
            buildTransaction({ id: 'trx-2', cardId: 'card-1' }),
        ];

        const workbook = buildCardsWorkbook(cards, pockets, {
            creditDebt: 0,
            debitAndCashAssets: 7500000,
            mostUsedCardName: 'BCA (••••1234)',
            mostUsedCardTxCount: 2,
            cashBalance: 0,
        }, { cards, transactions, companyName: 'Attera Visual' });

        expect(workbook.worksheets.map(ws => ws.name)).toEqual(['Ringkasan', 'Kartu & Akun', 'Kantong']);

        const cardSheet = workbook.getWorksheet('Kartu & Akun')!;
        expect(cellValue(cardSheet, 2, 'Bank / Penerbit')).toBe('BCA');
        expect(cellValue(cardSheet, 2, 'Saldo')).toBe(7500000);
        expect(cellValue(cardSheet, 2, 'Jumlah Transaksi Terkait')).toBe(2);

        const pocketSheet = workbook.getWorksheet('Kantong')!;
        expect(cellValue(pocketSheet, 2, 'Nama Kantong')).toBe('Anggaran Bulanan');
        expect(cellValue(pocketSheet, 2, 'Saldo Saat Ini')).toBe(2000000);
        expect(cellValue(pocketSheet, 2, 'Ditautkan ke Kartu')).toBe('BCA ••••1234');

        const summary = workbook.getWorksheet('Ringkasan')!;
        expect(summaryValue(summary, 'Total aset debit & tunai')).toBe(7500000);
        expect(summaryValue(summary, 'Jumlah kantong')).toBe(1);
    });
});
