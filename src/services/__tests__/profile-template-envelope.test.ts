import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const getUserMock = vi.fn();
let profileRow: Record<string, any>;

vi.mock('../../lib/supabaseClient', () => ({
  default: {
    from: fromMock,
    auth: { getUser: getUserMock },
  },
}));

const templateEnvelope = {
  bookingFormTemplate: 'Halo {leadName}: {bookingFormLink}',
  billingTemplates: [{ id: 'billing-1', title: 'Tagihan', template: '{portalLink}' }],
  invoiceShareTemplate: 'Invoice {invoiceLink}',
};

describe('profile booking template envelope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-admin-id' } }, error: null });
    profileRow = {
      id: 'profile-1',
      booking_form_template: JSON.stringify(templateEnvelope),
    };

    fromMock.mockImplementation(() => ({
      select: (columns: string) => {
        if (columns === 'booking_form_template') {
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: { booking_form_template: profileRow.booking_form_template },
                error: null as Error | null,
              }),
            }),
          };
        }
        return {
          limit: () => ({
            maybeSingle: async () => ({ data: profileRow, error: null as Error | null }),
          }),
          eq: () => ({
            single: async () => ({ data: profileRow, error: null as Error | null }),
          }),
        };
      },
      update: (updates: Record<string, any>) => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              profileRow = { ...profileRow, ...updates };
              return { data: profileRow, error: null as Error | null };
            },
          }),
        }),
      }),
      insert: (values: Record<string, any>) => ({
        select: () => ({
          single: async () => {
            profileRow = { ...values, id: 'profile-new' };
            return { data: profileRow, error: null as Error | null };
          },
        }),
      }),
    }));
  });

  it('loads the booking template separately from other saved templates', async () => {
    const { getProfile } = await import('../profile');
    const profile = await getProfile();

    expect(profile?.bookingFormTemplate).toBe(templateEnvelope.bookingFormTemplate);
    expect(profile?.billingTemplates).toEqual(templateEnvelope.billingTemplates);
    expect(profile?.invoiceShareTemplate).toBe(templateEnvelope.invoiceShareTemplate);
  });

  it('saves booking edits while preserving the other templates in the envelope', async () => {
    const { upsertProfile } = await import('../profile');
    const profile = await upsertProfile({ id: 'profile-1', bookingFormTemplate: 'New {bookingFormLink}' });
    const savedEnvelope = JSON.parse(profileRow.booking_form_template);

    expect(profile.bookingFormTemplate).toBe('New {bookingFormLink}');
    expect(savedEnvelope).toEqual({
      ...templateEnvelope,
      bookingFormTemplate: 'New {bookingFormLink}',
    });
  });

  it('preserves templates saved earlier when another template is updated', async () => {
    const { getProfile, upsertProfile } = await import('../profile');

    await upsertProfile({ id: 'profile-1', portalShareTemplate: 'Portal template' });
    await upsertProfile({ id: 'profile-1', receiptShareTemplate: 'Receipt template' });

    const savedEnvelope = JSON.parse(profileRow.booking_form_template);
    expect(savedEnvelope.portalShareTemplate).toBe('Portal template');
    expect(savedEnvelope.receiptShareTemplate).toBe('Receipt template');
    expect(savedEnvelope.invoiceShareTemplate).toBe(templateEnvelope.invoiceShareTemplate);

    const savedProfile = await getProfile();
    expect(savedProfile?.portalShareTemplate).toBe('Portal template');
    expect(savedProfile?.receiptShareTemplate).toBe('Receipt template');
  });

  it('continues to read legacy plain-text booking templates', async () => {
    profileRow.booking_form_template = 'Legacy booking text';
    const { getProfile } = await import('../profile');
    const profile = await getProfile();

    expect(profile?.bookingFormTemplate).toBe('Legacy booking text');
  });

  it('binds a first profile insert to the authenticated user', async () => {
    const { upsertProfile } = await import('../profile');
    const profile = await upsertProfile({
      fullName: 'Admin',
      email: 'atter@admin.com',
      phone: '081200000000',
      companyName: 'Attera Visual',
      address: 'Studio address',
      bankAccount: 'Business account',
      authorizedSigner: 'Admin',
    });

    expect(getUserMock).toHaveBeenCalledOnce();
    expect(profileRow.admin_user_id).toBe('auth-admin-id');
    expect(profile.adminUserId).toBe('auth-admin-id');
  });
});
