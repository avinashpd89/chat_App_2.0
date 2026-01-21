import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useConversation = create(
    persist(
        (set) => ({
            selectedConversation: null,
            setSelectedConversation: (selectedConversation) => {
                const idStr = selectedConversation?._id?.toString();
                set((state) => ({
                    selectedConversation,
                    unreadCounts: idStr ? {
                        ...(state.unreadCounts || {}),
                        [idStr]: 0
                    } : (state.unreadCounts || {})
                }));
            },
            message: [],
            setMessage: (message) => {
                if (typeof message === 'function') {
                    set((state) => ({ message: message(state.message) }));
                } else {
                    set({ message });
                }
            },
            users: [],
            setUsers: (users) => {
                if (typeof users === 'function') {
                    set((state) => ({ users: users(state.users) }));
                } else {
                    set({ users });
                }
            },
            groups: [],
            setGroups: (groups) => {
                if (typeof groups === 'function') {
                    set((state) => ({ groups: groups(state.groups) }));
                } else {
                    set({ groups });
                }
            },
            unreadCounts: {},
            lastMessages: {},
            setUnreadCounts: (unreadCounts) => set({ unreadCounts }),
            incrementUnreadCount: (userId) => {
                if (!userId) return;
                const idStr = userId.toString();
                set((state) => ({
                    unreadCounts: {
                        ...(state.unreadCounts || {}),
                        [idStr]: ((state.unreadCounts && state.unreadCounts[idStr]) || 0) + 1
                    }
                }));
            },
            updateLastMessage: (userId, text, time) => {
                if (!userId) return;
                const idStr = userId.toString();
                set((state) => ({
                    lastMessages: {
                        ...(state.lastMessages || {}),
                        [idStr]: { text, time }
                    }
                }));
            },
            clearLastMessage: (userId) => {
                if (!userId) return;
                const idStr = userId.toString();
                set((state) => {
                    const newLastMessages = { ...(state.lastMessages || {}) };
                    delete newLastMessages[idStr];
                    return { lastMessages: newLastMessages };
                });
            },
        }),
        {
            name: 'chat-metadata',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ unreadCounts: state.unreadCounts, lastMessages: state.lastMessages }),
        }
    )
)

export default useConversation;