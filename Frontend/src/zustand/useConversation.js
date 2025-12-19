import { create } from 'zustand'

const useConversation = create((set) => ({
    selectedConversation: null,
    setSelectedConversation: (selectedConversation) => set({ selectedConversation }),
    message: [],
    setMessage: (message) => set({ message }),
    users: [],
    setUsers: (users) => set({ users }),
}))

export default useConversation;