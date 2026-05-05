"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react"
import { 
  fetchStoreContext, serverAddAccount, serverUpdateAccount, serverDeleteAccount, 
  serverAddLedgerEntry, serverUpdateLedgerEntry, serverDeleteLedgerEntry, serverAddInvoice, serverUpdateInvoice, serverDeleteInvoice, 
  serverAddOrganization, serverUpdateOrganization, serverDeleteOrganization, serverAddRawMaterial, serverUpdateRawMaterial, serverDeleteRawMaterial, 
  serverAddWIPGood, serverUpdateWIPGood, serverDeleteWIPGood, serverAddFinishedGood, serverUpdateFinishedGood, serverDeleteFinishedGood, 
  serverPurgeInventory, serverListInvoices, serverListAccounts, serverListInventory, validateSession, checkAndMigrateDB
} from "@/app/actions"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { 
  OrgConfig, Account, LedgerEntry, Invoice, RawMaterial, WIPGood, FinishedGood 
} from "@/types"

export type { OrgConfig, Account, LedgerEntry, Invoice, RawMaterial, WIPGood, FinishedGood }

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

interface StoreState {
  organization: string
  activeOrg: OrgConfig
  activeOrgId: string
  organizations: OrgConfig[]
  
  accounts: Account[]
  invoices: Invoice[]
  invoicePagination: { total: number, page: number, pageSize: number }
  
  rawMaterials: RawMaterial[]
  wipGoods: WIPGood[]
  finishedGoods: FinishedGood[]
  
  refreshData: () => Promise<void>
  loadInvoices: (page?: number) => Promise<void>
  loadInventory: () => Promise<void>
  
  addAccount: (acc: any) => Promise<string>
  updateAccount: (id: string, updates: any) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addLedgerEntry: (accountId: string, entry: any) => Promise<string>
  updateLedgerEntry: (accountId: string, entryId: string, updates: any) => Promise<void>
  deleteLedgerEntry: (accountId: string, entryId: string) => Promise<void>
  
  addInvoice: (payload: any) => Promise<string>
  updateInvoice: (id: string, updates: any) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  
  addOrganization: (name: string) => Promise<void>
  updateOrganization: (id: string, updates: Partial<OrgConfig>) => Promise<void>
  deleteOrganization: (id: string) => Promise<void>
  
  setOrganization: (id: string) => void
  triggerEditInvoiceId: string | null
  setTriggerEditInvoiceId: (id: string | null) => void

  addRawMaterial: (rm: any) => Promise<string>
  updateRawMaterial: (id: string, updates: any) => void
  deleteRawMaterial: (id: string) => void
  addWIPGood: (wip: any) => Promise<string>
  updateWIPGood: (id: string, updates: any) => void
  deleteWIPGood: (id: string) => void
  addFinishedGood: (fg: any) => Promise<string>
  updateFinishedGood: (id: string, updates: any) => void
  deleteFinishedGood: (id: string) => void
  purgeInventory: () => void
}

