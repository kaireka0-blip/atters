import React from 'react';
import {
    FileTextIcon, ClipboardListIcon, CreditCardIcon, TrendingUpIcon,
    BarChart2Icon
} from '../../../constants';

interface FinanceTabsProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
}

export const FinanceTabs: React.FC<FinanceTabsProps> = ({
    activeTab,
    setActiveTab
}) => {
    const operasionalTabs = [
        { id: 'transactions', label: 'Transaksi', icon: FileTextIcon },
        { id: 'pockets', label: 'Kantong', icon: ClipboardListIcon },
        { id: 'cards', label: 'Kartu', icon: CreditCardIcon },
        { id: 'cashflow', label: 'Arus Kas', icon: TrendingUpIcon },
    ];

    const TabButton = ({ tab, isActive }: { tab: any, isActive: boolean }) => (
        <button
            onClick={() => {
                setActiveTab(tab.id);
            }}
            className={`
                shrink-0 inline-flex items-center gap-2 whitespace-nowrap
                min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm
                transition-all duration-200
                ${isActive
                    ? 'bg-[#5D87FF] text-white shadow-md'
                    : 'text-[#5A6A85] hover:bg-[#F4F6F9]'
                }
            `}
        >
            <tab.icon className="w-4 h-4" />
            {tab.label}
        </button>
    );

    return (
        <div className="scrollbar-hide flex w-full flex-nowrap items-center gap-1 overflow-x-auto bg-white p-2 rounded-2xl border border-[#EAEFF4] shadow-sm sm:flex-wrap sm:overflow-visible sm:gap-2">
            {/* Operasional */}
            <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:contents">
                {operasionalTabs.map(tab => (
                    <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} />
                ))}
            </div>

            {/* Unified reports page */}
            <div className="flex shrink-0 items-center gap-2 sm:contents">
                <TabButton tab={{ id: 'laporan', label: 'Laporan', icon: BarChart2Icon }} isActive={activeTab === 'laporan'} />

            </div>
        </div>
    );
};
