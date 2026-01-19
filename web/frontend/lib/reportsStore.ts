import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export interface ReportSection {
    id: string;
    title: string;
    content: string;
    order: number;
    ai_generated: boolean;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    extra?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ChartConfig {
    xKey: string;
    yKey: string;
    colors: string[];
}

export interface ChartData {
    id: string;
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: ChartDataPoint[];
    config: ChartConfig;
}

export interface Report {
    id: string;
    title: string;
    template_type: string;
    status: 'draft' | 'generating' | 'completed' | 'exported';
    sections: ReportSection[];
    charts_data: ChartData[];
    content: string;
    content_html: string;
    export_format: string | null;
    exported_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    name_cn: string;
    description: string;
    icon: string;
    sections: { title: string; placeholder: string }[];
}

// =============================================================================
// Store Interface
// =============================================================================

interface ReportsState {
    // Reports list
    reports: Report[];
    setReports: (reports: Report[]) => void;
    addReport: (report: Report) => void;
    updateReportInList: (report: Report) => void;
    removeReport: (id: string) => void;

    // Current report
    currentReport: Report | null;
    setCurrentReport: (report: Report | null) => void;

    // Templates
    templates: ReportTemplate[];
    setTemplates: (templates: ReportTemplate[]) => void;

    // Section editing
    editingSectionId: string | null;
    setEditingSectionId: (id: string | null) => void;

    // AI generation state
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;
    generatingSectionId: string | null;
    setGeneratingSectionId: (id: string | null) => void;
    streamingContent: string;
    setStreamingContent: (content: string) => void;
    appendStreamingContent: (chunk: string) => void;
    clearStreamingContent: () => void;

    // Export state
    isExporting: boolean;
    setIsExporting: (exporting: boolean) => void;
    exportFormat: 'pdf' | 'docx' | 'md' | null;
    setExportFormat: (format: 'pdf' | 'docx' | 'md' | null) => void;

    // Chart builder state
    showChartBuilder: boolean;
    setShowChartBuilder: (show: boolean) => void;
    editingChartId: string | null;
    setEditingChartId: (id: string | null) => void;

    // UI state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    isSaving: boolean;
    setIsSaving: (saving: boolean) => void;

    // Dialogs
    showNewReportDialog: boolean;
    setShowNewReportDialog: (show: boolean) => void;
    showExportModal: boolean;
    setShowExportModal: (show: boolean) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useReportsStore = create<ReportsState>((set) => ({
    // Reports
    reports: [],
    setReports: (reports) => set({ reports }),
    addReport: (report) =>
        set((state) => ({ reports: [report, ...state.reports] })),
    updateReportInList: (report) =>
        set((state) => ({
            reports: state.reports.map((r) =>
                r.id === report.id ? report : r
            ),
        })),
    removeReport: (id) =>
        set((state) => ({
            reports: state.reports.filter((r) => r.id !== id),
        })),

    // Current report
    currentReport: null,
    setCurrentReport: (report) => set({ currentReport: report }),

    // Templates
    templates: [],
    setTemplates: (templates) => set({ templates }),

    // Section editing
    editingSectionId: null,
    setEditingSectionId: (id) => set({ editingSectionId: id }),

    // AI generation state
    isGenerating: false,
    setIsGenerating: (generating) => set({ isGenerating: generating }),
    generatingSectionId: null,
    setGeneratingSectionId: (id) => set({ generatingSectionId: id }),
    streamingContent: '',
    setStreamingContent: (content) => set({ streamingContent: content }),
    appendStreamingContent: (chunk) =>
        set((state) => ({
            streamingContent: state.streamingContent + chunk,
        })),
    clearStreamingContent: () => set({ streamingContent: '' }),

    // Export state
    isExporting: false,
    setIsExporting: (exporting) => set({ isExporting: exporting }),
    exportFormat: null,
    setExportFormat: (format) => set({ exportFormat: format }),

    // Chart builder state
    showChartBuilder: false,
    setShowChartBuilder: (show) => set({ showChartBuilder: show }),
    editingChartId: null,
    setEditingChartId: (id) => set({ editingChartId: id }),

    // UI state
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    error: null,
    setError: (error) => set({ error }),
    isSaving: false,
    setIsSaving: (saving) => set({ isSaving: saving }),

    // Dialogs
    showNewReportDialog: false,
    setShowNewReportDialog: (show) => set({ showNewReportDialog: show }),
    showExportModal: false,
    setShowExportModal: (show) => set({ showExportModal: show }),
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectReportById = (id: string) => (state: ReportsState) =>
    state.reports.find((r) => r.id === id);

export const selectDraftReports = (state: ReportsState) =>
    state.reports.filter((r) => r.status === 'draft');

export const selectCompletedReports = (state: ReportsState) =>
    state.reports.filter((r) => r.status === 'completed' || r.status === 'exported');

export const selectCurrentSection = (state: ReportsState) => {
    if (!state.currentReport || !state.editingSectionId) return null;
    return state.currentReport.sections.find((s) => s.id === state.editingSectionId);
};