const StoreContext = createContext<StoreState | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<OrgConfig[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string>("abc-company")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicePagination, setInvoicePagination] = useState({ total: 0, page: 1, pageSize: 20 })

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [wipGoods, setWipGoods] = useState<WIPGood[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])

  const [triggerEditInvoiceId, setTriggerEditInvoiceId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const hasRestoredOrg = useRef(false)

  const loadInvoices = useCallback(async (page: number = 1) => {
    try {
      const res = await serverListInvoices(activeOrgId, page)
      setInvoices(res.data)
      setInvoicePagination({ total: res.total, page: res.page, pageSize: res.pageSize })
    } catch (err) {
      console.error("Failed to load invoices", err)
    }
  }, [activeOrgId])

  const loadInventory = useCallback(async () => {
    try {
      const res = await serverListInventory(activeOrgId)
      setRawMaterials(res.rawMaterials as any)
      setWipGoods(res.wipGoods as any)
      setFinishedGoods(res.finishedGoods as any)
    } catch (err) {
      console.error("Failed to load inventory", err)
    }
  }, [activeOrgId])

  const refreshData = useCallback(async () => {
    try {
      const res = await fetchStoreContext(activeOrgId)
      setOrganizations(res.organizations as any)
      
      const accs = await serverListAccounts(activeOrgId)
      setAccounts(accs as any)
      
      await loadInvoices(1)
      await loadInventory()
    } catch (err: any) {
      if (err.message.includes("Unauthorized")) {
         const session = await validateSession()
         if (session?.isAuthenticated && session.orgId && session.orgId !== activeOrgId) {
            setActiveOrgId(session.orgId)
            return
         }
      }
      console.error("Data refresh failed", err)
    }
  }, [activeOrgId, loadInvoices, loadInventory])

  useEffect(() => {
    async function init() {
      // Auto-heal legacy data if detected
      try {
        const migration = await checkAndMigrateDB()
        if (migration.success && migration.migrated) {
          toast.success("Database optimized for precision", {
            description: "Legacy currency data has been converted to the new format."
          })
        }
      } catch (e) {
        console.error("Migration check failed", e)
      }

      if (!hasRestoredOrg.current) {
        hasRestoredOrg.current = true
        try {
          const session = await validateSession()
          if (session?.isAuthenticated && session.orgId) {
            setActiveOrgId(session.orgId)
            setIsLoaded(true)
            return
          }
        } catch (e) {}

        const memoryOrgId = localStorage.getItem("jeans_active_org")
        if (memoryOrgId && memoryOrgId !== activeOrgId) {
          setActiveOrgId(memoryOrgId)
          return
        }
      }
      
      await refreshData()
      setIsLoaded(true)
    }
    init()
  }, [activeOrgId, refreshData])

  useEffect(() => {
    if (isLoaded) localStorage.setItem("jeans_active_org", activeOrgId)
  }, [activeOrgId, isLoaded])

  // --- MUTATIONS ---

  // Account & Ledger Mutations
  const addAccount = async (acc: any) => {
    const res = await serverAddAccount(activeOrgId, acc)
    await refreshData()
    return res.id
  }
  const updateAccount = async (id: string, updates: any) => {
    await serverUpdateAccount(id, updates)
    await refreshData()
  }
  const deleteAccount = async (id: string) => {
    await serverDeleteAccount(id)
    await refreshData()
  }
  const addLedgerEntry = async (accId: string, entry: any) => {
    const res = await serverAddLedgerEntry(accId, entry)
    await refreshData()
    return res.id
  }
  const updateLedgerEntry = async (accId: string, entryId: string, updates: any) => {
    await serverUpdateLedgerEntry(accId, entryId, updates)
    await refreshData()
  }
  const deleteLedgerEntry = async (accId: string, entryId: string) => {
    await serverDeleteLedgerEntry(accId, entryId)
    await refreshData()
  }

  const addInvoice = async (payload: any) => {
    const res = await serverAddInvoice(activeOrgId, payload)
    await refreshData()
    return res.id
  }

  const updateInvoice = async (id: string, updates: any) => {
    await serverUpdateInvoice(id, updates)
    await refreshData()
  }

  const deleteInvoice = async (id: string) => {
    await serverDeleteInvoice(id)
    await refreshData()
  }

  const addOrganization = async (name: string) => {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
    await serverAddOrganization(name, newId)
    setActiveOrgId(newId)
    await refreshData()
  }

  const updateOrganization = async (id: string, updates: any) => {
    await serverUpdateOrganization(id, updates)
    await refreshData()
  }

  const { logout } = useAuth()
  const deleteOrganization = async (id: string) => {
    await serverDeleteOrganization(id)
    if (id === activeOrgId) logout()
    else await refreshData()
  }

  // Inventory Mutations
  const addRawMaterial = async (rm: any) => {
    const res = await serverAddRawMaterial(activeOrgId, rm)
    await loadInventory()
    return res.id
  }
  const updateRawMaterial = async (id: string, updates: any) => {
    await serverUpdateRawMaterial(id, updates)
    await loadInventory()
  }
  const deleteRawMaterial = async (id: string) => {
    await serverDeleteRawMaterial(id)
    await loadInventory()
  }
  const addWIPGood = async (wip: any) => {
    const res = await serverAddWIPGood(activeOrgId, wip)
    await loadInventory()
    return res.id
  }
  const updateWIPGood = async (id: string, updates: any) => {
    await serverUpdateWIPGood(id, updates)
    await loadInventory()
  }
  const deleteWIPGood = async (id: string) => {
    await serverDeleteWIPGood(id)
    await loadInventory()
  }
  const addFinishedGood = async (fg: any) => {
    const res = await serverAddFinishedGood(activeOrgId, fg)
    await loadInventory()
    return res.id
  }
  const updateFinishedGood = async (id: string, updates: any) => {
    await serverUpdateFinishedGood(id, updates)
    await loadInventory()
  }
  const deleteFinishedGood = async (id: string) => {
    await serverDeleteFinishedGood(id)
    await loadInventory()
  }
  const purgeInventory = async () => {
    await serverPurgeInventory(activeOrgId)
    await loadInventory()
  }

  if (!isLoaded) return null

  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || { id: "abc-company", name: "ABC Company" }

  return (
    <StoreContext.Provider value={{ 
      accounts, invoices, addAccount, updateAccount, deleteAccount, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, addInvoice, updateInvoice, deleteInvoice, 
      organizations, activeOrgId, activeOrg, addOrganization, updateOrganization, deleteOrganization,
      organization: activeOrg.name, setOrganization: setActiveOrgId,
      triggerEditInvoiceId, setTriggerEditInvoiceId,
      rawMaterials, wipGoods, finishedGoods, addRawMaterial, updateRawMaterial, deleteRawMaterial, addWIPGood, updateWIPGood, deleteWIPGood, addFinishedGood, updateFinishedGood, deleteFinishedGood, purgeInventory, refreshData,
      invoicePagination, loadInvoices, loadInventory
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
