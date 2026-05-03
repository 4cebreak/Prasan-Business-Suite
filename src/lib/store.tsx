"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react"
import { 
  fetchStoreContext, serverAddAccount, serverUpdateAccount, serverDeleteAccount, 
  serverAddLedgerEntry, serverUpdateLedgerEntry, serverDeleteLedgerEntry, serverAddInvoice, serverUpdateInvoice, serverDeleteInvoice, 
  serverAddOrganization, serverUpdateOrganization, serverDeleteOrganization, serverAddRawMaterial, serverUpdateRawMaterial, serverDeleteRawMaterial, serverAddWIPGood, serverUpdateWIPGood, serverDeleteWIPGood, serverAddFinishedGood, serverUpdateFinishedGood, serverDeleteFinishedGood, serverPurgeInventory 
} from "@/app/actions"
import { toast } from "sonner"

export interface LedgerEntry {
  id: string
  date: string
  party: string
  station: string
  amount: number
  discount: number
  taxOrPaid: number
  netAmount: number
  items: string
  payment: number
  type: "bill" | "payment"
  paymentMode?: string
  invoiceId?: string
}

export interface Account {
  id: string
  name: string
  category: "Customer" | "Supplier"
  type: "Direct" | "Agency"
  station: string
  balance: number
  ledger: LedgerEntry[]
}

interface ItemRow {
  sno: number
  style: string
  brandName: string
  size: string
  qty: number
  rate: number
  amount: number
  finishedGoodId?: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  date: string
  customerName: string
  agencyName: string
  city?: string
  transport?: string
  transportCharges?: number
  remarks?: string
  marka?: string
  items: ItemRow[]
  subtotal: number
  discount: number
  taxes: number
  grandTotal: number
  status: "paid" | "pending" | "overdue"
  itemsDescription?: string
  ledgerEntryId?: string
}

export interface OrgConfig {
  id: string
  name: string
  gstNumber?: string
  panNumber?: string
  address?: string
  city?: string
  state?: string
  linkInvoicesLedgers?: boolean
  linkInvoicesChanged?: boolean
  inventoryEnabled?: boolean
  strictInventoryInvoicing?: boolean
  currency?: string
  invoiceShowBrandName?: boolean
  invoiceShowSize?: boolean
  invoiceBrandNameLabel?: string
  invoiceSizeLabel?: string
  taxMode?: string
  taxPercentage?: number
}


export interface RawMaterial {
  id: string
  date: string
  name: string
  type?: string
  qty: number
  qtyUsed?: number
  remarks?: string
  price: number
  total: number
  location?: string
  invNo?: string
  billerName?: string
  supplierName?: string
  ledgerEntryId?: string
}

export interface RawMaterialUsage {
  id: string
  wipId: string
  name: string
  qty: number
  cost: number
}

export interface ManufacturingProcess {
  id: string
  wipId: string
  name: string
  supplierName?: string
  qty: number
  price: number
  total: number
  ledgerEntryId?: string
}

export interface WIPGood {
  id: string
  date: string
  name: string
  status: string
  totalCost: number
  rawMaterials: RawMaterialUsage[]
  jobWorks: ManufacturingProcess[]
}

export interface FinishedGood {
  id: string
  date: string
  name: string
  qty: number
  size?: string
  cost: number
  remarks?: string
  location?: string
  wipBreakdown?: string
  supplierName?: string
  ledgerEntryId?: string
}

interface StoreState {
  accounts: Account[]
  invoices: Invoice[]
  addAccount: (account: Omit<Account, "id" | "balance" | "ledger">) => Promise<string>
  updateAccount: (id: string, account: Partial<Account>) => void
  addLedgerEntry: (accountId: string, entry: Omit<LedgerEntry, "id">) => Promise<string>
  updateLedgerEntry: (accountId: string, entryId: string, entry: Partial<LedgerEntry>) => void
  deleteLedgerEntry: (accountId: string, entryId: string) => void
  deleteAccount: (id: string) => void
  addInvoice: (invoice: Omit<Invoice, "id" | "status">) => Promise<string>
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  organizations: OrgConfig[]
  activeOrgId: string
  activeOrg: OrgConfig
  addOrganization: (name: string) => void
  updateOrganization: (id: string, updates: Partial<OrgConfig>) => void
  deleteOrganization: (id: string) => void
  organization: string
  setOrganization: (id: string) => void
  triggerEditInvoiceId: string | null
  setTriggerEditInvoiceId: (id: string | null) => void

