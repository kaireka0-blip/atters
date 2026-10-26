import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddOn, Card, ClientType, Package, Profile, PromoCode } from '../../../types';
import ClientForm from './ClientForm';
import { ClientFormData, initialClientFormState } from '../utils/clientHelpers';

vi.mock('../../../services/clients', () => ({
  uploadClientAvatar: vi.fn().mockResolvedValue('https://example.test/avatar.png'),
}));

const packageList = [
  { id: 'package-main', name: 'Paket Pernikahan', category: 'Wedding', price: 5_000_000, region: 'Jakarta' },
  { id: 'package-extra', name: 'Paket Video', category: 'Wedding', price: 1_500_000, region: 'Jakarta' },
] as Package[];
const addOnList = [
  { id: 'addon-photo', name: 'Cetak Foto', price: 250_000, region: 'Jakarta' },
] as AddOn[];
const cards = [{ id: 'card-cash', bankName: 'Tunai', lastFourDigits: 'CASH' }] as Card[];
const promoCodes = [{ id: 'promo-test', code: 'TEST10', discountType: 'percentage', discountValue: 10, isActive: true }] as PromoCode[];
const profile = { projectTypes: ['Pernikahan'] } as Profile;

function FormHarness({ onSubmit }: { onSubmit: (data: ClientFormData) => void }) {
  const [formData, setFormData] = useState<ClientFormData>(initialClientFormState);

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'addOns') {
      const checkbox = event.target as HTMLInputElement;
      setFormData(previous => ({
        ...previous,
        selectedAddOnIds: checkbox.checked
          ? [...new Set([...previous.selectedAddOnIds, checkbox.id])]
          : previous.selectedAddOnIds.filter(id => id !== checkbox.id),
      }));
      return;
    }
    if (name === 'packageId') {
      setFormData(previous => ({ ...previous, packageId: value, unitPrice: packageList.find(item => item.id === value)?.price }));
      return;
    }
    setFormData(previous => ({ ...previous, [name]: value }));
  };

  return (
    <ClientForm
      formData={formData}
      setFormData={setFormData}
      handleFormChange={handleFormChange}
      handleFormSubmit={() => onSubmit(formData)}
      handleCloseModal={() => undefined}
      packages={packageList}
      addOns={addOnList}
      userProfile={profile}
      modalMode="add"
      cards={cards}
      promoCodes={promoCodes}
    />
  );
}

describe('ClientForm', () => {
  it('accepts dummy values across client, event, package, add-on, promotion, payment, and proof fields then submits them', async () => {
    const onSubmit = vi.fn();
    render(<FormHarness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nama Pengantin'), { target: { value: 'Alya & Bima' } });
    fireEvent.change(screen.getByLabelText('Jenis Pengantin'), { target: { value: ClientType.DIRECT } });
    fireEvent.change(screen.getByLabelText('Nomor Telepon (WhatsApp)'), { target: { value: '081234567890' } });
    fireEvent.change(screen.getByLabelText('Email (Opsional)'), { target: { value: 'alya@example.test' } });
    fireEvent.change(screen.getByLabelText('Instagram (Opsional)'), { target: { value: '@alya.bima' } });
    fireEvent.change(screen.getByLabelText('Nama Acara Pernikahan'), { target: { value: 'Pernikahan Alya & Bima' } });
    fireEvent.change(screen.getByLabelText('Jenis Acara Pernikahan'), { target: { value: 'Pernikahan' } });
    fireEvent.change(screen.getByLabelText('Tanggal Acara (Opsional)'), { target: { value: '2027-05-20' } });
    fireEvent.change(screen.getByLabelText('Lokasi (Kota)'), { target: { value: 'Bandung' } });
    fireEvent.change(screen.getByLabelText('Alamat Lengkap / Gedung'), { target: { value: 'Gedung Contoh, Bandung' } });
    fireEvent.change(screen.getByLabelText(/Alamat Rumah Pengantin/), { target: { value: 'Jl. Dummy No. 10, Bandung' } });

    const avatar = new File(['dummy avatar'], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Unggah Foto Profil'), { target: { files: [avatar] } });
    await screen.findByAltText('Foto profil pengantin');

    fireEvent.click(document.querySelector('#packageId') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: /Paket Pernikahan/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Cetak Foto/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Paket Video/ }));

    fireEvent.change(screen.getByPlaceholderText('Nama item / bonus...'), { target: { value: 'Album tambahan' } });
    fireEvent.change(screen.getByPlaceholderText('Harga (Rp 0 bisa)'), { target: { value: 'Rp 300.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.change(screen.getByLabelText(/Kode Promo/), { target: { value: 'promo-test' } });
    fireEvent.change(screen.getByLabelText('Uang DP'), { target: { value: 'Rp 1.000.000' } });
    fireEvent.change(screen.getByLabelText('Kartu Tujuan'), { target: { value: 'card-cash' } });

    const proof = new File(['dummy proof'], 'bukti-dp.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Pilih file'), { target: { files: [proof] } });

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Pengantin' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0] as ClientFormData;
    expect(submitted).toMatchObject({
      clientName: 'Alya & Bima',
      avatarUrl: 'https://example.test/avatar.png',
      clientType: ClientType.DIRECT,
      phone: '081234567890',
      whatsapp: '081234567890',
      email: 'alya@example.test',
      instagram: '@alya.bima',
      projectName: 'Pernikahan Alya & Bima',
      projectType: 'Pernikahan',
      date: '2027-05-20',
      location: 'Bandung',
      address: 'Gedung Contoh, Bandung',
      homeAddress: 'Jl. Dummy No. 10, Bandung',
      packageId: 'package-main',
      selectedAdditionalPackageIds: ['package-extra'],
      selectedAddOnIds: ['addon-photo'],
      customItems: [expect.objectContaining({ name: 'Album tambahan', price: 300_000 })],
      promoCodeId: 'promo-test',
      dp: '1000000',
      dpDestinationCardId: 'card-cash',
      dpProofFile: proof,
    });
  });
});
