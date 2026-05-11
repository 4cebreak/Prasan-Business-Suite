"use client"

import { useState } from "react"
import { useStore, RawMaterial, WIPGood, FinishedGood } from "@/lib/store"
import { Package, Truck, Hammer, Box, Plus, Trash2, ArrowRight, ChevronDown, ChevronUp, Search, Download, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn, formatCurrency as globalFormatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Utility - Simplified number format
const getFormatCurrency = (currency?: string) => (amount: number) => globalFormatCurrency(amount)

const formatPDFCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)
}

export function InventoryPage() {
  const { 
    rawMaterials, wipGoods, finishedGoods, 
    addRawMaterial, deleteRawMaterial, updateRawMaterial,
    addWIPGood, updateWIPGood, deleteWIPGood,
    addFinishedGood, updateFinishedGood, deleteFinishedGood,
    accounts, addAccount, addLedgerEntry
  } = useStore()

  const [activeTab, setActiveTab] = useState<"raw" | "wip" | "finished">("raw")

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
        <Button 
          variant={activeTab === "raw" ? "default" : "ghost"} 
          onClick={() => setActiveTab("raw")}
          className={cn("rounded-xl px-6 gap-2", activeTab === "raw" && "shadow-lg shadow-primary/25")}
        >
          <Truck className="w-5 h-5" /> Raw Materials
        </Button>
        <Button 
          variant={activeTab === "wip" ? "default" : "ghost"} 
          onClick={() => setActiveTab("wip")}
          className={cn("rounded-xl px-6 gap-2", activeTab === "wip" && "shadow-lg shadow-primary/25")}
        >
          <Hammer className="w-5 h-5" /> Work in Progress
        </Button>
        <Button 
          variant={activeTab === "finished" ? "default" : "ghost"} 
          onClick={() => setActiveTab("finished")}
          className={cn("rounded-xl px-6 gap-2", activeTab === "finished" && "shadow-lg shadow-primary/25")}
        >
          <Box className="w-5 h-5" /> Finished Goods
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "raw" && <RawMaterialsTab />}
        {activeTab === "wip" && <WIPTab />}
        {activeTab === "finished" && <FinishedGoodsTab />}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// RAW MATERIALS TAB
