"use client"

import { useState, useEffect } from "react"
import { Building, Shield, LogOut, Trash2, Plus, FileText, Package, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth"
import { serverSetMasterPasswordHash } from "@/app/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const settingsSections = [
  { id: "business", label: "Organization", icon: Building },
  { id: "invoice", label: "Invoice", icon: FileText },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "security", label: "Security & Auth", icon: Shield },
]

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("business")
  const { activeOrg, activeOrgId, updateOrganization, deleteOrganization, addOrganization, purgeInventory } = useStore()
  const { logout } = useAuth()

  // Password state
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwMsg, setPwMsg] = useState("")



  // Modal states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Local state for organization editing
  const [localOrgName, setLocalOrgName] = useState("")
  const [localGst, setLocalGst] = useState("")
  const [localPan, setLocalPan] = useState("")
  const [localAddress, setLocalAddress] = useState("")
  const [localCity, setLocalCity] = useState("")
  const [localState, setLocalState] = useState("")

  // Initialize/Sync local state when organization changes
  useEffect(() => {
    if (activeOrg) {
      setLocalOrgName(activeOrg.name || "")
      setLocalGst(activeOrg.gstNumber || "")
      setLocalPan(activeOrg.panNumber || "")
      setLocalAddress(activeOrg.address || "")
      setLocalCity(activeOrg.city || "")
      setLocalState(activeOrg.state || "")
    }
  }, [activeOrg])

  const handleSaveOrgDetails = async () => {
    if (!activeOrgId) return
    try {
      await updateOrganization(activeOrgId, {
        name: localOrgName,
        gstNumber: localGst,
        panNumber: localPan,
        address: localAddress,
        city: localCity,
        state: localState
      })
      toast.success("Organization details updated successfully")
    } catch (err) {
      toast.error("Failed to update organization details")
    }
  }

  const handleCancelOrgEdit = () => {
    if (activeOrg) {
      setLocalOrgName(activeOrg.name || "")
      setLocalGst(activeOrg.gstNumber || "")
      setLocalPan(activeOrg.panNumber || "")
      setLocalAddress(activeOrg.address || "")
      setLocalCity(activeOrg.city || "")
      setLocalState(activeOrg.state || "")
      toast.info("Changes discarded")
    }
  }
  
  // Link Invoices warning state
  const [showLinkWarning, setShowLinkWarning] = useState(false)
  const [pendingLinkState, setPendingLinkState] = useState(false)
  
  // Inventory Warning state
  const [showInventoryWarning, setShowInventoryWarning] = useState(false)
  const [pendingInventoryState, setPendingInventoryState] = useState(false)

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-3">Settings</h3>
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="mt-4 pt-4 border-t border-border px-3">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-destructive hover:bg-destructive/10 text-left font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-2xl border border-border">
            {/* ==================== ORGANIZATION SECTION ==================== */}
            {activeSection === "business" && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Organization Profile</h2>
                  <p className="text-sm text-muted-foreground">Configure your currently active business details.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-2 block">Business Name</label>
                    <Input
                      value={localOrgName}
                      onChange={(e) => setLocalOrgName(e.target.value)}
                      className="rounded-xl h-12 bg-muted border-0 focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">GST Number</label>
                    <Input placeholder="e.g. 29ABCDE1234F1Z5" value={localGst} onChange={(e) => setLocalGst(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">PAN Number</label>
                    <Input placeholder="e.g. ABCDE1234F" value={localPan} onChange={(e) => setLocalPan(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-2 block">Business Address</label>
                    <Input placeholder="e.g. 123 Main Street" value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">City</label>
                    <Input placeholder="e.g. City A" value={localCity} onChange={(e) => setLocalCity(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">State</label>
                    <Input placeholder="e.g. State A" value={localState} onChange={(e) => setLocalState(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleSaveOrgDetails}
                    className="rounded-xl px-6 bg-primary hover:bg-primary/90 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelOrgEdit}
                    className="rounded-xl px-6 gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>

                <div className="pt-6 border-t border-border space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Advanced Actions</h3>
                  <div className="flex flex-wrap gap-3">


                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="rounded-xl flex-1 md:flex-none">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete This Business
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the 
                            <strong> {activeOrg?.name}</strong> business and all of its associated data (accounts, invoices, ledgers).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => { deleteOrganization(activeOrgId); setIsDeleteDialogOpen(false) }}
                          >Delete Business</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== INVOICE SECTION ==================== */}
            {activeSection === "invoice" && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Invoice Settings</h2>
                  <p className="text-sm text-muted-foreground">Configure invoice behavior, ledger syncing, and currency format.</p>
                </div>

                {/* Invoice Column Customization */}
                <div className="space-y-6 pb-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Table Column Customization
                      </h4>
                      <p className="text-xs text-muted-foreground">Enable optional columns and customize their display names.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Mandatory Columns */}
                    {[
                      { id: "sno", label: "S. No." },
                      { id: "product", label: "Product" },
                      { id: "qty", label: "Quantity" },
                      { id: "price", label: "Price" },
                      { id: "amount", label: "Amount" },
                    ].map(col => (
                      <div key={col.id} className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50 opacity-80">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{col.label}</span>
                          <span className="text-[10px] text-primary uppercase font-bold tracking-tighter">Fixed Label</span>
                        </div>
                        <Shield className="w-4 h-4 text-primary/40" />
                      </div>
                    ))}

                    {/* Optional Column: Brand Name */}
                    <div className={cn(
                      "flex flex-col p-4 rounded-xl border transition-all duration-200 gap-3",
                      activeOrg?.invoiceShowBrandName !== false 
                        ? "bg-primary/5 border-primary/30 shadow-sm" 
                        : "bg-muted/50 border-border"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">Optional Column A</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Toggle Visibility</span>
                        </div>
                        <div 
                          onClick={() => updateOrganization(activeOrgId, { invoiceShowBrandName: activeOrg?.invoiceShowBrandName === false })}
                          className={cn(
                            "w-10 h-6 rounded-full transition-all flex items-center px-1 relative cursor-pointer",
                            activeOrg?.invoiceShowBrandName !== false ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                            activeOrg?.invoiceShowBrandName !== false ? "ml-auto" : "ml-0"
                          )} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Display Name</label>
                        <Input 
                          placeholder="e.g. Brand Name" 
                          value={activeOrg?.invoiceBrandNameLabel || ""} 
                          onChange={(e) => updateOrganization(activeOrgId, { invoiceBrandNameLabel: e.target.value })}
                          className="h-9 rounded-lg bg-background border-border/50 text-sm"
                        />
                      </div>
                    </div>

                    {/* Optional Column: Size */}
                    <div className={cn(
                      "flex flex-col p-4 rounded-xl border transition-all duration-200 gap-3",
                      activeOrg?.invoiceShowSize !== false 
                        ? "bg-primary/5 border-primary/30 shadow-sm" 
                        : "bg-muted/50 border-border"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">Optional Column B</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Toggle Visibility</span>
                        </div>
                        <div 
                          onClick={() => updateOrganization(activeOrgId, { invoiceShowSize: activeOrg?.invoiceShowSize === false })}
                          className={cn(
                            "w-10 h-6 rounded-full transition-all flex items-center px-1 relative cursor-pointer",
                            activeOrg?.invoiceShowSize !== false ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                            activeOrg?.invoiceShowSize !== false ? "ml-auto" : "ml-0"
                          )} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Display Name</label>
                        <Input 
                          placeholder="e.g. Size" 
                          value={activeOrg?.invoiceSizeLabel || ""} 
                          onChange={(e) => updateOrganization(activeOrgId, { invoiceSizeLabel: e.target.value })}
                          className="h-9 rounded-lg bg-background border-border/50 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax Configuration */}
                <div className="space-y-4 pb-6 border-b border-border/50">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Tax Configuration
                  </h4>
                  <p className="text-xs text-muted-foreground">Choose how taxes are applied to new invoices.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Manual Mode */}
                    <div 
                      onClick={() => updateOrganization(activeOrgId, { taxMode: "manual" })}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        (activeOrg?.taxMode || "manual") === "manual"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 bg-muted/30 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          (activeOrg?.taxMode || "manual") === "manual" ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {(activeOrg?.taxMode || "manual") === "manual" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">Manual Entry</span>
                          <span className="text-[10px] text-muted-foreground">Enter tax amount by hand for each invoice</span>
                        </div>
                      </div>
                    </div>

                    {/* Percentage Mode */}
                    <div 
                      onClick={() => updateOrganization(activeOrgId, { taxMode: "percentage" })}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        activeOrg?.taxMode === "percentage"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 bg-muted/30 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          activeOrg?.taxMode === "percentage" ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {activeOrg?.taxMode === "percentage" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">Auto Percentage</span>
                          <span className="text-[10px] text-muted-foreground">Auto-calculate taxes from subtotal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Percentage Input - only visible in percentage mode */}
                  {activeOrg?.taxMode === "percentage" && (
                    <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                      <label className="text-sm font-semibold text-foreground whitespace-nowrap">Tax Rate:</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 18"
                          value={activeOrg?.taxPercentage || ""}
                          onChange={(e) => updateOrganization(activeOrgId, { taxPercentage: Number(e.target.value) || 0 })}
                          className="w-24 h-9 rounded-lg bg-background border-border/50 text-sm text-right"
                        />
                        <span className="text-sm font-bold text-muted-foreground">%</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">Applied to subtotal of new invoices</span>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/70 italic">Note: Editing existing invoices will always show a manual tax field to preserve original data.</p>
                </div>

                {/* Invoice-Ledger Sync */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Invoice-Ledger Sync</h4>
                  <p className="text-xs text-muted-foreground -mt-2">Automatically create and update ledger entries when creating or editing invoices.</p>
                  <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-xl border border-border">
                    <input 
                      type="checkbox" 
                      id="settingLinkInvoices" 
                      checked={activeOrg?.linkInvoicesLedgers || false} 
                      onChange={(e) => { setPendingLinkState(e.target.checked); setShowLinkWarning(true) }}
                      disabled={activeOrg?.linkInvoicesChanged}
                      className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col">
                      <label htmlFor="settingLinkInvoices" className={cn("text-sm font-semibold", activeOrg?.linkInvoicesChanged ? "text-muted-foreground cursor-not-allowed" : "text-foreground cursor-pointer")}>
                        Link Invoices with Ledgers
                      </label>
                      {activeOrg?.linkInvoicesChanged && (
                        <span className="text-xs text-warning mt-1 font-medium">This setting has been locked and cannot be changed again.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strict Inventory Invoicing */}
                {activeOrg?.inventoryEnabled && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">Inventory-Linked Invoicing</h4>
                    <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-xl border border-border">
                      <input 
                        type="checkbox" 
                        id="settingStrictInvoicing" 
                        checked={activeOrg?.strictInventoryInvoicing || false} 
                        onChange={(e) => updateOrganization(activeOrgId, { strictInventoryInvoicing: e.target.checked })}
                        className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="settingStrictInvoicing" className="text-sm font-semibold text-foreground cursor-pointer">
                          Strict Inventory Invoicing
                        </label>
                        <span className="text-xs text-muted-foreground mt-1">Force invoices to be created exclusively from finished goods stock.</span>
                      </div>
                    </div>
                  </div>
                )}



                {/* Warning Modal for Invoice Linking */}
                <AlertDialog open={showLinkWarning} onOpenChange={setShowLinkWarning}>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        {pendingLinkState 
                          ? <span>Previous generated invoices will <strong>not</strong> be linked. They will exist as data storage and can be edited/downloaded, but cannot be linked to the ledger.</span>
                          : <span>This will permanently stop invoices from automatically syncing to ledgers.</span>
                        }
                        <span className="block text-destructive font-semibold mt-2">
                          Once you confirm, this toggle will be permanently locked and cannot be changed again.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="rounded-xl bg-primary hover:bg-primary/90"
                        onClick={() => {
                          updateOrganization(activeOrgId, { linkInvoicesLedgers: pendingLinkState, linkInvoicesChanged: true })
                          setShowLinkWarning(false)
                        }}
                      >Confirm Change</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* ==================== INVENTORY SECTION ==================== */}
            {activeSection === "inventory" && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Inventory Settings</h2>
                  <p className="text-sm text-muted-foreground">Enable comprehensive tracking of raw materials, work-in-progress, and finished goods.</p>
                </div>

                <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-xl border border-border">
                  <input 
                    type="checkbox" 
                    id="settingInventory" 
                    checked={activeOrg?.inventoryEnabled || false} 
                    onChange={(e) => {
                      const isEnabled = e.target.checked
                      if (!isEnabled) {
                        setPendingInventoryState(false)
                        setShowInventoryWarning(true)
                      } else {
                        updateOrganization(activeOrgId, { inventoryEnabled: true })
                      }
                    }}
                    className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="settingInventory" className="text-sm font-semibold text-foreground cursor-pointer">
                      Enable Inventory Module
                    </label>
                    <span className="text-xs text-muted-foreground mt-1">Track raw materials, WIP goods, and finished goods.</span>
                  </div>
                </div>

                {activeOrg?.inventoryEnabled && (
                  <div className="bg-muted/30 rounded-xl p-4 border border-border text-sm text-muted-foreground">
                    <p>The Inventory tab is now visible in the main sidebar. Use the <strong>Invoice</strong> settings tab to enable Strict Inventory Invoicing if you want to link invoices with your finished goods stock.</p>
                  </div>
                )}

                {/* Warning Modal for Inventory Purge */}
                <AlertDialog open={showInventoryWarning} onOpenChange={setShowInventoryWarning}>
                  <AlertDialogContent className="rounded-2xl border-destructive/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="w-5 h-5" /> Irreversible Action
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <span>Turning OFF the inventory setting will <strong>permanently purge all inventory data</strong>.</span>
                        <span className="block text-foreground mt-2">
                          This includes all Raw Materials, Work-in-Progress, and Finished Goods records. This action cannot be undone.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        onClick={async () => {
                          await purgeInventory()
                          updateOrganization(activeOrgId, { inventoryEnabled: false })
                          setShowInventoryWarning(false)
                        }}
                      >Delete All Inventory Data</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* ==================== SECURITY SECTION ==================== */}
            {activeSection === "security" && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Security & Authentication</h2>
                  <p className="text-sm text-muted-foreground">Change your master password.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Current Password</label>
                    <Input type="password" placeholder="Enter current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
                    <Input type="password" placeholder="Enter new password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Confirm New Password</label>
                    <Input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
                  </div>
                </div>

                {pwMsg && (
                  <div className={cn(
                    "text-sm rounded-xl px-4 py-2.5 font-medium",
                    pwMsg.includes("success") ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                  )}>{pwMsg}</div>
                )}

                <div className="flex gap-3">
                  <Button
                    className="rounded-xl bg-primary hover:bg-primary/90"
                    disabled={!newPw || !currentPw || !confirmPw}
                    onClick={async () => {
                      if (newPw !== confirmPw) { setPwMsg("Passwords do not match."); return }
                      if (newPw.length < 4) { setPwMsg("Password must be at least 4 characters."); return }

                      try {
                        await serverSetMasterPasswordHash(newPw, activeOrgId)
                        setCurrentPw(""); setNewPw(""); setConfirmPw("")
                        setPwMsg("Password changed successfully!")
                        toast.success("Master password updated")
                      } catch (err: any) {
                        setPwMsg(err.message || "Failed to update password")
                        toast.error("Password update failed")
                      }
                    }}
                  >Update Password</Button>
                </div>
              </div>
            )}




          </div>
        </div>
      </div>
    </div>
  )
}
