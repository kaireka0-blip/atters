import React from 'react';
import Modal from '../../../shared/ui/Modal';
import QrCodeDisplay from '../../../shared/ui/QrCodeDisplay';
import ShareMessageModal from '../../communication/components/ShareMessageModal';
import { WhatsappIcon } from '../../../constants';
import { Profile } from '../../../types';
import { generatePortalWhatsAppMessage } from '../utils/clientWhatsAppTemplates';

interface QrModalContent {
    title: string;
    url: string;
    clientName?: string;
    clientPhone?: string;
}

interface SharePreviewState {
    title: string;
    message: string;
    phone?: string;
}

interface ClientQrShareModalsProps {
    qrModalContent: QrModalContent | null;
    onCloseQrModal: () => void;
    sharePreview: SharePreviewState | null;
    setSharePreview: React.Dispatch<React.SetStateAction<SharePreviewState | null>>;
    userProfile: Profile;
    showNotification: (message: string) => void;
}

export const ClientQrShareModals: React.FC<ClientQrShareModalsProps> = ({
    qrModalContent,
    onCloseQrModal,
    sharePreview,
    setSharePreview,
    userProfile,
    showNotification,
}) => {
    return (
        <>
            {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={onCloseQrModal} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <QrCodeDisplay value={qrModalContent.url} size={200} wrapperId="client-portal-qrcode" />
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(qrModalContent.url);
                                    showNotification('Tautan berhasil disalin!');
                                }}
                                className="button-secondary flex-1"
                            >
                                Salin Tautan
                            </button>
                            <button
                                onClick={() => {
                                    const companyName = userProfile?.companyName || 'Vena Pictures';
                                    const template = generatePortalWhatsAppMessage(
                                        qrModalContent.clientName || '',
                                        companyName,
                                        qrModalContent.url,
                                        userProfile.portalShareTemplate,
                                    );
                                    setSharePreview({
                                        title: 'Bagikan Portal Pengantin',
                                        message: template,
                                        phone: qrModalContent.clientPhone,
                                    });
                                }}
                                className="button-primary flex-1 !bg-green-600 hover:!bg-green-600 inline-flex items-center justify-center gap-2"
                            >
                                <WhatsappIcon className="w-4 h-4" />
                                Share WA
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {sharePreview && (
                <ShareMessageModal
                    isOpen={!!sharePreview}
                    onClose={() => setSharePreview(null)}
                    title={sharePreview.title}
                    initialMessage={sharePreview.message}
                    phone={sharePreview.phone}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default ClientQrShareModals;
