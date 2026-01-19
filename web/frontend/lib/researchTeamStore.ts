/**
 * State management for Research Team module.
 *
 * Uses zustand with localStorage persistence to maintain team configuration
 * across page navigations and browser sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export type AgentCluster = 'reasoning' | 'information' | 'production' | 'coordination' | 'custom';

interface ResearchTeamState {
    // Selected cluster filter
    selectedCluster: AgentCluster | 'all';
    setSelectedCluster: (cluster: AgentCluster | 'all') => void;

    // Selected agent profile ID
    selectedProfileId: string | null;
    setSelectedProfileId: (id: string | null) => void;

    // Editing state
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;

    // Clear state
    clearSelection: () => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useResearchTeamStore = create<ResearchTeamState>()(
    persist(
        (set) => ({
            // Cluster filter
            selectedCluster: 'all',
            setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),

            // Selected profile
            selectedProfileId: null,
            setSelectedProfileId: (id) => set({ selectedProfileId: id }),

            // Editing
            isEditing: false,
            setIsEditing: (editing) => set({ isEditing: editing }),

            // Clear
            clearSelection: () =>
                set({
                    selectedProfileId: null,
                    isEditing: false,
                }),
        }),
        {
            name: 'nexen-research-team', // localStorage key
            partialize: (state) => ({
                // Only persist these fields
                selectedCluster: state.selectedCluster,
                selectedProfileId: state.selectedProfileId,
            }),
        }
    )
);