// -------------------------------------------------------------------------
function RawMaterialsTab() {
  const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, accounts, addAccount, addLedgerEntry, activeOrg } = useStore()
  const formatCurrency = getFormatCurrency(activeOrg?.currency)
  
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [qty, setQty] = useState("")
  const [price, setPrice] = useState("")
  const [remarks, setRemarks] = useState("")
  const [location, setLocation] = useState("")
  const [invNo, setInvNo] = useState("")
  
  // Supplier Ledger Logic
  const suppliers = accounts.filter(a => a.category === "Supplier")
  const [supplierName, setSupplierName] = useState("")
  const [supplierType, setSupplierType] = useState<"Direct" | "Agency">("Agency")
  const [isNewSupplier, setIsNewSupplier] = useState(false)
  const [billerName, setBillerName] = useState("")

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editRm, setEditRm] = useState<RawMaterial | null>(null)
  const [rmSearch, setRMSearch] = useState("")
  
  const total = (Number(qty) || 0) * (Number(price) || 0)

  const selectedExistingSupplier = suppliers.find(s => s.name === supplierName)
  const isSelectedExistingAgency = !isNewSupplier && selectedExistingSupplier?.type === "Agency"
  const showBillerName = (isNewSupplier && supplierType === "Agency") || isSelectedExistingAgency

  const totalRMAvailableCost = rawMaterials.reduce((sum, rm) => sum + (rm.qty - (rm.qtyUsed || 0)) * rm.price, 0)
  const totalRMUsedCost = rawMaterials.reduce((sum, rm) => sum + (rm.qtyUsed || 0) * rm.price, 0)
  const totalRMPurchased = rawMaterials.reduce((sum, rm) => sum + rm.total, 0)

  const handleAddInward = async () => {
    if (!name || !qty || !price || !supplierName) {
      toast.error("Please fill all required fields")
      return
    }

    let targetAccountId = undefined
    
    // Ledger integration
    if (isNewSupplier) {
      targetAccountId = await addAccount({
        name: supplierName,
        category: "Supplier",
        type: supplierType,
        station: ""
      })
    } else {
      const existing = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
      if (existing) targetAccountId = existing.id
      else {
        targetAccountId = await addAccount({
          name: supplierName,
          category: "Supplier",
          type: "Agency",
          station: ""
        })
      }
    }

    // Add Raw Material
    const rmId = await addRawMaterial({
      date: new Date(date).toISOString(),
      name,
      type,
      qty: Number(qty),
      qtyUsed: 0,
      price: Number(price),
      total,
      remarks,
      location,
      invNo,
      billerName: showBillerName ? billerName : undefined,
      supplierName: supplierName,
    })

    // Add Ledger Entry
    if (targetAccountId) {
      await addLedgerEntry(targetAccountId, {
        date: new Date(date).toISOString(),
        party: `${invNo || "Inward"} - ${name}${showBillerName && billerName ? ` (Biller: ${billerName})` : ""}`,
        station: "",
        amount: total,
        discount: 0,
        taxOrPaid: 0,
        netAmount: total,
        items: `${qty} x ${name}`,
        payment: 0,
        type: "bill",
      })
    }

    toast.success("Raw material added successfully!")
    setIsOpen(false)
    setName(""); setType(""); setQty(""); setPrice(""); setRemarks(""); setLocation(""); setInvNo(""); setBillerName("")
  }

  const handleUpdateRm = async () => {
    if (!editRm) return
    await updateRawMaterial(editRm.id, editRm)
    setEditOpen(false)
    toast.success("Raw material updated")
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text("Raw Materials Inventory", 14, 15)
    
    const tableData = rawMaterials.map(rm => [
      new Date(rm.date).toLocaleDateString(),
      rm.name,
      rm.supplierName || "Self / Unknown",
      rm.location || "-",
      rm.qty.toString(),
      (rm.qtyUsed || 0).toString(),
      (rm.qty - (rm.qtyUsed || 0)).toString(),
      formatPDFCurrency(rm.price),
      formatPDFCurrency(rm.total)
    ])

    autoTable(doc, {
      startY: 20,
      head: [["Date", "Material", "Supplier", "Location", "Total Qty", "Used Qty", "Avail Qty", "Price", "Total Cost"]],
      body: tableData,
    })

    doc.save("RawMaterials_Inventory.pdf")
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Available Materials Value</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalRMAvailableCost)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Allocated / Used Value</p>
          <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(totalRMUsedCost)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Total Purchased Value</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalRMPurchased)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Inward Raw Materials</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search materials..." value={rmSearch} onChange={e => setRMSearch(e.target.value)} className="pl-9 rounded-xl h-10 w-48" />
          </div>
          <Button variant="outline" className="rounded-xl h-10" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Inward</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Raw Material (Inward)</DialogTitle>
                <DialogDescription>Record new raw materials purchased from suppliers.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 flex items-center gap-2 bg-muted p-3 rounded-xl border border-border">
                  <input type="checkbox" id="newSupplier" checked={isNewSupplier} onChange={e => setIsNewSupplier(e.target.checked)} className="w-4 h-4 rounded text-primary" />
                  <label htmlFor="newSupplier" className="text-sm font-medium cursor-pointer">New Supplier?</label>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier Name</label>
                  {isNewSupplier ? (
                    <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="rounded-xl" />
                  ) : (
                    <select value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="">Select Supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} ({s.type})</option>)}
                    </select>
                  )}
                </div>

                {isNewSupplier && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier Type</label>
                    <select value={supplierType} onChange={e => setSupplierType(e.target.value as "Direct" | "Agency")} className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="Direct">Direct</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                )}

                {showBillerName && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Biller Name</label>
                    <Input value={billerName} onChange={e => setBillerName(e.target.value)} className="rounded-xl" placeholder="If agency, enter biller name" />
                  </div>
                )}

                <div className="col-span-2 border-t border-border my-2"></div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice No.</label>
                  <Input value={invNo} onChange={e => setInvNo(e.target.value)} className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Material Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type/Category</label>
                  <Input value={type} onChange={e => setType(e.target.value)} className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Stored</label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Quantity</label>
                  <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="rounded-xl" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price per unit</label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Cost</label>
                  <Input type="number" value={total} readOnly className="rounded-xl bg-muted" />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Remarks</label>
                  <Input value={remarks} onChange={e => setRemarks(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button onClick={handleAddInward} className="rounded-xl">Save Inward</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="p-4 text-left font-semibold text-muted-foreground">Date / Inv</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Material</th>
              <th className="p-4 text-left font-semibold text-muted-foreground">Location</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Total Qty</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Qty Used</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Price</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredRM = rawMaterials.filter(rm => {
                if (!rmSearch) return true
                const q = rmSearch.toLowerCase()
                return rm.name.toLowerCase().includes(q) || (rm.supplierName || "").toLowerCase().includes(q) || (rm.invNo || "").toLowerCase().includes(q) || (rm.location || "").toLowerCase().includes(q)
              })
              return filteredRM.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No raw materials found.</td></tr>
            ) : (
              filteredRM.map(rm => (
                <tr 
                  key={rm.id} 
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { setEditRm(rm); setEditOpen(true) }}
                >
                  <td className="p-4">
                    <div>{new Date(rm.date).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground">{rm.invNo || "No Inv"}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{rm.name}</div>
                    <div className="text-xs text-muted-foreground">{rm.type}</div>
                  </td>
                  <td className="p-4">{rm.location || "-"}</td>
                  <td className="p-4 text-right font-medium">{rm.qty}</td>
                  <td className="p-4 text-right text-accent font-medium">{rm.qtyUsed || 0}</td>
                  <td className="p-4 text-right">
                    <div>{formatCurrency(rm.price)}</div>
                    <div className="text-xs text-muted-foreground font-semibold">{formatCurrency(rm.total)} total</div>
                  </td>
                </tr>
              ))
            )})()}
          </tbody>
        </table>
      </div>

      {/* Edit/View Raw Material Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Raw Material</DialogTitle>
            <DialogDescription>Modify details or delete this raw material record.</DialogDescription>
          </DialogHeader>
          {editRm && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Material Name</label>
                <Input value={editRm.name} onChange={e => setEditRm({...editRm, name: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input value={editRm.location || ""} onChange={e => setEditRm({...editRm, location: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inv No</label>
                <Input value={editRm.invNo || ""} onChange={e => setEditRm({...editRm, invNo: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Quantity</label>
                <Input type="number" value={editRm.qty} onChange={e => setEditRm({...editRm, qty: Number(e.target.value), total: Number(e.target.value) * editRm.price})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity Used</label>
                <Input type="number" value={editRm.qtyUsed || 0} onChange={e => setEditRm({...editRm, qtyUsed: Number(e.target.value)})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price per unit</label>
                <Input type="number" value={editRm.price} onChange={e => setEditRm({...editRm, price: Number(e.target.value), total: editRm.qty * Number(e.target.value)})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Cost</label>
                <Input type="number" value={editRm.total} readOnly className="rounded-xl bg-muted" />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button 
              variant="destructive" 
              className="rounded-xl" 
              onClick={() => {
                if (editRm && confirm("Are you sure you want to delete this raw material?")) {
                  deleteRawMaterial(editRm.id)
                  setEditOpen(false)
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2"/> Delete
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => setEditOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
              <Button onClick={handleUpdateRm} className="rounded-xl">Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// -------------------------------------------------------------------------
// WORK IN PROGRESS TAB
// -------------------------------------------------------------------------
function WIPTab() {
  const { wipGoods, addWIPGood, updateWIPGood, deleteWIPGood, addFinishedGood, rawMaterials, accounts, addAccount, addLedgerEntry, activeOrg } = useStore()
  const formatCurrency = getFormatCurrency(activeOrg?.currency)
  
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newWipName, setNewWipName] = useState("")
  const [newWipDate, setNewWipDate] = useState(() => new Date().toISOString().split("T")[0])
  const [wipSearch, setWipSearch] = useState("")

  const totalWIPBatches = wipGoods.length
  const totalWIPCost = wipGoods.reduce((sum, wip) => sum + wip.totalCost, 0)
  const averageCostPerBatch = totalWIPBatches > 0 ? totalWIPCost / totalWIPBatches : 0

  const handleCreateWIP = async () => {
    if (!newWipName) return
    await addWIPGood({
      name: newWipName,
      date: new Date(newWipDate).toISOString(),
      status: "Started",
      totalCost: 0,
      rawMaterials: [],
      jobWorks: []
    })
    setIsNewOpen(false)
    setNewWipName("")
    toast.success("WIP started")
  }

  const exportOverallPDF = () => {
    const doc = new jsPDF()
    doc.text("Active Production (WIP)", 14, 15)
    
    const tableData = wipGoods.map(wip => [
      new Date(wip.date).toLocaleDateString(),
      wip.name,
      wip.status,
      wip.rawMaterials.length.toString(),
      wip.jobWorks.length.toString(),
      formatPDFCurrency(wip.totalCost)
    ])

    autoTable(doc, {
      startY: 20,
      head: [["Start Date", "Batch Name", "Status", "Materials Assigned", "Processes Count", "Total Running Cost"]],
      body: tableData,
    })

    doc.save("WIP_Overall_Status.pdf")
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Active Batches</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalWIPBatches}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Total Running Cost</p>
          <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(totalWIPCost)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Avg Cost Per Batch</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(averageCostPerBatch)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Active Production</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search batches..." value={wipSearch} onChange={e => setWipSearch(e.target.value)} className="pl-9 rounded-xl h-10 w-48" />
          </div>
          <Button variant="outline" className="rounded-xl h-10" onClick={exportOverallPDF}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-primary"><Plus className="w-4 h-4 mr-2" /> Start Production</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Start New Production (WIP)</DialogTitle>
                <DialogDescription>Create a new batch for manufacturing.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={newWipDate} onChange={e => setNewWipDate(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product / Batch Name</label>
                  <Input placeholder="e.g. Jeans Style 101" value={newWipName} onChange={e => setNewWipName(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsNewOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button onClick={handleCreateWIP} className="rounded-xl">Start WIP</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {(() => {
          const filteredWIP = wipGoods.filter(wip => {
            if (!wipSearch) return true
            const q = wipSearch.toLowerCase()
            return wip.name.toLowerCase().includes(q) || wip.status.toLowerCase().includes(q)
          })
          return filteredWIP.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-2xl border border-border">
            <Hammer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active production.</p>
          </div>
        ) : (
          filteredWIP.map(wip => (
            <WIPRow key={wip.id} wip={wip} />
          ))
        )})()}
      </div>
    </div>
  )
}

function WIPRow({ wip }: { wip: WIPGood }) {
  const { updateWIPGood, addFinishedGood, deleteWIPGood, accounts, addAccount, addLedgerEntry, rawMaterials, updateRawMaterial, activeOrg } = useStore()
  const formatCurrency = getFormatCurrency(activeOrg?.currency)
  const [expanded, setExpanded] = useState(false)

  // Add RM state
  const [isRmOpen, setIsRmOpen] = useState(false)
  const [selectedRmId, setSelectedRmId] = useState("")
  const [rmQty, setRmQty] = useState("")
  
  // Computed cost for selected RM
  const selectedRm = rawMaterials.find(r => r.id === selectedRmId)
  const rmCostComputed = selectedRm ? Number(rmQty) * selectedRm.price : 0

  // Add Job Work state
  const [isJwOpen, setIsJwOpen] = useState(false)
  const [jwName, setJwName] = useState("")
  const [isNewJwSupplier, setIsNewJwSupplier] = useState(false)
  const [jwSupplier, setJwSupplier] = useState("")
  const [jwQty, setJwQty] = useState("")
  const [jwPrice, setJwPrice] = useState("")
  const jwTotal = (Number(jwQty) || 0) * (Number(jwPrice) || 0)
  
  const suppliers = accounts.filter(a => a.category === "Supplier")

  // Finish state
  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [finishQty, setFinishQty] = useState("")
  const [finishLocation, setFinishLocation] = useState("")

  // Edit RM state
  const [editRmItem, setEditRmItem] = useState<{ id: string, name: string, qty: number, cost: number } | null>(null)
  const [editRmQty, setEditRmQty] = useState("")
  const [isEditRmOpen, setIsEditRmOpen] = useState(false)

  // Edit JW state
  const [editJwItem, setEditJwItem] = useState<{ id: string, name: string, qty: number, price: number, total: number, supplierName?: string, wipId?: string } | null>(null)
  const [editJwQty, setEditJwQty] = useState("")
  const [editJwPrice, setEditJwPrice] = useState("")
  const [isEditJwOpen, setIsEditJwOpen] = useState(false)

  const handleUpdateRmItem = async () => {
    if (!editRmItem || !editRmQty) return
    const newQty = Number(editRmQty)
    const diffQty = newQty - editRmItem.qty
    const unitPrice = editRmItem.cost / editRmItem.qty
    const newCost = newQty * unitPrice
    const costDiff = newCost - editRmItem.cost
    const updatedRms = wip.rawMaterials.map(rm => rm.id === editRmItem.id ? { ...rm, qty: newQty, cost: newCost } : rm)
    
    const originalRm = rawMaterials.find(r => r.name === editRmItem.name)
    if (originalRm) await updateRawMaterial(originalRm.id, { qtyUsed: (originalRm.qtyUsed || 0) + diffQty })
    await updateWIPGood(wip.id, { totalCost: wip.totalCost + costDiff, rawMaterials: updatedRms })
    setIsEditRmOpen(false)
  }

  const handleDeleteRmItem = async (rmId: string) => {
    const rm = wip.rawMaterials.find(r => r.id === rmId)
    if (!rm) return
    const updatedRms = wip.rawMaterials.filter(r => r.id !== rmId)
    const originalRm = rawMaterials.find(r => r.name === rm.name)
    if (originalRm) await updateRawMaterial(originalRm.id, { qtyUsed: Math.max(0, (originalRm.qtyUsed || 0) - rm.qty) })
    await updateWIPGood(wip.id, { totalCost: wip.totalCost - rm.cost, rawMaterials: updatedRms })
    setIsEditRmOpen(false)
  }

  const handleUpdateJwItem = async () => {
    if (!editJwItem || !editJwQty || !editJwPrice) return
    const newQty = Number(editJwQty); const newPrice = Number(editJwPrice); const newTotal = newQty * newPrice
    const costDiff = newTotal - editJwItem.total
    const updatedJws = wip.jobWorks.map(jw => jw.id === editJwItem.id ? { ...jw, qty: newQty, price: newPrice, total: newTotal } : jw)
    await updateWIPGood(wip.id, { totalCost: wip.totalCost + costDiff, jobWorks: updatedJws })
    setIsEditJwOpen(false)
  }

  const handleDeleteJwItem = async (jwId: string) => {
    const jw = wip.jobWorks.find(j => j.id === jwId)
    if (!jw) return
    const updatedJws = wip.jobWorks.filter(j => j.id !== jwId)
    await updateWIPGood(wip.id, { totalCost: wip.totalCost - jw.total, jobWorks: updatedJws })
    setIsEditJwOpen(false)
  }

  const handleAddRM = async () => {
    if (!selectedRm || !rmQty) return
    const newRm = {
      id: "temp-" + window.crypto.randomUUID(),
      wipId: wip.id,
      name: selectedRm.name,
      qty: Number(rmQty),
      cost: rmCostComputed
    }
    
    // Update raw material qtyUsed
    await updateRawMaterial(selectedRm.id, {
      qtyUsed: (selectedRm.qtyUsed || 0) + Number(rmQty)
    })

    await updateWIPGood(wip.id, {
      status: `Assigned: ${selectedRm.name}`,
      totalCost: wip.totalCost + newRm.cost,
      rawMaterials: [...wip.rawMaterials, newRm]
    })
    setIsRmOpen(false)
    setSelectedRmId(""); setRmQty("");
  }

  const handleAddJobWork = async () => {
    if (!jwName || !jwSupplier || !jwQty || !jwPrice) return
    const newJw = {
      id: "temp-" + window.crypto.randomUUID(),
      wipId: wip.id,
      name: jwName,
      supplierName: jwSupplier,
      qty: Number(jwQty),
      price: Number(jwPrice),
      total: jwTotal
    }

    // Ledger Integration for Supplier
    let targetAccountId: string | undefined = undefined
    if (isNewJwSupplier) {
      targetAccountId = await addAccount({ name: jwSupplier, category: "Supplier", type: "Direct", station: "" })
    } else {
      const existing = suppliers.find(s => s.name === jwSupplier)
      if (existing) targetAccountId = existing.id
      else targetAccountId = await addAccount({ name: jwSupplier, category: "Supplier", type: "Direct", station: "" })
    }

    if (!targetAccountId) {
      toast.error("Could not determine supplier account")
      return
    }
    
    await addLedgerEntry(targetAccountId, {
      date: new Date().toISOString(),
      party: `Job Work - ${jwName} for ${wip.name}`,
      station: "",
      amount: jwTotal,
      discount: 0,
      taxOrPaid: 0,
      netAmount: jwTotal,
      items: `${jwQty} x ${jwPrice}`,
      payment: 0,
      type: "bill"
    })

    await updateWIPGood(wip.id, {
      status: `Job Work: ${jwName}`,
      totalCost: wip.totalCost + jwTotal,
      jobWorks: [...wip.jobWorks, newJw]
    })
    setIsJwOpen(false)
    setJwName(""); setJwSupplier(""); setJwQty(""); setJwPrice(""); setIsNewJwSupplier(false)
  }

  const handleFinish = async () => {
    if (!finishQty) return
    
    // Stringify the breakdown to store historically
    const wipBreakdown = JSON.stringify({
      rawMaterials: wip.rawMaterials,
      jobWorks: wip.jobWorks
    })

    await addFinishedGood({
      date: new Date().toISOString(),
      name: wip.name,
      qty: Number(finishQty),
      cost: wip.totalCost,
      location: finishLocation,
      wipBreakdown: wipBreakdown
    })
    await deleteWIPGood(wip.id) // Remove from WIP
    setIsFinishOpen(false)
    toast.success("Moved to Finished Goods")
  }

  const exportIndividualPDF = (e: React.MouseEvent) => {
    e.stopPropagation()
    const doc = new jsPDF()
    doc.text(`WIP Detailed Breakdown: ${wip.name}`, 14, 15)
    doc.setFontSize(10)
    doc.text(`Status: ${wip.status}`, 14, 22)
    doc.text(`Total Manufacturing Cost: ${formatPDFCurrency(wip.totalCost)}`, 14, 28)
    
    autoTable(doc, {
      startY: 35,
      head: [["Raw Material Consumed", "Qty", "Allocated Cost"]],
      body: wip.rawMaterials.map(rm => [rm.name, rm.qty.toString(), formatPDFCurrency(rm.cost)])
    })
    
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 35
    
    autoTable(doc, {
      startY: finalY + 10,
      head: [["Manufacturing Process (Job Work)", "Supplier", "Qty", "Rate", "Total Cost"]],
      body: wip.jobWorks.map(jw => [jw.name, jw.supplierName || "-", jw.qty.toString(), formatPDFCurrency(jw.price), formatPDFCurrency(jw.total)])
    })

    doc.save(`WIP_Breakdown_${wip.name.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow transition-shadow">
      {/* Collapsed View */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-foreground">{wip.name}</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{wip.status}</Badge>
            <Button variant="outline" size="sm" className="h-6 text-xs ml-2 rounded border-border" onClick={exportIndividualPDF}>Export PDF</Button>
          </div>
          <div className="text-sm text-muted-foreground">Started: {new Date(wip.date).toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase font-semibold">Running Cost</div>
            <div className="text-xl font-bold font-mono text-accent">{formatCurrency(wip.totalCost)}</div>
          </div>
          <div className="p-2 rounded-full hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="p-5 pt-0 border-t border-border mt-2 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            
            {/* Raw Materials Block */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">Raw Materials Consumed</h4>
                <Dialog open={isRmOpen} onOpenChange={setIsRmOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs"><Plus className="w-3 h-3 mr-1" /> Add RM</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Assign Raw Material</DialogTitle>
                      <DialogDescription>Select raw material from inventory to allocate to this batch.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <select 
                        value={selectedRmId} 
                        onChange={e => setSelectedRmId(e.target.value)} 
                        className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select Material...</option>
                        {rawMaterials.map(rm => (
                          <option key={rm.id} value={rm.id}>{rm.name} (Avail: {rm.qty - (rm.qtyUsed || 0)} | Rate: {rm.price})</option>
                        ))}
                      </select>
                      <Input type="number" placeholder="Quantity Used" value={rmQty} onChange={e=>setRmQty(e.target.value)} className="rounded-xl" />
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Auto-Calculated Cost Allocation</label>
                        <Input type="number" value={rmCostComputed} readOnly className="rounded-xl bg-muted font-semibold" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddRM} className="rounded-xl">Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="bg-background rounded-xl border border-border p-3 space-y-2">
                {wip.rawMaterials.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">No materials assigned</p> :
                  wip.rawMaterials.map(rm => (
                    <div key={rm.id} onClick={() => { setEditRmItem(rm); setEditRmQty(rm.qty.toString()); setIsEditRmOpen(true); }} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                      <span>{rm.qty}x {rm.name}</span>
                      <span className="font-medium text-muted-foreground">{formatCurrency(rm.cost)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Job Works Block */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">Manufacturing Processes (Job Work)</h4>
                <Dialog open={isJwOpen} onOpenChange={setIsJwOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs"><Plus className="w-3 h-3 mr-1" /> Add Process</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Job Work</DialogTitle>
                      <DialogDescription>Assign a contractor to process goods.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <Input placeholder="Process Name (e.g. Sewing, Washing)" value={jwName} onChange={e=>setJwName(e.target.value)} className="rounded-xl" />
                      
                      <div className="flex items-center gap-2 mt-2 bg-muted p-2 rounded-xl">
                        <input type="checkbox" id="newJwSup" checked={isNewJwSupplier} onChange={e => setIsNewJwSupplier(e.target.checked)} className="rounded text-primary" />
                        <label htmlFor="newJwSup" className="text-xs font-medium cursor-pointer">New Supplier?</label>
                      </div>

                      {isNewJwSupplier ? (
                        <Input placeholder="New Supplier/Contractor Name" value={jwSupplier} onChange={e=>setJwSupplier(e.target.value)} className="rounded-xl" />
                      ) : (
                        <select value={jwSupplier} onChange={e => setJwSupplier(e.target.value)} className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          <option value="">Select Existing Supplier...</option>
                          {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} ({s.type})</option>)}
                        </select>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Input type="number" placeholder="Quantity" value={jwQty} onChange={e=>setJwQty(e.target.value)} className="rounded-xl" />
                        <Input type="number" placeholder="Rate per qty" value={jwPrice} onChange={e=>setJwPrice(e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="text-sm font-semibold text-right pt-2">Total Ledger Entry: {formatCurrency(jwTotal)}</div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddJobWork} className="rounded-xl">Add Job Work</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="bg-background rounded-xl border border-border p-3 space-y-2">
                {wip.jobWorks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">No processes added</p> :
                  wip.jobWorks.map(jw => (
                    <div key={jw.id} onClick={() => { setEditJwItem(jw); setEditJwQty(jw.qty.toString()); setEditJwPrice(jw.price.toString()); setIsEditJwOpen(true); }} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                      <div>
                        <div className="font-medium">{jw.name} <span className="text-muted-foreground font-normal">({jw.qty}x)</span></div>
                        <div className="text-xs text-muted-foreground">by {jw.supplierName}</div>
                      </div>
                      <span className="font-medium text-muted-foreground">{formatCurrency(jw.total)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="destructive" size="sm" className="rounded-xl h-10 px-4 text-xs" onClick={() => deleteWIPGood(wip.id)}>
              <Trash2 className="w-4 h-4 mr-2"/> Delete WIP
            </Button>
            
            <Dialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-10 px-6 bg-accent hover:bg-accent/90 text-white shadow-lg">
                  Finish Production <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Finalize Production</DialogTitle>
                  <DialogDescription>Move &quot;{wip.name}&quot; to Finished Goods.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl border border-border">
                    The total manufacturing cost of <strong className="text-foreground">{formatCurrency(wip.totalCost)}</strong> will be assigned to this completed batch along with the historical breakdown of materials and job work.
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Location Stored</label>
                      <Input placeholder="Warehouse A, Rack 3..." value={finishLocation} onChange={e=>setFinishLocation(e.target.value)} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Final Output Quantity</label>
                      <Input type="number" placeholder="Total Qty" value={finishQty} onChange={e=>setFinishQty(e.target.value)} className="rounded-xl h-12 text-lg font-bold" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleFinish} className="rounded-xl h-12 text-md w-full bg-accent hover:bg-accent/90">Confirm Finish & Transfer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Modals for Items */}
          <Dialog open={isEditRmOpen} onOpenChange={setIsEditRmOpen}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit Assigned Material</DialogTitle>
                <DialogDescription>Update quantity or remove this raw material.</DialogDescription>
              </DialogHeader>
              {editRmItem && (
                <div className="space-y-3 py-3">
                  <div className="font-semibold">{editRmItem.name}</div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Quantity Used</label>
                    <Input type="number" value={editRmQty} onChange={e=>setEditRmQty(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              )}
              <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => editRmItem?.id && handleDeleteRmItem(editRmItem.id)}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditRmOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                  <Button onClick={handleUpdateRmItem} className="rounded-xl">Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditJwOpen} onOpenChange={setIsEditJwOpen}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit Job Work Process</DialogTitle>
                <DialogDescription>Update quantity, rate, or remove this process.</DialogDescription>
              </DialogHeader>
              {editJwItem && (
                <div className="space-y-3 py-3">
                  <div className="font-semibold">{editJwItem.name} <span className="text-xs font-normal text-muted-foreground ml-1">by {editJwItem.supplierName}</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Quantity</label>
                      <Input type="number" value={editJwQty} onChange={e=>setEditJwQty(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Rate</label>
                      <Input type="number" value={editJwPrice} onChange={e=>setEditJwPrice(e.target.value)} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => editJwItem?.id && handleDeleteJwItem(editJwItem.id)}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditJwOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                  <Button onClick={handleUpdateJwItem} className="rounded-xl">Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      )}
    </div>
  )
}


// -------------------------------------------------------------------------
// FINISHED GOODS TAB
// -------------------------------------------------------------------------
function FinishedGoodsTab() {
  const { finishedGoods, addFinishedGood, deleteFinishedGood, updateFinishedGood, accounts, addAccount, addLedgerEntry, activeOrg } = useStore()
  const formatCurrency = getFormatCurrency(activeOrg?.currency)
  
  const [isOpen, setIsOpen] = useState(false)
  
  // Manual procurement state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [name, setName] = useState("")
  const [qty, setQty] = useState("")
  const [size, setSize] = useState("")
  const [cost, setCost] = useState("")
  const [remarks, setRemarks] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [location, setLocation] = useState("")
  const [isNewFGSupplier, setIsNewFGSupplier] = useState(false)
  const [fgSupplierType, setFGSupplierType] = useState<"Direct" | "Agency">("Direct")
  const [fgBillerName, setFGBillerName] = useState("")
  const [fgSearch, setFGSearch] = useState("")
  const [editQtyFGId, setEditQtyFGId] = useState<string | null>(null)
  
  const suppliers = accounts.filter(a => a.category === "Supplier")
  
  const totalCostValue = (Number(qty) || 0) * (Number(cost) || 0)

  const totalFGItems = finishedGoods.length
  const totalFGQty = finishedGoods.reduce((sum, fg) => sum + fg.qty, 0)
  const totalFGBookValue = finishedGoods.reduce((sum, fg) => sum + fg.cost, 0)

  const handleManualAdd = async () => {
    if (!name || !qty || !cost) return

    let targetAccountId = undefined
    if (supplierName) {
      if (isNewFGSupplier) {
        targetAccountId = await addAccount({ name: supplierName, category: "Supplier", type: fgSupplierType, station: "" })
      } else {
        targetAccountId = accounts.find(a => a.category === "Supplier" && a.name.toLowerCase() === supplierName.toLowerCase())?.id
        if (!targetAccountId) {
          targetAccountId = await addAccount({ name: supplierName, category: "Supplier", type: "Agency", station: "" })
        }
      }
      
      await addLedgerEntry(targetAccountId, {
        date: new Date(date).toISOString(),
        party: `Purchase - ${name}${fgSupplierType === "Agency" && fgBillerName ? ` (Biller: ${fgBillerName})` : ""}`,
        station: "",
        amount: totalCostValue,
        discount: 0,
        taxOrPaid: 0,
        netAmount: totalCostValue,
        items: `${qty} x ${name}`,
        payment: 0,
        type: "bill",
      })
    }

    await addFinishedGood({
      date: new Date(date).toISOString(),
      name,
      qty: Number(qty),
      cost: totalCostValue,
      remarks,
      location,
      supplierName: supplierName || undefined
    })

    setIsOpen(false)
    setName(""); setQty(""); setSize(""); setCost(""); setRemarks(""); setSupplierName(""); setLocation(""); setIsNewFGSupplier(false); setFGBillerName("")
    toast.success("Finished good added")
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text("Finished Goods Inventory", 14, 15)
    
    const tableData = finishedGoods.map(fg => [
      new Date(fg.date).toLocaleDateString(),
      fg.name,
      fg.location || "-",
      fg.qty.toString(),
      formatPDFCurrency(fg.cost)
    ])

    autoTable(doc, {
      startY: 20,
      head: [["Date", "Product Name", "Location", "Available Qty", "Total Value"]],
      body: tableData,
    })

    doc.save("FinishedGoods_Inventory.pdf")
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Unique Items</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalFGItems}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Total Stock Qty</p>
          <p className="text-2xl font-bold text-accent mt-1">{totalFGQty}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <p className="text-sm text-muted-foreground">Total Book Value</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalFGBookValue)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Finished Goods Inventory</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search goods..." value={fgSearch} onChange={e => setFGSearch(e.target.value)} className="pl-9 rounded-xl h-10 w-48" />
          </div>
          <Button variant="outline" className="rounded-xl h-10" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-primary"><Plus className="w-4 h-4 mr-2" /> Direct Add</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-xl">
              <DialogHeader>
                <DialogTitle>Direct Add Finished Goods</DialogTitle>
                <DialogDescription>Manually add procured goods to inventory.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="fgNewSupplier" checked={isNewFGSupplier} onChange={e => { setIsNewFGSupplier(e.target.checked); setSupplierName("") }} className="w-4 h-4" />
                  <label htmlFor="fgNewSupplier" className="text-sm font-medium cursor-pointer">New Supplier</label>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Supplier Name (Optional)</label>
                  {isNewFGSupplier ? (
                    <Input placeholder="Enter new supplier name" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="rounded-xl" />
                  ) : (
                    <select value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select Supplier (optional)...</option>
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} ({s.type})</option>)}
                    </select>
                  )}
                </div>
                {isNewFGSupplier && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier Type</label>
                    <select value={fgSupplierType} onChange={e => setFGSupplierType(e.target.value as "Direct" | "Agency")} className="w-full rounded-xl h-10 border border-input bg-background px-3 text-sm">
                      <option value="Direct">Direct</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                )}
                {isNewFGSupplier && fgSupplierType === "Agency" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Biller Name</label>
                    <Input value={fgBillerName} onChange={e => setFGBillerName(e.target.value)} className="rounded-xl" placeholder="Enter biller name" />
                  </div>
                )}
                <div className="col-span-2 border-t border-border my-1"></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Size</label>
                  <Input value={size} onChange={e => setSize(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost / Value</label>
                  <Input type="number" value={cost} onChange={e => setCost(e.target.value)} className="rounded-xl" placeholder="Per unit or total" />
                </div>
                <div className="col-span-2 text-right font-medium text-sm pt-2">
                  Total Entry Value: {formatCurrency(totalCostValue)}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button onClick={handleManualAdd} className="rounded-xl">Save to Inventory</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(() => {
          const filtered = finishedGoods.filter(fg => {
            if (!fgSearch) return true
            const q = fgSearch.toLowerCase()
            return fg.name.toLowerCase().includes(q) || (fg.supplierName || "").toLowerCase().includes(q) || (fg.location || "").toLowerCase().includes(q)
          })
          return filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-card rounded-2xl border border-border">
            <Box className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No finished goods available.</p>
          </div>
        ) : (
          filtered.map(fg => (
            <div key={fg.id} className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 right-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card via-card to-transparent pl-8">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg hover:bg-destructive/10" onClick={() => deleteFinishedGood(fg.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground mb-1">{new Date(fg.date).toLocaleDateString()}</div>
              <h3 className="text-lg font-bold text-foreground pr-12 line-clamp-1">{fg.name}</h3>
              {fg.supplierName && <div className="text-xs text-muted-foreground font-medium mb-1">from {fg.supplierName}</div>}
              {fg.location && <div className="text-xs font-semibold text-primary bg-primary/10 inline-block px-2 py-0.5 rounded-full mb-3">Loc: {fg.location}</div>}
              
              <div className="mt-4 flex justify-between items-end border-t border-border/50 pt-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available Qty</div>
                  <div className="text-2xl font-bold font-mono text-primary flex items-center gap-2">
                    {fg.qty}
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setEditQtyFGId(fg.id)}><Edit className="w-3 h-3"/></Button>
                    <Dialog open={editQtyFGId === fg.id} onOpenChange={(open) => { if (!open) setEditQtyFGId(null) }}>
                      <DialogContent className="rounded-2xl max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Edit Quantity</DialogTitle>
                          <DialogDescription>Update available stock for {fg.name}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-3">
                          <label className="text-sm font-medium">New Quantity</label>
                          <Input type="number" defaultValue={fg.qty} id={`qty-${fg.id}`} className="rounded-xl text-lg" />
                        </div>
                        <DialogFooter>
                          <Button 
                            className="rounded-xl w-full" 
                            onClick={() => {
                              const el = document.getElementById(`qty-${fg.id}`) as HTMLInputElement;
                              if (el) {
                                updateFinishedGood(fg.id, { qty: Number(el.value) })
                                toast.success("Quantity updated")
                              }
                              setEditQtyFGId(null)
                            }}
                          >Save Quantity</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Value</div>
                  <div className="text-lg font-bold text-foreground">{formatCurrency(fg.cost)}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-border/50">
                 <Dialog>
                   <DialogTrigger asChild>
                     <Button variant="outline" className="w-full rounded-xl h-9 text-xs">View Cost Breakdown</Button>
                   </DialogTrigger>
                   <DialogContent className="rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
                     <DialogHeader>
                       <DialogTitle>Detailed Cost Breakdown</DialogTitle>
                       <DialogDescription>Analysis of manufacturing costs.</DialogDescription>
                     </DialogHeader>
                     
                     <div className="py-4">
                       <div className="text-center mb-6">
                         <div className="text-sm text-muted-foreground mb-1">Total Book Value</div>
                         <div className="text-4xl font-bold text-accent">{formatCurrency(fg.cost)}</div>
                         <div className="text-sm font-medium mt-2 bg-muted/50 py-1.5 rounded-lg inline-block px-4">
                           Avg Cost per piece: {formatCurrency(fg.cost / (fg.qty || 1))}
                         </div>
                       </div>

                       {fg.wipBreakdown ? (
                         <div className="space-y-6">
                           {(() => {
                             try {
                               const breakdown = JSON.parse(fg.wipBreakdown);
                               return (
                                 <>
                                   {breakdown.rawMaterials && breakdown.rawMaterials.length > 0 && (
                                     <div>
                                       <h4 className="text-sm font-semibold border-b border-border pb-1 mb-2">Raw Materials Consumed</h4>
                                       <div className="space-y-1.5">
                                         {breakdown.rawMaterials.map((rm: { qty: number, name: string, cost: number }, i: number) => (
                                           <div key={i} className="flex justify-between text-sm">
                                             <span className="text-muted-foreground">{rm.qty}x {rm.name}</span>
                                             <span className="font-medium">{formatCurrency(rm.cost)}</span>
                                           </div>
                                         ))}
                                       </div>
                                     </div>
                                   )}
                                   {breakdown.jobWorks && breakdown.jobWorks.length > 0 && (
                                     <div>
                                       <h4 className="text-sm font-semibold border-b border-border pb-1 mb-2">Job Work Processes</h4>
                                       <div className="space-y-1.5">
                                         {breakdown.jobWorks.map((jw: { qty: number, name: string, supplierName: string, total: number }, i: number) => (
                                           <div key={i} className="flex justify-between text-sm">
                                             <div>
                                               <span className="text-muted-foreground">{jw.qty}x {jw.name}</span>
                                               <div className="text-xs text-muted-foreground/70">by {jw.supplierName}</div>
                                             </div>
                                             <span className="font-medium">{formatCurrency(jw.total)}</span>
                                           </div>
                                         ))}
                                       </div>
                                     </div>
                                   )}
                                 </>
                               )
                             } catch {
                               return <div className="text-sm text-muted-foreground text-center">Historical breakdown data is unavailable or corrupted.</div>
                             }
                           })()}
                         </div>
                       ) : (
                         <div className="text-sm text-muted-foreground text-center bg-muted/30 p-4 rounded-xl border border-dashed border-border mt-4">
                           Direct-added good. No manufacturing breakdown available.
                         </div>
                       )}
                     </div>
                   </DialogContent>
                 </Dialog>
              </div>
            </div>
          ))
        )})()}
      </div>
    </div>
  )
}
