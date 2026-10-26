import React from 'react';
import { Project, ProjectStatusConfig, Client } from '../../../types';
import ProjectCard from './ProjectCard';
import { EyeIcon } from '../../../constants';
import { CalendarDays, PencilIcon, Trash2Icon, ArrowDownIcon } from 'lucide-react';
import { getStatusColor, getStatusClass, getSubStatusText, getDisplayProgress } from '../utils/projectHelpers';
import ProjectClientAvatar from './ProjectClientAvatar';
import { customizeUiText, useUiTextOverrides } from '../../../utils/uiTextCustomization';

export interface ProjectListViewProps {
    projects: Project[];
    handleOpenDetailModal: (project: Project) => void;
    handleOpenForm: (mode: 'edit', project: Project) => void;
    handleProjectDelete: (projectId: string) => void;
    config: ProjectStatusConfig[];
    clients: Client[];
    handleQuickStatusChange: (projectId: string, newStatus: string, notifyClient: boolean) => Promise<void>;
    handleSendMessage: (project: Project) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
    projects, handleOpenDetailModal, handleOpenForm, handleProjectDelete,
    config, clients, handleQuickStatusChange, handleSendMessage
}) => {
    const uiTextOverrides = useUiTextOverrides();
    const tableText = (key: string, fallback: string) => customizeUiText(`table.projects.${key}`, fallback, uiTextOverrides);
    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="w-full bg-[#F4F6F9] rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }}></div>
        </div>
    );

    return (
        <div>
            {/* Mobile cards - Using ProjectCard Component */}
            <div className="md:hidden space-y-2 p-2 sm:p-2.5">
                {projects.map(p => {
                    const client = clients.find(c => c.id === p.clientId);
                    return (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            client={client}
                            projectStatusConfig={config}
                            onStatusChange={(projectId, newStatus) => handleQuickStatusChange(projectId, newStatus, false)}
                            onViewDetails={handleOpenDetailModal}
                            onEdit={(project) => handleOpenForm('edit', project)}
                            onSendMessage={handleSendMessage}
                        />
                    );
                })}
                {projects.length === 0 && <p className="text-center py-6 text-xs sm:text-sm text-[#5A6A85]">Tidak ada Acara Pernikahan dalam kategori ini.</p>}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-xs lg:text-sm text-left">
                    <thead className="text-xs text-[#5A6A85] uppercase bg-[#F4F6F9]/80 border-b border-[#EAEFF4]">
                        <tr>
                            <th className="px-3 lg:px-4 py-2.5 font-bold tracking-wider text-center w-12">{tableText('number', 'No')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider">{tableText('event', 'Nama Acara Pernikahan')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider">{tableText('client', 'Pengantin')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider">{tableText('date', 'Tanggal')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider min-w-[140px] lg:min-w-[200px]">{tableText('progress', 'Progress')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider">{tableText('team', 'Tim')}</th>
                            <th className="px-3 lg:px-6 py-2.5 font-bold tracking-wider text-center">{tableText('actions', 'Aksi')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEFF4]">
                        {projects.map((p, index) => {
                            const client = clients.find(c => c.id === p.clientId);
                            return (
                            <tr key={p.id} className="hover:bg-[#F4F6F9]/50 transition-colors">
                                <td className="px-3 lg:px-4 py-2.5 text-center font-bold text-[#5A6A85]">{index + 1}</td>
                                <td className="px-3 lg:px-6 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-[#2A3547] text-sm leading-tight">{p.projectName}</p>
                                    </div>
                                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 leading-tight ${getStatusClass(p.status, config)}`}>
                                        {getSubStatusText(p)}
                                    </p>
                                </td>
                                <td className="px-3 lg:px-6 py-2.5">
                                    <div className="flex min-w-0 items-center gap-2 text-[#5A6A85] font-medium">
                                        <ProjectClientAvatar
                                            client={client}
                                            name={client?.name || p.clientName}
                                            className="h-8 w-8 text-[10px]"
                                        />
                                        <span className="min-w-0 truncate">{client?.name || p.clientName}</span>
                                    </div>
                                </td>
                                <td className="px-3 lg:px-6 py-2.5 text-[#5A6A85] font-medium whitespace-nowrap">{p.date ? new Date(p.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Belum ditentukan'}</td>
                                <td className="px-3 lg:px-6 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <ProgressBar progress={getDisplayProgress(p, config)} status={p.status} config={config} />
                                        <span className="text-xs font-bold text-[#5A6A85] min-w-[32px] text-right">{getDisplayProgress(p, config)}%</span>
                                    </div>
                                </td>
                                <td className="px-3 lg:px-6 py-2.5 text-[#5A6A85] font-medium max-w-[120px] lg:max-w-none truncate">{p.team.map(t => t.name.split(' ')[0]).join(', ') || '-'}</td>
                                <td className="px-3 lg:px-6 py-2.5">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => handleOpenDetailModal(p)} className="w-7 h-7 rounded-lg bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white flex items-center justify-center transition-all" title="Detail Acara Pernikahan"><EyeIcon className="w-3.5 h-3.5 flex-shrink-0" /></button>
                                        <button onClick={() => handleOpenForm('edit', p)} className="w-7 h-7 rounded-lg bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-white flex items-center justify-center transition-all" title="Edit Acara Pernikahan"><PencilIcon className="w-3.5 h-3.5 flex-shrink-0" /></button>
                                        <button onClick={() => handleProjectDelete(p.id)} className="w-7 h-7 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center transition-all" title="Hapus Acara Pernikahan"><Trash2Icon className="w-3.5 h-3.5 flex-shrink-0" /></button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export interface ProjectKanbanViewProps {
    projects: Project[];
    clients: Client[];
    handleOpenDetailModal: (project: Project) => void;
    draggedProjectId: string | null;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, projectId: string) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>, newStatus: string) => void;
    config: ProjectStatusConfig[];
}

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
    projects, clients, handleOpenDetailModal, draggedProjectId,
    handleDragStart, handleDragOver, handleDrop, config
}) => {
    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDF1F7]">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }} />
        </div>
    );

    return (
        <div className="flex items-start gap-3 md:gap-4 overflow-x-auto pb-3 overscroll-x-contain scroll-smooth projects-kanban-scroll hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            {config
                .filter(statusConfig => statusConfig.name !== 'Dibatalkan')
                .map(statusConfig => {
                    const status = statusConfig.name;
                    const columnProjects = projects.filter(p => p.status === status);
                    return (
                        <div
                            key={status}
                            className="w-64 min-w-[250px] md:w-72 flex-shrink-0 h-fit bg-[#F4F6F9] rounded-xl border border-[#EAEFF4] snap-start"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className="px-3 py-2 font-bold text-[#2A3547] border-b-2 flex justify-between items-center sticky top-0 bg-[#F4F6F9]/95 backdrop-blur-sm rounded-t-xl z-10" style={{ borderBottomColor: getStatusColor(status, config) }}>
                                <span className="text-xs sm:text-sm leading-tight truncate">{status}</span>
                                <span className="text-[11px] font-bold bg-white text-[#5A6A85] px-2 py-0.5 rounded-full shadow-xs shrink-0">{columnProjects.length}</span>
                            </div>
                            <div className="p-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {columnProjects.map(p => {
                                    const progress = getDisplayProgress(p, config);
                                    const client = clients.find(c => c.id === p.clientId);
                                    return (
                                        <div
                                            key={p.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, p.id)}
                                            onClick={() => handleOpenDetailModal(p)}
                                            className={`group relative h-fit cursor-grab overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white shadow-[0_3px_10px_rgba(30,55,90,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-accent/30 hover:shadow-[0_8px_20px_rgba(30,55,90,0.12)] active:cursor-grabbing ${draggedProjectId === p.id ? 'opacity-50 ring-2 ring-brand-accent' : 'opacity-100'}`}
                                        >
                                            <div className="h-1 w-full" style={{ backgroundColor: getStatusColor(p.status, config) }} />
                                            <div className="p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="line-clamp-2 min-w-0 flex-1 text-xs font-extrabold leading-snug text-[#26354D] sm:text-sm">
                                                        {p.projectName}
                                                    </p>
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#F4F7FC] px-1.5 py-1 text-[10px] font-semibold leading-none text-[#5A6A85]">
                                                        <CalendarDays className="h-3 w-3 text-[#7184A3]" />
                                                        {p.date ? new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Belum ditentukan'}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex min-w-0 items-center gap-2.5">
                                                    <ProjectClientAvatar
                                                        client={client}
                                                        name={client?.name || p.clientName}
                                                        className="h-10 w-10 text-xs shadow-sm"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A98AD]">Pengantin</p>
                                                        <p className="truncate text-xs font-bold text-[#34445D]">{client?.name || p.clientName}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex min-w-0 items-center">
                                                    <span
                                                        className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                                                        style={{ backgroundColor: `${getStatusColor(p.status, config)}15`, color: getStatusColor(p.status, config) }}
                                                        title={getSubStatusText(p)}
                                                    >
                                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: getStatusColor(p.status, config) }} />
                                                        <span className="truncate">{getSubStatusText(p)}</span>
                                                    </span>
                                                </div>

                                                <div className="mt-3 border-t border-[#EEF1F6] pt-2.5">
                                                    <div className="mb-1.5 flex items-center justify-between">
                                                        <span className="text-[10px] font-semibold text-[#7A889D]">Progress</span>
                                                        <span className="text-[11px] font-extrabold tabular-nums" style={{ color: getStatusColor(p.status, config) }}>{progress}%</span>
                                                    </div>
                                                    <ProgressBar progress={progress} status={p.status} config={config} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {columnProjects.length === 0 && (
                                    <p className="text-center py-3 text-[11px] text-[#5A6A85]/70">Kosong</p>
                                )}
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
};
