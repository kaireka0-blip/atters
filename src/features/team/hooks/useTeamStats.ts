/**
 * useTeamStats
 *
 * Derives all statistics displayed on the Team Page:
 * - teamSectionStats  → Tim Internal stats cards
 * - vendorSectionStats → Vendor Eksternal stats cards
 * - teamStats         → Analytics tab (overall payout, projects handled, avg rating)
 *
 * All values are pure derivations of props — no side-effects, no state.
 */

import { useMemo } from 'react';
import { TeamMember, TeamProjectPayment, TeamPaymentRecord } from '../../../types';
import { formatCurrency } from '../utils/teamUtils';

interface MemberGroups {
    team: TeamMember[];
    employee: TeamMember[];
    vendor: TeamMember[];
}

interface SectionStats {
    totalMembers: number;
    totalUnpaid: string;
    topRatedName: string;
    topRatedRating: string;
    totalWeddingEvents: number;
    totalPaid: string;
    totalUnpaidRaw: string;
    totalPaidCount: number;
    totalUnpaidCount: number;
    avgRating: string;
    performanceNotesCount: number;
}

interface OverallStats {
    totalPayout: string;
    totalProjectsHandled: number;
    avgRating: string;
}

interface UseTeamStatsParams {
    memberGroups: MemberGroups;
    teamMembers: TeamMember[];
    teamProjectPaymentsInDateRange: TeamProjectPayment[];
    teamProjectPayments: TeamProjectPayment[];
    teamPaymentRecords: TeamPaymentRecord[];
}

const buildSectionStats = (
    members: TeamMember[],
    paymentsInRange: TeamProjectPayment[],
): SectionStats => {
    const memberIds = new Set(members.map(m => m.id));
    const sectionPayments = paymentsInRange.filter(p => memberIds.has(p.teamMemberId));

    const uniqueProjectIds = new Set(sectionPayments.map(p => p.projectId));
    const totalPaid = sectionPayments
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.fee, 0);
    const totalUnpaid = sectionPayments
        .filter(p => p.status === 'Unpaid')
        .reduce((sum, p) => sum + p.fee, 0);
    const totalUnpaidCount = sectionPayments.filter(p => p.status === 'Unpaid').length;
    const totalPaidCount = sectionPayments.filter(p => p.status === 'Paid').length;

    const avgRating =
        members.length > 0
            ? members.reduce((sum, m) => sum + (m.rating || 0), 0) / members.length
            : 0;
    const performanceNotesCount = members.reduce(
        (sum, m) => sum + (m.performanceNotes?.length || 0),
        0,
    );

    const topRated = [...members].sort((a, b) => b.rating - a.rating)[0];

    return {
        totalMembers: members.length,
        totalUnpaid: formatCurrency(totalUnpaid),
        topRatedName: topRated ? topRated.name : 'N/A',
        topRatedRating: topRated ? topRated.rating.toFixed(1) : 'N/A',
        totalWeddingEvents: uniqueProjectIds.size,
        totalPaid: formatCurrency(totalPaid),
        totalUnpaidRaw: formatCurrency(totalUnpaid),
        totalPaidCount,
        totalUnpaidCount,
        avgRating: avgRating.toFixed(1),
        performanceNotesCount,
    };
};

export const useTeamStats = ({
    memberGroups,
    teamMembers,
    teamProjectPayments,
    teamPaymentRecords,
}: UseTeamStatsParams) => {
    const teamSectionStats = useMemo(
        () => buildSectionStats(memberGroups.team, teamProjectPayments),
        [memberGroups.team, teamProjectPayments],
    );

    const employeeSectionStats = useMemo(
        () => buildSectionStats(memberGroups.employee, teamProjectPayments),
        [memberGroups.employee, teamProjectPayments],
    );

    const vendorSectionStats = useMemo(
        () => buildSectionStats(memberGroups.vendor, teamProjectPayments),
        [memberGroups.vendor, teamProjectPayments],
    );

    const teamStats = useMemo((): OverallStats => {
        const totalPayout = teamPaymentRecords.reduce((sum, r) => sum + r.totalAmount, 0);
        const totalProjectsHandled = teamProjectPayments.filter(p => p.status === 'Paid').length;
        const avgRating =
            teamMembers.length > 0
                ? teamMembers.reduce((sum, m) => sum + m.rating, 0) / teamMembers.length
                : 0;
        return {
            totalPayout: formatCurrency(totalPayout),
            totalProjectsHandled,
            avgRating: avgRating.toFixed(1),
        };
    }, [teamPaymentRecords, teamProjectPayments, teamMembers]);

    return { teamSectionStats, employeeSectionStats, vendorSectionStats, teamStats };
};
