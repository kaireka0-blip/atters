import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { loadUiTextOverrides, saveRemoteUiTextOverrides } from '../services/uiTextOverrides';

export interface UiTextOption {
    key: string;
    label: string;
    defaultText: string;
    group: string;
}

export type UiTextOverrides = Record<string, string>;

export const UI_TEXT_OPTIONS: UiTextOption[] = [
    { key: 'nav.dashboard', label: 'Dashboard', defaultText: 'Dashboard', group: 'Menu' },
    { key: 'nav.calendar', label: 'Kalender', defaultText: 'Kalender', group: 'Menu' },
    { key: 'nav.leads', label: 'Calon Pengantin', defaultText: 'Calon Pengantin', group: 'Menu' },
    { key: 'nav.booking', label: 'Booking', defaultText: 'Booking', group: 'Menu' },
    { key: 'nav.clients', label: 'Data Pengantin', defaultText: 'Data Pengantin', group: 'Menu' },
    { key: 'nav.reports', label: 'Testimoni', defaultText: 'Testimoni', group: 'Menu' },
    { key: 'nav.team', label: 'Tim & Vendor', defaultText: 'Tim & Vendor', group: 'Menu' },
    { key: 'nav.finance', label: 'Keuangan', defaultText: 'Keuangan', group: 'Menu' },
    { key: 'nav.cashflow', label: 'Arus Kas', defaultText: 'Arus Kas', group: 'Menu' },
    { key: 'nav.invoices', label: 'Pembayaran & Invoice', defaultText: 'Pembayaran & Invoice', group: 'Menu' },
    { key: 'nav.products', label: 'Produk & Katalog', defaultText: 'Produk & Katalog', group: 'Menu' },
    { key: 'nav.packages', label: 'Paket & Layanan', defaultText: 'Paket & Layanan', group: 'Menu' },
    { key: 'nav.promos', label: 'Promo & Katalog', defaultText: 'Promo & Katalog', group: 'Menu' },
    { key: 'nav.gallery', label: 'Pricelist Publik', defaultText: 'Pricelist Publik', group: 'Menu' },
    { key: 'nav.vendorProfile', label: 'Profil Vendor', defaultText: 'Profil Vendor', group: 'Menu' },
    { key: 'nav.publicLinks', label: 'Link Publik', defaultText: 'Link Publik', group: 'Menu' },
    { key: 'nav.settings', label: 'Pengaturan', defaultText: 'Pengaturan', group: 'Menu' },
    { key: 'nav.section.home', label: 'Grup Beranda', defaultText: 'Beranda', group: 'Menu' },
    { key: 'nav.section.business', label: 'Grup Bisnis & Operasional', defaultText: 'Bisnis & Operasional', group: 'Menu' },
    { key: 'nav.section.finance', label: 'Grup Keuangan', defaultText: 'Keuangan', group: 'Menu' },
    { key: 'nav.section.products', label: 'Grup Produk & Katalog', defaultText: 'Produk & Katalog', group: 'Menu' },
    { key: 'nav.section.management', label: 'Grup Manajemen (mobile)', defaultText: 'Manajemen', group: 'Menu' },
    { key: 'nav.section.mobileProducts', label: 'Grup Produk & Layanan (mobile)', defaultText: 'Produk & Layanan', group: 'Menu' },
    { key: 'links.admin.title', label: 'Judul halaman Link Publik', defaultText: 'Kelola Link Publik', group: 'Link Publik' },
    { key: 'links.admin.subtitle', label: 'Deskripsi halaman Link Publik', defaultText: 'Atur profil, WhatsApp, foto, dan semua tautan yang dibagikan.', group: 'Link Publik' },
    { key: 'links.admin.share.title', label: 'Judul bagian tautan berbagi', defaultText: 'Link yang bisa dibagikan', group: 'Link Publik' },
    { key: 'links.admin.share.description', label: 'Deskripsi bagian tautan berbagi', defaultText: 'Buka halaman publik atau salin alamatnya.', group: 'Link Publik' },
    { key: 'links.admin.profile.title', label: 'Judul bagian profil link', defaultText: 'Profil dan tampilan', group: 'Link Publik' },
    { key: 'links.admin.links.title', label: 'Judul daftar tautan langsung', defaultText: 'Tautan langsung', group: 'Link Publik' },
    { key: 'links.admin.links.add', label: 'Tombol tambah tautan', defaultText: 'Tambah tautan', group: 'Link Publik' },
    { key: 'links.admin.status.title', label: 'Judul status halaman link', defaultText: 'Status halaman', group: 'Link Publik' },
    { key: 'links.admin.save', label: 'Tombol simpan link publik', defaultText: 'Simpan perubahan', group: 'Link Publik' },
    { key: 'links.admin.copy', label: 'Tombol salin URL publik', defaultText: 'Salin link', group: 'Link Publik' },
    { key: 'links.admin.preview', label: 'Tombol lihat halaman publik', defaultText: 'Lihat halaman', group: 'Link Publik' },
    { key: 'links.public.loading', label: 'Pesan memuat halaman link', defaultText: 'Memuat halaman...', group: 'Link Publik' },
    { key: 'links.public.notFound', label: 'Pesan link tidak ditemukan', defaultText: 'Link tidak ditemukan', group: 'Link Publik' },
    { key: 'public.inquiry.title', label: 'Judul form inquiry', defaultText: 'INQUIRY', group: 'Form Publik' },
    { key: 'public.inquiry.name', label: 'Label nama inquiry', defaultText: 'Nama', group: 'Form Publik' },
    { key: 'public.inquiry.whatsapp', label: 'Label WhatsApp inquiry', defaultText: 'WhatsApp', group: 'Form Publik' },
    { key: 'public.inquiry.category', label: 'Label kategori acara inquiry', defaultText: 'Kategori Acara', group: 'Form Publik' },
    { key: 'public.inquiry.source', label: 'Label sumber inquiry', defaultText: 'Dari mana kamu mengetahui kami', group: 'Form Publik' },
    { key: 'public.inquiry.location', label: 'Label lokasi acara inquiry', defaultText: 'Lokasi Acara', group: 'Form Publik' },
    { key: 'public.inquiry.date', label: 'Label tanggal acara inquiry', defaultText: 'Tanggal Acara', group: 'Form Publik' },
    { key: 'public.inquiry.notes', label: 'Label catatan inquiry', defaultText: 'Catatan', group: 'Form Publik' },
    { key: 'public.inquiry.submit', label: 'Tombol kirim inquiry', defaultText: 'Kirim Pesan', group: 'Form Publik' },
    { key: 'public.inquiry.whatsappLink', label: 'Tombol chat WhatsApp inquiry', defaultText: 'Atau chat via WhatsApp', group: 'Form Publik' },
    { key: 'public.booking.section', label: 'Judul informasi pengantin dan acara', defaultText: 'Informasi Pengantin & Acara Pernikahan', group: 'Form Booking Publik' },
    { key: 'public.booking.name', label: 'Label nama pengantin booking', defaultText: 'Nama Pengantin', group: 'Form Booking Publik' },
    { key: 'public.booking.phone', label: 'Label WhatsApp booking', defaultText: 'Nomor Telepon (WhatsApp)', group: 'Form Booking Publik' },
    { key: 'public.booking.eventType', label: 'Label jenis acara booking', defaultText: 'Jenis Acara Pernikahan', group: 'Form Booking Publik' },
    { key: 'public.booking.date', label: 'Label tanggal acara booking', defaultText: 'Tanggal Acara Pernikahan (Opsional)', group: 'Form Booking Publik' },
    { key: 'public.booking.location', label: 'Label lokasi booking', defaultText: 'Lokasi (Kota)', group: 'Form Booking Publik' },
    { key: 'public.booking.submit', label: 'Tombol kirim formulir booking', defaultText: 'Kirim Formulir Pemesanan', group: 'Form Booking Publik' },
    { key: 'portal.client.welcome', label: 'Pesan sambutan portal', defaultText: 'Selamat datang di portal pernikahan Anda', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.home', label: 'Tab beranda portal', defaultText: 'Beranda', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.events', label: 'Tab acara portal', defaultText: 'Acara Saya', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.meetings', label: 'Tab meeting portal', defaultText: 'Jadwal Meeting', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.files', label: 'Tab file portal', defaultText: 'Link File', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.invoice', label: 'Tab invoice portal', defaultText: 'Invoice', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.terms', label: 'Tab syarat portal', defaultText: 'Syarat & Ketentuan', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.workflow', label: 'Tab workflow portal', defaultText: 'Workflow', group: 'Portal Pengantin' },
    { key: 'portal.client.tab.feedback', label: 'Tab testimoni portal', defaultText: 'Testimoni', group: 'Portal Pengantin' },
    { key: 'portal.client.event.title', label: 'Judul detail acara portal', defaultText: 'Detail Acara', group: 'Portal Pengantin' },
    { key: 'portal.client.event.progress', label: 'Judul progres acara portal', defaultText: 'Progres Pengerjaan', group: 'Portal Pengantin' },
    { key: 'portal.client.event.journey', label: 'Judul perjalanan acara portal', defaultText: 'Perjalanan Acara', group: 'Portal Pengantin' },
    { key: 'public.gallery.bookingCta', label: 'Tombol booking di galeri', defaultText: 'Booking Sekarang', group: 'Galeri Publik' },
    { key: 'public.gallery.download', label: 'Tombol unduh pricelist galeri', defaultText: 'Download Pricelist PDF', group: 'Galeri Publik' },
    { key: 'public.feedback.title', label: 'Judul formulir testimoni', defaultText: 'Formulir Testimoni', group: 'Testimoni Publik' },
    { key: 'public.feedback.submit', label: 'Tombol kirim testimoni', defaultText: 'Kirim Testimoni', group: 'Testimoni Publik' },
    { key: 'public.suggestion.title', label: 'Judul formulir saran', defaultText: 'Formulir Saran & Masukan', group: 'Saran Publik' },
    { key: 'public.suggestion.submit', label: 'Tombol kirim saran', defaultText: 'Kirim Masukan', group: 'Saran Publik' },
    { key: 'public.invoice.title', label: 'Judul invoice publik', defaultText: 'Invoice Resmi', group: 'Invoice Publik' },
    { key: 'public.invoice.download', label: 'Tombol unduh invoice', defaultText: 'Unduh PDF', group: 'Invoice Publik' },
    { key: 'public.receipt.title', label: 'Judul tanda terima', defaultText: 'Tanda Terima', group: 'Tanda Terima Publik' },
    { key: 'public.receipt.download', label: 'Tombol unduh tanda terima', defaultText: 'Unduh PDF', group: 'Tanda Terima Publik' },
    { key: 'public.vendorProfile.title', label: 'Label halaman profil vendor', defaultText: 'Vendor Profile', group: 'Profil Vendor Publik' },
    { key: 'public.portfolio.contact', label: 'Judul bagian kontak portofolio', defaultText: 'Hubungi Kami', group: 'Portofolio Publik' },
    { key: 'public.portfolio.back', label: 'Tombol kembali portofolio', defaultText: 'Kembali ke Profil', group: 'Portofolio Publik' },
    { key: 'table.clients.number', label: 'Kolom nomor', defaultText: 'No', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.client', label: 'Kolom pengantin', defaultText: 'Pengantin', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.status', label: 'Kolom status', defaultText: 'Status', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.package', label: 'Kolom total paket', defaultText: 'Total Package', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.balance', label: 'Kolom sisa pembayaran', defaultText: 'Sisa Pembayaran', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.event', label: 'Kolom acara', defaultText: 'Acara Pernikahan Terbaru', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.eventThisMonth', label: 'Kolom acara bulan ini', defaultText: 'Nama Acara Bulan Ini', group: 'Tabel Data Pengantin' },
    { key: 'table.clients.actions', label: 'Kolom aksi', defaultText: 'Aksi', group: 'Tabel Data Pengantin' },
    { key: 'table.leads.number', label: 'Kolom nomor', defaultText: '#', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.name', label: 'Kolom nama', defaultText: 'Nama', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.contact', label: 'Kolom kontak', defaultText: 'WA / Kontak', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.location', label: 'Kolom lokasi', defaultText: 'Lokasi', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.source', label: 'Kolom sumber', defaultText: 'Sumber', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.contactDate', label: 'Kolom tanggal kontak', defaultText: 'Tgl Kontak', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.eventDate', label: 'Kolom tanggal acara', defaultText: 'Tgl Acara', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.status', label: 'Kolom status', defaultText: 'Status', group: 'Tabel Calon Pengantin' },
    { key: 'table.leads.actions', label: 'Kolom aksi', defaultText: 'Aksi', group: 'Tabel Calon Pengantin' },
    { key: 'table.booking.number', label: 'Kolom nomor', defaultText: 'No', group: 'Tabel Booking' },
    { key: 'table.booking.date', label: 'Kolom tanggal booking', defaultText: 'Tanggal Booking', group: 'Tabel Booking' },
    { key: 'table.booking.client', label: 'Kolom nama pengantin', defaultText: 'Nama Pengantin', group: 'Tabel Booking' },
    { key: 'table.booking.event', label: 'Kolom nama acara', defaultText: 'Nama Acara', group: 'Tabel Booking' },
    { key: 'table.booking.type', label: 'Kolom jenis acara', defaultText: 'Jenis Acara', group: 'Tabel Booking' },
    { key: 'table.booking.location', label: 'Kolom lokasi', defaultText: 'Lokasi', group: 'Tabel Booking' },
    { key: 'table.booking.package', label: 'Kolom paket', defaultText: 'Package', group: 'Tabel Booking' },
    { key: 'table.booking.total', label: 'Kolom total biaya', defaultText: 'Total Biaya', group: 'Tabel Booking' },
    { key: 'table.booking.deposit', label: 'Kolom DP dibayar', defaultText: 'DP Dibayar', group: 'Tabel Booking' },
    { key: 'table.booking.proof', label: 'Kolom bukti bayar', defaultText: 'Bukti Bayar', group: 'Tabel Booking' },
    { key: 'table.booking.actions', label: 'Kolom aksi', defaultText: 'Aksi', group: 'Tabel Booking' },
    { key: 'table.projects.number', label: 'Kolom nomor', defaultText: 'No', group: 'Tabel Acara' },
    { key: 'table.projects.event', label: 'Kolom nama acara', defaultText: 'Nama Acara Pernikahan', group: 'Tabel Acara' },
    { key: 'table.projects.client', label: 'Kolom pengantin', defaultText: 'Pengantin', group: 'Tabel Acara' },
    { key: 'table.projects.date', label: 'Kolom tanggal', defaultText: 'Tanggal', group: 'Tabel Acara' },
    { key: 'table.projects.progress', label: 'Kolom progres', defaultText: 'Progress', group: 'Tabel Acara' },
    { key: 'table.projects.team', label: 'Kolom tim', defaultText: 'Tim', group: 'Tabel Acara' },
    { key: 'table.projects.actions', label: 'Kolom aksi', defaultText: 'Aksi', group: 'Tabel Acara' },
    { key: 'table.transactions.number', label: 'Kolom nomor', defaultText: 'No', group: 'Tabel Transaksi' },
    { key: 'table.transactions.date', label: 'Kolom tanggal', defaultText: 'Tanggal', group: 'Tabel Transaksi' },
    { key: 'table.transactions.description', label: 'Kolom deskripsi', defaultText: 'Deskripsi & ID', group: 'Tabel Transaksi' },
    { key: 'table.transactions.category', label: 'Kolom kategori', defaultText: 'Kategori', group: 'Tabel Transaksi' },
    { key: 'table.transactions.amount', label: 'Kolom jumlah', defaultText: 'Jumlah', group: 'Tabel Transaksi' },
    { key: 'table.transactions.actions', label: 'Kolom aksi', defaultText: 'Aksi', group: 'Tabel Transaksi' },
    { key: 'table.cashflow.number', label: 'Kolom nomor', defaultText: 'No', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.period', label: 'Kolom periode', defaultText: 'Periode', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.type', label: 'Kolom tipe', defaultText: 'Tipe', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.income', label: 'Kolom pemasukan', defaultText: 'Pemasukan', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.expense', label: 'Kolom pengeluaran', defaultText: 'Pengeluaran', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.net', label: 'Kolom selisih bulan', defaultText: 'Selisih Bulan Ini', group: 'Tabel Arus Kas' },
    { key: 'table.cashflow.balance', label: 'Kolom saldo akhir', defaultText: 'Perkiraan Saldo Akhir', group: 'Tabel Arus Kas' },
    { key: 'table.team.number', label: 'Kolom nomor tim', defaultText: 'No', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.name', label: 'Kolom nama tim', defaultText: 'Nama', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.role', label: 'Kolom peran tim', defaultText: 'Peran / Posisi', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.payment', label: 'Kolom pembayaran tim', defaultText: 'Pembayaran Belum Dibayar', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.rating', label: 'Kolom rating tim', defaultText: 'Rating', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.actions', label: 'Kolom aksi tim', defaultText: 'Aksi', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.category', label: 'Kolom kategori pembayaran tim', defaultText: 'Kategori', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.event', label: 'Kolom acara pembayaran tim', defaultText: 'Acara Pernikahan', group: 'Tabel Tim/Vendor' },
    { key: 'table.team.amount', label: 'Kolom nominal pembayaran tim', defaultText: 'Nominal Pembayaran', group: 'Tabel Tim/Vendor' },
    { key: 'table.invoice.number', label: 'Kolom nomor dokumen', defaultText: 'No. Dokumen', group: 'Tabel Invoice' },
    { key: 'table.invoice.kind', label: 'Kolom jenis dokumen', defaultText: 'Jenis', group: 'Tabel Invoice' },
    { key: 'table.invoice.client', label: 'Kolom pengantin invoice', defaultText: 'Pengantin', group: 'Tabel Invoice' },
    { key: 'table.invoice.event', label: 'Kolom acara invoice', defaultText: 'Acara', group: 'Tabel Invoice' },
    { key: 'table.invoice.date', label: 'Kolom tanggal invoice', defaultText: 'Tanggal', group: 'Tabel Invoice' },
    { key: 'table.invoice.amount', label: 'Kolom jumlah invoice', defaultText: 'Jumlah', group: 'Tabel Invoice' },
    { key: 'table.invoice.status', label: 'Kolom status invoice', defaultText: 'Status', group: 'Tabel Invoice' },
    { key: 'table.invoice.actions', label: 'Kolom aksi invoice', defaultText: 'Aksi', group: 'Tabel Invoice' },
    { key: 'table.financeReport.client', label: 'Kolom pengantin laporan', defaultText: 'Pengantin', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.events', label: 'Kolom acara laporan', defaultText: 'Acara', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.transactions', label: 'Kolom transaksi laporan', defaultText: 'Transaksi', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.income', label: 'Kolom pemasukan laporan', defaultText: 'Pemasukan', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.expense', label: 'Kolom pengeluaran laporan', defaultText: 'Pengeluaran', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.profit', label: 'Kolom laba bersih laporan', defaultText: 'Laba bersih', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.incomeDetails', label: 'Kolom rincian pemasukan', defaultText: 'Rincian pemasukan', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.expenseDetails', label: 'Kolom rincian pengeluaran', defaultText: 'Rincian pengeluaran', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.type', label: 'Kolom jenis kategori', defaultText: 'Jenis', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.category', label: 'Kolom kategori laporan', defaultText: 'Kategori', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.transactionCount', label: 'Kolom jumlah transaksi', defaultText: 'Jumlah transaksi', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.total', label: 'Kolom total laporan', defaultText: 'Total', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.group', label: 'Kolom kelompok neraca', defaultText: 'Kelompok', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.account', label: 'Kolom akun neraca', defaultText: 'Akun', group: 'Tabel Laporan Keuangan' },
    { key: 'table.financeReport.value', label: 'Kolom nilai neraca', defaultText: 'Nilai', group: 'Tabel Laporan Keuangan' },
    { key: 'dashboard.title', label: 'Judul Dashboard', defaultText: '{companyName} Dashboard', group: 'Dashboard' },
    { key: 'dashboard.subtitle', label: 'Subjudul Dashboard', defaultText: 'Pusat kendali operasional, agenda pernikahan, dan kesehatan finansial studio.', group: 'Dashboard' },
    { key: 'client.detail.title', label: 'Judul detail pengantin', defaultText: 'Detail Pengantin', group: 'Detail Pengantin' },
    { key: 'client.detail.tab.info', label: 'Tab informasi', defaultText: 'Informasi', group: 'Detail Pengantin' },
    { key: 'client.detail.tab.events', label: 'Tab acara', defaultText: 'Acara Pernikahan', group: 'Detail Pengantin' },
    { key: 'client.detail.tab.payments', label: 'Tab pembayaran', defaultText: 'Pembayaran & Transaksi', group: 'Detail Pengantin' },
    { key: 'client.detail.section.contact', label: 'Bagian identitas', defaultText: 'Kontak & Identitas', group: 'Detail Pengantin' },
    { key: 'client.detail.section.finance', label: 'Bagian ringkasan keuangan', defaultText: 'Ringkasan Keuangan', group: 'Detail Pengantin' },
    { key: 'client.detail.section.transactions', label: 'Bagian riwayat transaksi', defaultText: 'Riwayat Transaksi', group: 'Detail Pengantin' },
    { key: 'client.detail.action.edit', label: 'Tombol edit pengantin', defaultText: 'Edit Pengantin', group: 'Detail Pengantin' },
    { key: 'client.detail.action.share', label: 'Tombol bagikan portal', defaultText: 'Bagikan Portal', group: 'Detail Pengantin' },
    { key: 'project.detail.title', label: 'Judul detail acara', defaultText: 'Detail Acara', group: 'Detail Acara' },
    { key: 'project.detail.tab.all', label: 'Tab semua bagian', defaultText: 'Semua', group: 'Detail Acara' },
    { key: 'project.detail.tab.info', label: 'Tab informasi & status', defaultText: 'Info & Status', group: 'Detail Acara' },
    { key: 'project.detail.tab.meetings', label: 'Tab pertemuan', defaultText: 'Meeting', group: 'Detail Acara' },
    { key: 'project.detail.tab.team', label: 'Tab tim & paket', defaultText: 'Tim & Paket', group: 'Detail Acara' },
    { key: 'project.detail.tab.terms', label: 'Tab syarat', defaultText: 'Syarat & Ketentuan', group: 'Detail Acara' },
    { key: 'project.detail.tab.workflow', label: 'Tab alur kerja', defaultText: 'Workflow', group: 'Detail Acara' },
    { key: 'project.detail.tab.files', label: 'Tab file', defaultText: 'File & Link', group: 'Detail Acara' },
    { key: 'project.detail.section.main', label: 'Bagian informasi utama', defaultText: 'Informasi Utama', group: 'Detail Acara' },
    { key: 'project.detail.section.status', label: 'Bagian status dan progres', defaultText: 'Status & Progres Pengerjaan', group: 'Detail Acara' },
    { key: 'project.detail.section.notes', label: 'Bagian catatan khusus', defaultText: 'Catatan Khusus', group: 'Detail Acara' },
    { key: 'project.detail.section.meetings', label: 'Bagian jadwal pertemuan', defaultText: 'Jadwal Meeting & Hasil', group: 'Detail Acara' },
    { key: 'project.detail.field.client', label: 'Label nama pengantin', defaultText: 'Pengantin', group: 'Detail Acara' },
    { key: 'project.detail.field.location', label: 'Label lokasi', defaultText: 'Lokasi / Kota', group: 'Detail Acara' },
    { key: 'project.detail.field.date', label: 'Label tanggal', defaultText: 'Tanggal Acara', group: 'Detail Acara' },
    { key: 'project.detail.meeting.offline', label: 'Nama pertemuan langsung', defaultText: 'Meeting Offline', group: 'Detail Acara' },
    { key: 'project.detail.meeting.online', label: 'Nama pertemuan online', defaultText: 'Meeting Online', group: 'Detail Acara' },
    { key: 'team.detail.stat.completed', label: 'Statistik acara selesai', defaultText: 'Acara Selesai', group: 'Detail Tim' },
    { key: 'team.detail.stat.paid', label: 'Subjudul acara selesai', defaultText: 'Sudah dibayar', group: 'Detail Tim' },
    { key: 'team.detail.stat.income', label: 'Statistik pendapatan', defaultText: 'Total Pendapatan', group: 'Detail Tim' },
    { key: 'team.detail.stat.lifetime', label: 'Subjudul pendapatan', defaultText: 'Lifetime', group: 'Detail Tim' },
    { key: 'team.detail.stat.rating', label: 'Statistik rating', defaultText: 'Rating', group: 'Detail Tim' },
    { key: 'team.detail.stat.ratingScale', label: 'Skala rating', defaultText: 'dari 5', group: 'Detail Tim' },
    { key: 'team.detail.tab.projects', label: 'Tab acara tim', defaultText: 'Acara', group: 'Detail Tim' },
    { key: 'team.detail.tab.salary', label: 'Tab gaji tim', defaultText: 'Gaji', group: 'Detail Tim' },
    { key: 'team.detail.tab.payments', label: 'Tab pembayaran tim', defaultText: 'Pembayaran', group: 'Detail Tim' },
    { key: 'team.detail.tab.performance', label: 'Tab kinerja tim', defaultText: 'Kinerja', group: 'Detail Tim' },
    { key: 'team.detail.tab.portal', label: 'Tab portal tim', defaultText: 'Portal', group: 'Detail Tim' },
    { key: 'team.drill.team.total', label: 'Judul daftar tim', defaultText: 'Daftar Semua Tim', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.team.unpaid', label: 'Judul pembayaran tim belum dibayar', defaultText: 'Rincian Pembayaran Tim Belum Dibayar', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.team.topRated', label: 'Judul peringkat tim', defaultText: 'Peringkat Tim', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.team.events', label: 'Judul acara tim', defaultText: 'Rincian Acara Pernikahan (Tim)', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.team.payments', label: 'Judul pembayaran tim', defaultText: 'Rincian Pembayaran (Tim)', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.team.performance', label: 'Judul kinerja tim', defaultText: 'Rincian Kinerja (Tim)', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.total', label: 'Judul daftar vendor', defaultText: 'Daftar Semua Vendor', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.unpaid', label: 'Judul pembayaran vendor belum dibayar', defaultText: 'Rincian Pembayaran Vendor Belum Dibayar', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.topRated', label: 'Judul peringkat vendor', defaultText: 'Peringkat Vendor', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.events', label: 'Judul acara vendor', defaultText: 'Rincian Acara Pernikahan (Vendor)', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.payments', label: 'Judul pembayaran vendor', defaultText: 'Rincian Pembayaran (Vendor)', group: 'Rincian Tim/Vendor' },
    { key: 'team.drill.vendor.performance', label: 'Judul kinerja vendor', defaultText: 'Rincian Kinerja (Vendor)', group: 'Rincian Tim/Vendor' },
    { key: 'finance.detail.assets.title', label: 'Judul rincian aset', defaultText: 'Rincian Total Aset', group: 'Detail Keuangan' },
    { key: 'finance.detail.pockets.title', label: 'Judul rincian kantong', defaultText: 'Rincian Dana di Kantong', group: 'Detail Keuangan' },
    { key: 'finance.detail.income.title', label: 'Judul rincian pemasukan', defaultText: 'Pemasukan Bulan Ini', group: 'Detail Keuangan' },
    { key: 'finance.detail.expense.title', label: 'Judul rincian pengeluaran', defaultText: 'Pengeluaran Bulan Ini', group: 'Detail Keuangan' },
    { key: 'finance.detail.income.empty', label: 'Pesan pemasukan kosong', defaultText: 'Tidak ada pemasukan bulan ini.', group: 'Detail Keuangan' },
    { key: 'finance.detail.expense.empty', label: 'Pesan pengeluaran kosong', defaultText: 'Tidak ada pengeluaran bulan ini.', group: 'Detail Keuangan' },
    { key: 'packages.catalog.title', label: 'Judul katalog paket', defaultText: 'Katalog Paket & Layanan', group: 'Katalog Paket' },
    { key: 'packages.catalog.subtitle', label: 'Subjudul katalog paket', defaultText: 'Kelola paket dokumentasi, opsi durasi dinamis, add-on, dan portofolio penawaran harga pengantin', group: 'Katalog Paket' },
    { key: 'packages.catalog.activeCount', label: 'Label jumlah paket', defaultText: 'Paket Aktif', group: 'Katalog Paket' },
    { key: 'packages.catalog.addOnsCount', label: 'Label jumlah add-on', defaultText: 'Layanan Add-On', group: 'Katalog Paket' },
    { key: 'packages.catalog.categoryCount', label: 'Label jumlah kategori', defaultText: 'Kategori Layanan', group: 'Katalog Paket' },
    { key: 'packages.catalog.search', label: 'Placeholder pencarian paket', defaultText: 'Cari paket atau Add-On...', group: 'Katalog Paket' },
    { key: 'packages.catalog.empty', label: 'Pesan katalog kosong', defaultText: 'Tidak ada paket yang ditemukan.', group: 'Katalog Paket' },
    { key: 'packages.catalog.emptyHint', label: 'Petunjuk katalog kosong', defaultText: 'Coba sesuaikan kata kunci pencarian atau filter wilayah.', group: 'Katalog Paket' },
    { key: 'packages.card.investment', label: 'Label harga kartu', defaultText: 'Investasi', group: 'Katalog Paket' },
    { key: 'packages.card.durationOptions', label: 'Label pilihan durasi', defaultText: 'Pilihan Durasi', group: 'Katalog Paket' },
    { key: 'packages.card.deliverables', label: 'Label item yang didapat', defaultText: 'Yang Didapatkan', group: 'Katalog Paket' },
    { key: 'packages.card.detailsOpen', label: 'Teks buka rincian kartu', defaultText: 'Rincian & Aksi', group: 'Katalog Paket' },
    { key: 'packages.card.detailsClose', label: 'Teks tutup rincian kartu', defaultText: 'Tutup', group: 'Katalog Paket' },
    { key: 'packages.card.edit', label: 'Tombol edit paket', defaultText: 'Edit Paket', group: 'Katalog Paket' },
    { key: 'packages.card.duplicate', label: 'Tombol duplikasi paket', defaultText: 'Salin', group: 'Katalog Paket' },
    { key: 'packages.card.share', label: 'Tombol bagikan paket', defaultText: 'Bagikan', group: 'Katalog Paket' },
    { key: 'packages.card.coverEmpty', label: 'Status foto sampul kosong', defaultText: 'Tanpa Foto Sampul', group: 'Katalog Paket' },
    { key: 'packages.table.name', label: 'Kolom nama paket', defaultText: 'Nama Paket', group: 'Katalog Paket' },
    { key: 'packages.table.number', label: 'Kolom nomor paket', defaultText: 'No', group: 'Katalog Paket' },
    { key: 'packages.table.order', label: 'Kolom urutan', defaultText: 'Urutan', group: 'Katalog Paket' },
    { key: 'packages.table.type', label: 'Kolom jenis item', defaultText: 'Jenis', group: 'Katalog Paket' },
    { key: 'packages.table.category', label: 'Kolom kategori paket', defaultText: 'Kategori', group: 'Katalog Paket' },
    { key: 'packages.table.region', label: 'Kolom wilayah paket', defaultText: 'Wilayah', group: 'Katalog Paket' },
    { key: 'packages.table.price', label: 'Kolom harga paket', defaultText: 'Harga / Variasi', group: 'Katalog Paket' },
    { key: 'packages.table.team', label: 'Kolom tim paket', defaultText: 'Tim Dokumentasi', group: 'Katalog Paket' },
    { key: 'packages.table.actions', label: 'Kolom aksi paket', defaultText: 'Aksi', group: 'Katalog Paket' },
    { key: 'packages.form.title.create', label: 'Judul tambah paket', defaultText: 'Tambah Paket Baru', group: 'Detail Paket' },
    { key: 'packages.form.title.edit', label: 'Judul edit paket', defaultText: 'Edit Paket Layanan', group: 'Detail Paket' },
    { key: 'packages.form.tab.basic', label: 'Tab informasi dan harga', defaultText: 'Informasi & Harga', group: 'Detail Paket' },
    { key: 'packages.form.tab.duration', label: 'Tab durasi', defaultText: 'Opsi Durasi', group: 'Detail Paket' },
    { key: 'packages.form.tab.deliverables', label: 'Tab item paket', defaultText: 'Deliverables & Item', group: 'Detail Paket' },
    { key: 'packages.form.tab.cover', label: 'Tab foto sampul', defaultText: 'Foto Sampul', group: 'Detail Paket' },
    { key: 'packages.form.field.name', label: 'Field nama paket', defaultText: 'Nama Paket', group: 'Detail Paket' },
    { key: 'packages.form.field.category', label: 'Field kategori layanan', defaultText: 'Kategori Layanan', group: 'Detail Paket' },
    { key: 'packages.form.field.price', label: 'Field harga paket', defaultText: 'Harga Paket (IDR)', group: 'Detail Paket' },
    { key: 'packages.form.field.team', label: 'Field tim dokumentasi', defaultText: 'Tim Dokumentasi', group: 'Detail Paket' },
    { key: 'packages.form.field.region', label: 'Field wilayah operasional', defaultText: 'Wilayah Operasional (Opsional)', group: 'Detail Paket' },
    { key: 'packages.form.duration.default', label: 'Status durasi default', defaultText: 'Default', group: 'Detail Paket' },
    { key: 'packages.form.duration.add', label: 'Tombol tambah durasi', defaultText: 'Tambah Opsi Durasi Baru', group: 'Detail Paket' },
    { key: 'packages.form.deliverables.title', label: 'Judul deliverables', defaultText: 'Deliverables & Layanan Digital', group: 'Detail Paket' },
    { key: 'packages.form.physical.title', label: 'Judul item fisik/vendor', defaultText: 'Vendor / Allpackage & Fisik', group: 'Detail Paket' },
    { key: 'packages.form.cover.upload', label: 'Judul unggah sampul', defaultText: 'Unggah Foto Sampul Paket', group: 'Detail Paket' },
    { key: 'packages.terms.title', label: 'Judul syarat paket', defaultText: 'Kelola Syarat & Ketentuan Paket', group: 'Syarat Paket' },
    { key: 'packages.terms.subtitle', label: 'Subjudul syarat paket', defaultText: 'Syarat & ketentuan khusus pemesanan paket pada halaman katalog publik.', group: 'Syarat Paket' },
    { key: 'packages.terms.add', label: 'Tombol tambah kategori syarat', defaultText: 'Tambah Kategori Baru', group: 'Syarat Paket' },
    { key: 'packages.terms.list', label: 'Judul daftar kategori syarat', defaultText: 'Daftar Kategori Syarat', group: 'Syarat Paket' },
    { key: 'packages.terms.apply', label: 'Tombol terapkan kategori syarat', defaultText: 'Terapkan Bagian Ini', group: 'Syarat Paket' },
    { key: 'status.client.paid', label: 'Status pembayaran lunas (detail pengantin)', defaultText: 'Lunas', group: 'Status Pembayaran' },
    { key: 'status.client.deposit', label: 'Status pembayaran sebagian (detail pengantin)', defaultText: 'DP Terbayar', group: 'Status Pembayaran' },
    { key: 'status.client.unpaid', label: 'Status belum bayar (detail pengantin)', defaultText: 'Belum Bayar', group: 'Status Pembayaran' },
    { key: 'status.team.paid', label: 'Status pembayaran dibayar (detail tim)', defaultText: 'Lunas', group: 'Status Pembayaran' },
    { key: 'status.team.unpaid', label: 'Status Pembayaran belum dibayar (detail tim)', defaultText: 'Belum lunas', group: 'Status Pembayaran' },
];

const STORAGE_KEY = 'venapindah.ui-text-overrides.v1';
const CHANGE_EVENT = 'venapindah-ui-text-change';
let remoteHydration: Promise<void> | null = null;
let overridesRevision = 0;

export const readUiTextOverrides = (): UiTextOverrides => {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        if (!value) return {};
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.fromEntries(Object.entries(parsed).filter(([, text]) => typeof text === 'string'));
    } catch {
        return {};
    }
};

const writeUiTextOverrides = (overrides: UiTextOverrides) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const saveUiTextOverrides = async (overrides: UiTextOverrides) => {
    overridesRevision += 1;
    if (isSupabaseConfigured) await saveRemoteUiTextOverrides(overrides);
    writeUiTextOverrides(overrides);
};

const hydrateRemoteOverrides = () => {
    if (!isSupabaseConfigured || remoteHydration) return;

    const revisionAtStart = overridesRevision;
    remoteHydration = (async () => {
        const remoteOverrides = await loadUiTextOverrides();
        if (remoteOverrides === undefined || revisionAtStart !== overridesRevision) return;

        if (remoteOverrides === null) {
            const legacyOverrides = readUiTextOverrides();
            if (Object.keys(legacyOverrides).length > 0) {
                await saveRemoteUiTextOverrides(legacyOverrides);
                if (revisionAtStart !== overridesRevision) return;
                writeUiTextOverrides(legacyOverrides);
                return;
            }
            writeUiTextOverrides({});
            return;
        }

        writeUiTextOverrides(remoteOverrides);
    })().catch(error => {
        console.warn('[uiTextCustomization] Failed to load remote overrides:', error);
    });
};

export const customizeUiText = (key: string, fallback: string, overrides: UiTextOverrides) =>
    overrides[key]?.trim() || fallback;

const NAVIGATION_TEXT_KEYS: Record<string, string> = {
    Dashboard: 'nav.dashboard',
    Kalender: 'nav.calendar',
    'Jadwal Wedding': 'nav.calendar',
    'Calon Pengantin': 'nav.leads',
    Booking: 'nav.booking',
    'Booking Jadwal': 'nav.booking',
    'Data Booking': 'nav.booking',
    'Data Pengantin': 'nav.clients',
    Testimoni: 'nav.reports',
    'KPI & Testimoni': 'nav.reports',
    'Laporan Pengantin': 'nav.reports',
    'Tim / Vendor': 'nav.team',
    'Tim & Vendor': 'nav.team',
    Tim: 'nav.team',
    Keuangan: 'nav.finance',
    'Arus Kas': 'nav.cashflow',
    'Pembayaran & Invoice': 'nav.invoices',
    'Produk & Katalog': 'nav.products',
    'Paket & Layanan': 'nav.packages',
    'Layanan / Package': 'nav.packages',
    Package: 'nav.packages',
    Voucher: 'nav.promos',
    'Promo & Katalog': 'nav.promos',
    'Pricelist Publik': 'nav.gallery',
    'Upload Pricelist Publik': 'nav.gallery',
    'Profil Vendor': 'nav.vendorProfile',
    'Link Publik': 'nav.publicLinks',
    Pengaturan: 'nav.settings',
    'Pengaturan Sistem': 'nav.settings',
    Beranda: 'nav.section.home',
    'Bisnis & Operasional': 'nav.section.business',
    'Produk & Layanan': 'nav.section.mobileProducts',
    Manajemen: 'nav.section.management',
};

export const customizeNavigationLabel = (fallback: string, overrides: UiTextOverrides) => {
    const key = NAVIGATION_TEXT_KEYS[fallback];
    return key ? customizeUiText(key, fallback, overrides) : fallback;
};

const NAVIGATION_SECTION_KEYS: Record<string, string> = {
    Beranda: 'nav.section.home',
    'Bisnis & Operasional': 'nav.section.business',
    Keuangan: 'nav.section.finance',
    'Produk & Katalog': 'nav.section.products',
};

export const customizeNavigationSection = (fallback: string, overrides: UiTextOverrides) => {
    const key = NAVIGATION_SECTION_KEYS[fallback];
    return key ? customizeUiText(key, fallback, overrides) : fallback;
};

export const useUiTextOverrides = () => {
    const [overrides, setOverrides] = useState<UiTextOverrides>(readUiTextOverrides);

    useEffect(() => {
        const updateOverrides = () => setOverrides(readUiTextOverrides());
        window.addEventListener(CHANGE_EVENT, updateOverrides);
        window.addEventListener('storage', updateOverrides);
        hydrateRemoteOverrides();
        return () => {
            window.removeEventListener(CHANGE_EVENT, updateOverrides);
            window.removeEventListener('storage', updateOverrides);
        };
    }, []);

    return overrides;
};
