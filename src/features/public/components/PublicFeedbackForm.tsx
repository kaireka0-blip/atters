import React, { useState } from 'react';
import { ClientFeedback, SatisfactionLevel } from '../../../types';
import { StarIcon } from '../../../constants';
import { createClientFeedback, updateClientFeedback } from '../../../services/clientFeedback';
import { supabase } from '../../../lib/supabaseClient';
import { customizeUiText, useUiTextOverrides } from '../../../utils/uiTextCustomization';

interface PublicFeedbackFormProps {
    setClientFeedback: React.Dispatch<React.SetStateAction<ClientFeedback[]>>;
}

const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
    if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating >= 4) return SatisfactionLevel.SATISFIED;
    if (rating >= 3) return SatisfactionLevel.NEUTRAL;
    return SatisfactionLevel.UNSATISFIED;
};

const PublicFeedbackForm: React.FC<PublicFeedbackFormProps> = ({ setClientFeedback }) => {
    const uiTextOverrides = useUiTextOverrides();
    const text = (key: string, fallback: string) => customizeUiText(`public.feedback.${key}`, fallback, uiTextOverrides);
    const [formState, setFormState] = useState({
        clientName: '',
        rating: 0,
        feedback: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleRatingChange = (rating: number) => {
        setFormState(prev => ({ ...prev, rating }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.rating === 0) {
            alert('Mohon berikan peringkat bintang.');
            return;
        }
        setIsSubmitting(true);

        const payload: Omit<ClientFeedback, 'id'> = {
            clientName: formState.clientName,
            rating: formState.rating,
            satisfaction: getSatisfactionFromRating(formState.rating),
            feedback: formState.feedback,
            date: new Date().toISOString(),
        };

        try {
            const { data: existing } = await supabase
                .from('client_feedback')
                .select('id')
                .eq('client_name', formState.clientName.trim())
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing?.id) {
                const updated = await updateClientFeedback(existing.id, payload);
                setClientFeedback(prev => prev.map(f => f.id === existing.id ? updated : f));
            } else {
                const created = await createClientFeedback(payload);
                setClientFeedback(prev => [created, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
            setIsSubmitted(true);
        } catch (err: any) {
            alert('Gagal mengirim masukan. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                    <h1 className="text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-brand-text-primary">Saran dan masukan Anda sangat berharga bagi kami. Tim kami akan segera meninjaunya untuk menjadi lebih baik lagi.</p>
                    <a href="#" className="mt-6 button-primary inline-block">Kembali ke Beranda</a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-brand-surface p-8 rounded-2xl shadow-lg border border-brand-border">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gradient">{text('title', 'Formulir Testimoni')}</h1>
                        <p className="text-sm text-brand-text-secondary mt-2">Kami sangat menghargai waktu Anda untuk memBerikan Testimoni.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label htmlFor="clientName" className="block text-xs text-brand-text-secondary">Nama Anda</label>
                            <input
                                type="text"
                                id="clientName"
                                name="clientName"
                                value={formState.clientName}
                                onChange={handleFormChange}
                                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Masukkan nama Anda"
                                required
                            />
                            <p className="text-xs text-brand-text-secondary">Nama Anda untuk testimoni</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-brand-accent">Peringkat Kepuasan Anda</label>
                            <p className="text-xs text-brand-text-secondary mb-2">Berikan rating bintang untuk layanan kami</p>
                            <div className="flex items-center justify-center gap-3 p-4 bg-brand-accent/5 border-2 border-brand-accent/20 rounded-xl">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingChange(star)}
                                        className={`p-2 rounded-full transition-all ${formState.rating >= star
                                                ? 'bg-yellow-400/30 scale-110'
                                                : 'bg-brand-input hover:bg-yellow-400/10 hover:scale-105'
                                            }`}
                                    >
                                        <StarIcon className={`w-8 h-8 transition-all ${formState.rating >= star
                                                ? 'text-yellow-400 fill-current drop-shadow-lg'
                                                : 'text-gray-400'
                                            }`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="feedback" className="block text-xs text-brand-text-secondary">Testimoni kamu</label>
                            <textarea
                                id="feedback"
                                name="feedback"
                                value={formState.feedback}
                                onChange={handleFormChange}
                                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Bagikan pengalaman Anda dengan layanan kami..."
                                required
                                rows={5}
                            ></textarea>
                            <p className="text-xs text-brand-text-secondary">Ceritakan pengalaman Anda menggunakan layanan kami</p>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full px-6 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting ? 'Mengirim...' : text('submit', 'Kirim Testimoni')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicFeedbackForm;
