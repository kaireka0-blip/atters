import { Project, Transaction, TransactionType } from '../../../types';
import { formatCurrency } from './clientHelpers';
import {
    DEFAULT_EXPENSE_SHARE_TEMPLATE,
    DEFAULT_INVOICE_SHARE_TEMPLATE,
    DEFAULT_PORTAL_SHARE_TEMPLATE,
    DEFAULT_RECEIPT_SHARE_TEMPLATE,
} from '../../../constants';

const chooseTemplate = (saved: string | undefined, fallback: string, legacyGreeting: string) => {
    const trimmed = saved?.trim();
    return !trimmed || trimmed === legacyGreeting ? fallback : saved!;
};

const renderTemplate = (template: string, values: Record<string, string>) =>
    template.replace(/\{([a-zA-Z0-9_]+)\}/g, (token, key: string) => values[key] ?? token);

export const generateInvoiceWhatsAppMessage = (
    clientName: string,
    companyName: string,
    project: Project,
    publicInvoiceUrl: string,
    savedTemplate?: string,
): string => {
    const sisa = project.totalCost - project.amountPaid;
    const template = chooseTemplate(savedTemplate, DEFAULT_INVOICE_SHARE_TEMPLATE, 'Halo *{clientName}*!');
    return renderTemplate(template, {
        clientName, companyName, projectName: project.projectName || 'Acara Pernikahan',
        totalCost: formatCurrency(project.totalCost), amountPaid: formatCurrency(project.amountPaid),
        sisaTagihan: formatCurrency(sisa), invoiceLink: publicInvoiceUrl,
    });
};

export const generateReceiptWhatsAppMessage = (
    clientName: string,
    companyName: string,
    transaction: Transaction,
    projectName: string,
    publicReceiptUrl: string,
    savedTemplate?: string,
): string => {
    const isExpense = transaction.type === TransactionType.EXPENSE;
    const txDate = new Date(transaction.date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (isExpense) {
        let targetName = 'Pihak Lain';
        if (transaction.category === 'Gaji Tim / Vendor') {
            const match = transaction.description?.match(/Gaji Freelance - (.+?) \(/);
            targetName = match && match[1] ? match[1] : 'Vendor / Tim';
        }
        const template = chooseTemplate(savedTemplate, DEFAULT_EXPENSE_SHARE_TEMPLATE, 'Halo *{targetName}*!');
        return renderTemplate(template, {
            targetName, companyName, txDate, txAmount: formatCurrency(transaction.amount),
            txMethod: transaction.method || '-', txDesc: transaction.description || '-', receiptLink: publicReceiptUrl,
        });
    }

    const template = chooseTemplate(savedTemplate, DEFAULT_RECEIPT_SHARE_TEMPLATE, 'Halo *{clientName}*!');
    return renderTemplate(template, {
        clientName, companyName, projectName: projectName || 'Acara Pernikahan', txDate,
        txAmount: formatCurrency(transaction.amount), txMethod: transaction.method || '-',
        txDesc: transaction.description || '-', receiptLink: publicReceiptUrl,
    });
};

export const generatePortalWhatsAppMessage = (
    clientName: string,
    companyName: string,
    portalUrl: string,
    savedTemplate?: string,
): string => {
    const template = chooseTemplate(savedTemplate, DEFAULT_PORTAL_SHARE_TEMPLATE, 'Halo {clientName}!');
    return renderTemplate(template, { clientName, companyName, portalLink: portalUrl });
};
