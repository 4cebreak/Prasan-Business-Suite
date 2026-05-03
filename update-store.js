const fs = require('fs');
let content = fs.readFileSync('src/lib/store.tsx', 'utf8');

// 1. Add new actions to import
content = content.replace(
  'serverAddOrganization, serverUpdateOrganization, serverDeleteOrganization',
  'serverAddOrganization, serverUpdateOrganization, serverDeleteOrganization, serverAddRawMaterial, serverUpdateRawMaterial, serverDeleteRawMaterial, serverAddWIPGood, serverUpdateWIPGood, serverDeleteWIPGood, serverAddFinishedGood, serverUpdateFinishedGood, serverDeleteFinishedGood, serverPurgeInventory'
);

// 2. Update Account interface
content = content.replace(
  'type: "Direct Agent" | "Agency"',
  'category: "Customer" | "Supplier"\n  type: "Direct Agent" | "Agency"'
);

// 3. Update OrgConfig interface
content = content.replace(
  'linkInvoicesChanged?: boolean',
  'linkInvoicesChanged?: boolean\n  inventoryEnabled?: boolean'
);

// 4. Add Inventory Interfaces
const inventoryInterfaces = `
export interface RawMaterial {
  id: string
  date: string
  name: string
  type?: string
  qty: number
  remarks?: string
  price: number
  total: number
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
  supplierName?: string
  ledgerEntryId?: string
}
`;
content = content.replace('interface StoreState', inventoryInterfaces + '\ninterface StoreState');

// 5. Update StoreState
const storeStateAdditions = `
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
`;
content = content.replace('setTriggerEditInvoiceId: (id: string | null) => void', 'setTriggerEditInvoiceId: (id: string | null) => void\n' + storeStateAdditions);

// 6. Update StoreProvider states
const stateAdditions = `
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [wipGoods, setWipGoods] = useState<WIPGood[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])
`;
content = content.replace('const [invoices, setInvoices] = useState<Invoice[]>([])', 'const [invoices, setInvoices] = useState<Invoice[]>([])\n' + stateAdditions);

// 7. Update fetch parsing
const fetchAdditions = `
      setRawMaterials(res.rawMaterials?.map((r: any) => ({ ...r, date: typeof r.date === 'string' ? r.date : r.date.toISOString() })) || [])
      setWipGoods(res.wipGoods?.map((w: any) => ({ ...w, date: typeof w.date === 'string' ? w.date : w.date.toISOString() })) || [])
      setFinishedGoods(res.finishedGoods?.map((f: any) => ({ ...f, date: typeof f.date === 'string' ? f.date : f.date.toISOString() })) || [])
`;
content = content.replace('setIsLoaded(true)', fetchAdditions + '\n      setIsLoaded(true)');

// 8. Add implementation functions
const functionsAdditions = `
  const addRawMaterial = async (rm: Omit<RawMaterial, "id">) => {
    const newId = Date.now().toString()
    setRawMaterials(prev => [...prev, { ...rm, id: newId }])
    await serverAddRawMaterial(activeOrgId, { ...rm, id: newId })
    return newId
  }

  const updateRawMaterial = async (id: string, updates: Partial<RawMaterial>) => {
    setRawMaterials(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    await serverUpdateRawMaterial(id, updates)
  }

  const deleteRawMaterial = async (id: string) => {
    setRawMaterials(prev => prev.filter(r => r.id !== id))
    await serverDeleteRawMaterial(id)
  }

  const addWIPGood = async (wip: Omit<WIPGood, "id">) => {
    const newId = Date.now().toString()
    setWipGoods(prev => [...prev, { ...wip, id: newId }])
    await serverAddWIPGood(activeOrgId, { ...wip, id: newId })
    return newId
  }

  const updateWIPGood = async (id: string, updates: Partial<WIPGood>) => {
    setWipGoods(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    await serverUpdateWIPGood(id, updates)
  }

  const deleteWIPGood = async (id: string) => {
    setWipGoods(prev => prev.filter(w => w.id !== id))
    await serverDeleteWIPGood(id)
  }

  const addFinishedGood = async (fg: Omit<FinishedGood, "id">) => {
    const newId = Date.now().toString()
    setFinishedGoods(prev => [...prev, { ...fg, id: newId }])
    await serverAddFinishedGood(activeOrgId, { ...fg, id: newId })
    return newId
  }

  const updateFinishedGood = async (id: string, updates: Partial<FinishedGood>) => {
    setFinishedGoods(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    await serverUpdateFinishedGood(id, updates)
  }

  const deleteFinishedGood = async (id: string) => {
    setFinishedGoods(prev => prev.filter(f => f.id !== id))
    await serverDeleteFinishedGood(id)
  }

  const purgeInventory = async () => {
    setRawMaterials([])
    setWipGoods([])
    setFinishedGoods([])
    await serverPurgeInventory(activeOrgId)
  }
`;
content = content.replace('if (!isLoaded)', functionsAdditions + '\n  if (!isLoaded)');

// 9. Update Provider Value
content = content.replace(
  'triggerEditInvoiceId, setTriggerEditInvoiceId',
  'triggerEditInvoiceId, setTriggerEditInvoiceId,\n      rawMaterials, wipGoods, finishedGoods, addRawMaterial, updateRawMaterial, deleteRawMaterial, addWIPGood, updateWIPGood, deleteWIPGood, addFinishedGood, updateFinishedGood, deleteFinishedGood, purgeInventory'
);

fs.writeFileSync('src/lib/store.tsx', content);
