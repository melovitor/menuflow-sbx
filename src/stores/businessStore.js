import { create } from 'zustand'

export const useBusinessStore = create((set) => ({
  businesses: [],
  currentBusiness: null,
  setBusinesses: (businesses) => set({ businesses }),
  setCurrentBusiness: (business) => set({ currentBusiness: business }),
}))