  rawMaterials: RawMaterial[]
  wipGoods: WIPGood[]
  finishedGoods: FinishedGood[]
  addRawMaterial: (rm: Omit<RawMaterial, "id">) => Promise<string>
  updateRawMaterial: (id: string, updates: Partial<RawMaterial>) => void
  deleteRawMaterial: (id: string) => void
  addWIPGood: (wip: Omit<WIPGood, "id">) => Promise<string>
  updateWIPGood: (id: string, updates: Partial<WIPGood>) => void
  deleteWIPGood: (id: string) => void
  addFinishedGood: (fg: Omit<FinishedGood, "id">) => Promise<string>
  updateFinishedGood: (id: string, updates: Partial<FinishedGood>) => void
  deleteFinishedGood: (id: string) => void
  purgeInventory: () => void
  refreshData: () => Promise<void>
}

const StoreContext = createContext<StoreState | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<OrgConfig[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string>("abc-company")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [wipGoods, setWipGoods] = useState<WIPGood[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])

  const [triggerEditInvoiceId, setTriggerEditInvoiceId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const hasRestoredOrg = useRef(false)

  const refreshData = useCallback(async () => {
    try {
      const res = await fetchStoreContext(activeOrgId)
      setOrganizations(res.organizations.map((o: any) => ({
        ...o,
        gstNumber: o.gstNumber || undefined,
        panNumber: o.panNumber || undefined,
        address: o.address || undefined,
        city: o.city || undefined,
        state: o.state || undefined,
        linkInvoicesLedgers: o.linkInvoicesLedgers || false,
        linkInvoicesChanged: o.linkInvoicesChanged || false,
        inventoryEnabled: o.inventoryEnabled || false,
        strictInventoryInvoicing: o.strictInventoryInvoicing || false,
        currency: o.currency || "INR",
      })))
      
      const serializedAccounts = res.accounts.map((acc: any) => {
        const ledger = acc.ledger.map((l: any) => ({ ...l, date: typeof l.date === 'string' ? l.date : l.date.toISOString() }))
        const multiplier = acc.category === "Supplier" ? -1 : 1
        const recalculatedBalance = ledger.reduce((sum: number, e: any) => sum + ((e.amount || 0) - (e.discount || 0) + (e.taxOrPaid || 0) - (e.payment || 0)) * multiplier, 0)
        return {
          ...acc,
          balance: recalculatedBalance,
          ledger
        }
      })
      setAccounts(serializedAccounts as Account[])

      const serializedInvoices = res.invoices.map((inv: any) => ({
        ...inv,
        date: typeof inv.date === 'string' ? inv.date : inv.date.toISOString(),
      }))
      setInvoices(serializedInvoices as Invoice[])
      
      setRawMaterials(res.rawMaterials?.map((r: any) => ({ ...r, date: typeof r.date === 'string' ? r.date : r.date.toISOString() })) || [])
      setWipGoods(res.wipGoods?.map((w: any) => ({ ...w, date: typeof w.date === 'string' ? w.date : w.date.toISOString() })) || [])
      setFinishedGoods(res.finishedGoods?.map((f: any) => ({ ...f, date: typeof f.date === 'string' ? f.date : f.date.toISOString() })) || [])
    } catch (err) {
      console.error("Data refresh failed", err)
    }
  }, [activeOrgId])

  useEffect(() => {
    setIsLoaded(false)
    if (!hasRestoredOrg.current) {
      hasRestoredOrg.current = true
      const memoryOrgId = localStorage.getItem("jeans_active_org")
      if (memoryOrgId && memoryOrgId !== activeOrgId) {
        setActiveOrgId(memoryOrgId)
        return
      }
    }
    refreshData().then(() => setIsLoaded(true))
  }, [activeOrgId, refreshData])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("jeans_active_org", activeOrgId)
    }
  }, [activeOrgId, isLoaded])

  const addOrganization = async (name: string) => {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
    try {
      await serverAddOrganization(name, newId)
      await refreshData()
      setActiveOrgId(newId)
    } catch (err) {
      toast.error("Failed to add organization")
    }
  }

  const updateOrganization = async (id: string, updates: Partial<OrgConfig>) => {
    setOrganizations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)))
    try {
      await serverUpdateOrganization(id, updates)
    } catch (err) {
      toast.error("Update failed. Reverting...")
      await refreshData()
    }
  }

  const deleteOrganization = async (id: string) => {
    try {
      await serverDeleteOrganization(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addAccount = async (acc: Omit<Account, "id" | "balance" | "ledger">) => {
    try {
      const res = await serverAddAccount(activeOrgId, acc)
      await refreshData()
      return res.id
    } catch (err) {
      toast.error("Failed to add account")
      return ""
    }
  }

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
    try {
      await serverUpdateAccount(id, updates)
    } catch (err) {
      toast.error("Update failed. Reverting...")
      await refreshData()
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      await serverDeleteAccount(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addLedgerEntry = async (accountId: string, entry: Omit<LedgerEntry, "id">) => {
    try {
      const savedEntry = await serverAddLedgerEntry(accountId, entry)
      await refreshData()
      return savedEntry.id
    } catch (err) {
      toast.error("Failed to add entry")
      return ""
    }
  }

  const updateLedgerEntry = async (accountId: string, entryId: string, entry: Partial<LedgerEntry>) => {
    try {
      await serverUpdateLedgerEntry(entryId, entry)
      await refreshData()
    } catch (err) {
      toast.error("Update failed")
      await refreshData()
    }
  }

  const deleteLedgerEntry = async (accountId: string, entryId: string) => {
    try {
      await serverDeleteLedgerEntry(entryId)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addInvoice = async (inv: Omit<Invoice, "id" | "status">) => {
    try {
      const res = await serverAddInvoice(activeOrgId, inv)
      await refreshData()
      return res.id
    } catch (err) {
      toast.error("Failed to create invoice")
      return ""
    }
  }

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      await serverUpdateInvoice(id, updates)
      await refreshData()
    } catch (err) {
      toast.error("Update failed")
      await refreshData()
    }
  }

  const deleteInvoice = async (id: string) => {
    try {
      await serverDeleteInvoice(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addRawMaterial = async (rm: Omit<RawMaterial, "id">) => {
    try {
      const res = await serverAddRawMaterial(activeOrgId, rm)
      await refreshData()
      return res.id
    } catch (err) {
      toast.error("Failed to add raw material")
      return ""
    }
  }

  const updateRawMaterial = async (id: string, updates: Partial<RawMaterial>) => {
    try {
      await serverUpdateRawMaterial(id, updates)
      await refreshData()
    } catch (err) {
      toast.error("Update failed")
      await refreshData()
    }
  }

  const deleteRawMaterial = async (id: string) => {
    try {
      await serverDeleteRawMaterial(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addWIPGood = async (wip: Omit<WIPGood, "id">) => {
    try {
      const res = await serverAddWIPGood(activeOrgId, wip)
      await refreshData()
      return res.id
    } catch (err) {
      toast.error("Failed to add WIP good")
      return ""
    }
  }

  const updateWIPGood = async (id: string, updates: Partial<WIPGood>) => {
    try {
      await serverUpdateWIPGood(id, updates)
      await refreshData()
    } catch (err) {
      toast.error("Update failed")
      await refreshData()
    }
  }

  const deleteWIPGood = async (id: string) => {
    try {
      await serverDeleteWIPGood(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const addFinishedGood = async (fg: Omit<FinishedGood, "id">) => {
    try {
      const res = await serverAddFinishedGood(activeOrgId, fg)
      await refreshData()
      return res.id
    } catch (err) {
      toast.error("Failed to add finished good")
      return ""
    }
  }

  const updateFinishedGood = async (id: string, updates: Partial<FinishedGood>) => {
    try {
      await serverUpdateFinishedGood(id, updates)
      await refreshData()
    } catch (err) {
      toast.error("Update failed")
      await refreshData()
    }
  }

  const deleteFinishedGood = async (id: string) => {
    try {
      await serverDeleteFinishedGood(id)
      await refreshData()
    } catch (err) {
      toast.error("Deletion failed")
    }
  }

  const purgeInventory = async () => {
    try {
      await serverPurgeInventory(activeOrgId)
      await refreshData()
    } catch (err) {
      toast.error("Purge failed")
    }
  }

  if (!isLoaded) return null

  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || { id: "abc-company", name: "ABC Company" }

  return (
    <StoreContext.Provider value={{ 
      accounts, invoices, addAccount, updateAccount, deleteAccount, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, addInvoice, updateInvoice, deleteInvoice, 
      organizations, activeOrgId, activeOrg, addOrganization, updateOrganization, deleteOrganization,
      organization: activeOrg.name, setOrganization: setActiveOrgId,
      triggerEditInvoiceId, setTriggerEditInvoiceId,
      rawMaterials, wipGoods, finishedGoods, addRawMaterial, updateRawMaterial, deleteRawMaterial, addWIPGood, updateWIPGood, deleteWIPGood, addFinishedGood, updateFinishedGood, deleteFinishedGood, purgeInventory, refreshData
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useStore must be used within StoreProvider")
  return context
}
