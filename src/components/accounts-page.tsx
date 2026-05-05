"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Users, ArrowUpRight, ArrowDownRight, Edit2, FileText, Trash2, MoreHorizontal, Filter, Download, CheckCircle2, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatCurrency as globalFormatCurrency } from "@/lib/utils"
import { useStore, Account, LedgerEntry } from "@/lib/store"

const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "Google Pay", "NEFT/RTGS"]

export function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, setTriggerEditInvoiceId, activeOrg } = useStore()
  const [searchQuery, setSearchQuery] = useState("")

  // Account form state
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountCategory, setNewAccountCategory] = useState<"Customer" | "Supplier">("Customer")
  const [newAccountType, setNewAccountType] = useState<"Direct" | "Agency">("Direct")
  const [newAccountStation, setNewAccountStation] = useState("")

  const [activeCategoryTab, setActiveCategoryTab] = useState<"Customer" | "Supplier">("Customer")

  // Ledger state (track by ID to stay in sync with global store)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || null
  const [ledgerSearch, setLedgerSearch] = useState("")
  
  // Staged changes for the entire ledger
  const [stagedLedger, setStagedLedger] = useState<LedgerEntry[]>([])
  const [originalLedger, setOriginalLedger] = useState<LedgerEntry[]>([])

  // Load staged ledger when account is selected
  useEffect(() => {
    if (selectedAccount) {
      setStagedLedger(selectedAccount.ledger)
      setOriginalLedger(selectedAccount.ledger)
    } else {
      setStagedLedger([])
      setOriginalLedger([])
    }
  }, [selectedAccountId, accounts]) // sync with store changes too

  const hasChanges = JSON.stringify(stagedLedger) !== JSON.stringify(originalLedger)

  // Advanced Export State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [isAdvancedExportModalOpen, setIsAdvancedExportModalOpen] = useState(false)
  const [exportFilterFrom, setExportFilterFrom] = useState("")
  const [exportFilterTo, setExportFilterTo] = useState("")
  const [exportFilterType, setExportFilterType] = useState<"all" | "bill" | "payment">("all")

  const [entryDate, setEntryDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  const splitParty = (partyStr: string) => {
    if (!partyStr) return { invNo: "-", party: "-" };
    if (partyStr.includes(" - ")) {
      const parts = partyStr.split(" - ");
      return { invNo: parts[0], party: parts.slice(1).join(" - ") };
    }
    return { invNo: "-", party: partyStr };
  }

  const [entryInvoiceNo, setEntryInvoiceNo] = useState("")
  const [entryParty, setEntryParty] = useState("")
  const [entryStation, setEntryStation] = useState("")
  const [entryAmount, setEntryAmount] = useState<number | "">("")
  const [entryDiscount, setEntryDiscount] = useState<number | "">("")
  const [entryTaxOrPaid, setEntryTaxOrPaid] = useState<number | "">("")
  const [entryItems, setEntryItems] = useState("")
  const [entryPayment, setEntryPayment] = useState<number | "">("")
  
  const [entryType, setEntryType] = useState<"bill" | "payment">("bill")
  const [entryPaymentMode, setEntryPaymentMode] = useState<string>("Cash")
  
  // Tracking which ledger entry is being edited
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  const filteredAccounts = accounts.filter(
    (account) => {
      const q = searchQuery.toLowerCase()
      return (
        account.name.toLowerCase().includes(q) ||
        (account.station || "").toLowerCase().includes(q) ||
        account.ledger.some(entry => (entry.party || "").toLowerCase().includes(q))
      )
    }
  )

  const openNewAccount = () => {
    setEditingAccountId(null)
    setNewAccountName("")
    setNewAccountCategory("Customer")
    setNewAccountType("Direct")
    setNewAccountStation("")
    setIsAccountDialogOpen(true)
  }

  const openEditAccount = (account: Account) => {
    setEditingAccountId(account.id)
    setNewAccountName(account.name)
    setNewAccountCategory(account.category)
    setNewAccountType(account.type)
    setNewAccountStation(account.station || "")
    setIsAccountDialogOpen(true)
  }

  const handleSaveAccount = () => {
    if (newAccountName) {
      if (editingAccountId) {
        updateAccount(editingAccountId, {
          name: newAccountName,
          category: newAccountCategory,
          type: newAccountType,
          station: newAccountStation
        })
      } else {
        addAccount({ name: newAccountName, category: newAccountCategory, type: newAccountType, station: newAccountStation })
      }
      setIsAccountDialogOpen(false)
    }
  }

  const resetEntryForm = () => {
    setEditingEntryId(null)
    setEntryDate(new Date().toISOString().split("T")[0])
    setEntryInvoiceNo("")
    setEntryParty("")
    setEntryStation("")
    setEntryAmount("")
    setEntryDiscount("")
    setEntryTaxOrPaid("")
    setEntryItems("")
    setEntryPayment("")
    setEntryType("bill")
    setEntryPaymentMode("Cash")
  }

  const openEditLedgerEntry = (entry: LedgerEntry) => {
    if (entry.invoiceId) {
      setTriggerEditInvoiceId(entry.invoiceId)
      window.dispatchEvent(new CustomEvent('openInvoiceEdit'))
      setSelectedAccountId(null) // close ledger modal
      return
    }

    setEditingEntryId(entry.id)
    setEntryDate(entry.date)

    if (entry.party && entry.party.includes(" - ")) {
      const parts = entry.party.split(" - ")
      setEntryInvoiceNo(parts[0])
      setEntryParty(parts.slice(1).join(" - "))
    } else {
      setEntryInvoiceNo("")
      setEntryParty(entry.party || "")
    }

    setEntryStation(entry.station || "")
    setEntryAmount(entry.amount ?? "")
    setEntryDiscount(entry.discount ?? "")
    setEntryTaxOrPaid(entry.taxOrPaid ?? "")
    setEntryItems(entry.items || "")
    setEntryPayment(entry.payment ?? "")
    setEntryType(entry.type || "bill")
    setEntryPaymentMode(entry.paymentMode || "Cash")
  }

  const currentNetAmount = (Number(entryAmount) || 0) - (Number(entryDiscount) || 0) + (Number(entryTaxOrPaid) || 0)

  const handleSaveLedgerEntry = async () => {
    if (!selectedAccountId) return

    if (selectedAccountId && (entryParty || entryInvoiceNo || entryAmount || entryPayment)) {
      let finalParty = entryParty
      if (!finalParty && !entryInvoiceNo) {
        finalParty = entryType === "payment" ? "Payment" : "Bill"
      }
      const combinedParty = entryInvoiceNo ? `${entryInvoiceNo} - ${finalParty}` : finalParty
      
      const newAmount = Number(entryAmount) || 0
      const newDiscount = Number(entryDiscount) || 0
      const newTaxOrPaid = Number(entryTaxOrPaid) || 0
      const newPayment = Number(entryPayment) || 0
      
      let newNetAmount = 0
      if (entryType === "bill") {
        newNetAmount = newAmount - newDiscount + newTaxOrPaid
      }

      const entryData: LedgerEntry = {
        id: editingEntryId || "temp-" + Date.now(),
        date: entryDate,
        party: combinedParty,
        station: entryStation,
        amount: newAmount,
        discount: newDiscount,
        taxOrPaid: newTaxOrPaid,
        netAmount: newNetAmount,
        items: entryItems,
        payment: newPayment,
        type: entryType,
        paymentMode: entryType === "payment" ? entryPaymentMode : undefined,
        accountId: selectedAccountId
      }

      if (editingEntryId) {
        setStagedLedger(prev => prev.map(e => e.id === editingEntryId ? entryData : e))
      } else {
        setStagedLedger(prev => [...prev, entryData])
      }
      
      resetEntryForm()
    }
  }

  const handleDeleteLedgerEntry = (entryId: string) => {
    setStagedLedger(prev => prev.filter(e => e.id !== entryId))
  }

  const handleGlobalSave = async () => {
    if (!selectedAccountId) return
    
    toast.promise(async () => {
      // 1. Find deleted entries
      const deletedIds = originalLedger.filter(o => !stagedLedger.find(s => s.id === o.id)).map(o => o.id)
      for (const id of deletedIds) {
        await deleteLedgerEntry(selectedAccountId, id)
      }

      // 2. Find new/updated entries
      for (const entry of stagedLedger) {
        const original = originalLedger.find(o => o.id === entry.id)
        if (!original) {
          // New
          await addLedgerEntry(selectedAccountId, entry)
        } else if (JSON.stringify(entry) !== JSON.stringify(original)) {
          // Updated
          await updateLedgerEntry(selectedAccountId, entry.id, entry)
        }
      }
      setOriginalLedger(stagedLedger)
    }, {
      loading: 'Saving all ledger changes...',
      success: 'Ledger saved successfully!',
      error: 'Failed to save ledger.'
    })
  }

  const handleGlobalCancel = () => {
    setStagedLedger(originalLedger)
    toast.info("Changes discarded")
  }

  const formatCurrency = (amount: number) => globalFormatCurrency(Math.abs(amount))

  const totalReceivable = accounts.reduce((sum, a) => {
    if (a.category === "Customer") return sum + (a.balance > 0 ? a.balance : 0)
    // For Suppliers, a negative balance means we paid extra (receivable)
    return sum + (a.balance < 0 ? Math.abs(a.balance) : 0)
  }, 0)
  const totalPayable = accounts.reduce((sum, a) => {
    if (a.category === "Customer") return sum + (a.balance < 0 ? Math.abs(a.balance) : 0)
    // For Suppliers, a positive balance means we owe them (payable)
    return sum + (a.balance > 0 ? a.balance : 0)
  }, 0)

  // Sort and filter staged ledger
  const sortedLedger = stagedLedger
    .slice()
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter(entry => 
      !ledgerSearch || 
      entry.party?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.date.includes(ledgerSearch) ||
      entry.items?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.station?.toLowerCase().includes(ledgerSearch.toLowerCase())
    ) || []

  const currentStagedBalance = stagedLedger.reduce((sum, e) => sum + (e.netAmount - e.payment), 0)

  const totalLedgerAmount = sortedLedger.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalLedgerDiscount = sortedLedger.reduce((sum, e) => sum + (e.discount || 0), 0)
  const totalLedgerTax = sortedLedger.reduce((sum, e) => sum + (e.taxOrPaid || 0), 0)
  const totalLedgerNet = sortedLedger.reduce((sum, e) => sum + (e.netAmount || 0), 0)
  const totalLedgerPayment = sortedLedger.reduce((sum, e) => sum + (e.payment || 0), 0)

  const generateLedgerPDF = async (entriesToExport: LedgerEntry[] = sortedLedger) => {
    if (!selectedAccount || !selectedAccountId) return

    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })
    const primaryColor = [16, 133, 252] as [number, number, number]
    
    // Header
    doc.setFontSize(24)
    doc.setTextColor(...primaryColor)
    doc.text(activeOrg.name || "ABC Company", 14, 20)
    
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Ledger Statement: ${selectedAccount.name}`, 14, 28)
    if (selectedAccount.station) {
      doc.text(`Station: ${selectedAccount.station}`, 14, 34)
    }

    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text("LEDGER", 230, 20)

    doc.setFontSize(9)
    const today = new Date().toLocaleDateString("en-IN")
    doc.text(`Generated: ${today}`, 230, 28)

    const exportLedgerAmount = entriesToExport.reduce((sum, e) => sum + (e.amount || 0), 0)
    const exportLedgerDiscount = entriesToExport.reduce((sum, e) => sum + (e.discount || 0), 0)
    const exportLedgerTax = entriesToExport.reduce((sum, e) => sum + (e.taxOrPaid || 0), 0)
    const exportLedgerNet = entriesToExport.reduce((sum, e) => sum + (e.netAmount || 0), 0)
    const exportLedgerPayment = entriesToExport.reduce((sum, e) => sum + (e.payment || 0), 0)
    const finalNetBalance = exportLedgerNet - exportLedgerPayment

    const formatPdfCurrency = (amt: number) => globalFormatCurrency(amt, { showSymbol: false })
    const formatPdfSignedCurrency = (amt: number) => globalFormatCurrency(amt, { showSign: true, showSymbol: false })

    const tableData = entriesToExport.map(entry => {
      const sp = splitParty(entry.party || "");
      return [
        new Date(entry.date).toLocaleDateString('en-GB'),
        sp.invNo,
        sp.party + (entry.type === 'payment' && entry.paymentMode ? `\n(${entry.paymentMode})` : ""),
        entry.station || "",
        entry.amount ? formatPdfCurrency(entry.amount) : "",
        entry.discount ? `-${formatPdfCurrency(entry.discount)}` : "",
        entry.taxOrPaid ? formatPdfCurrency(entry.taxOrPaid) : "",
        entry.netAmount ? formatPdfCurrency(entry.netAmount) : "",
        entry.items || "",
        entry.payment ? formatPdfCurrency(entry.payment) : ""
      ]
    })

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Inv No', 'Party', 'Station', 'Amount (Rs)', 'Discount', 'Taxes+Expense', 'Net Amount (Rs)', 'ITEMS', 'Payment (Rs)']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        halign: 'center', 
        lineWidth: 0.2, 
        lineColor: [0, 0, 0],
        fontSize: 8
      },
      bodyStyles: { 
        textColor: [0, 0, 0], 
        lineColor: [0, 0, 0],
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 }, // Date
        1: { halign: 'center', cellWidth: 15 }, // Inv No
        2: { halign: 'left', cellWidth: 'auto' }, // Party
        3: { halign: 'center', cellWidth: 20 }, // Station
        4: { halign: 'right', cellWidth: 26 },  // Amount
        5: { halign: 'right', cellWidth: 22 },  // Discount
        6: { halign: 'right', cellWidth: 26 },  // Taxes+Expense
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }, // Net Amount
        8: { halign: 'center', cellWidth: 30 }, // Items
        9: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }  // Payment
      },
      didParseCell: (data) => {
        // Style 'OLD BALANCE' rows with yellow highlight
        const partyCell = data.row.cells[2]?.text?.[0] || ""
        if (partyCell.toUpperCase().includes("OLD BALANCE") || partyCell.toUpperCase().includes("OPENING BALANCE")) {
          data.cell.styles.fillColor = [255, 255, 0] // Yellow
          data.cell.styles.fontStyle = 'bold'
        }
      },
      foot: [
        [
          '', 
          '', 
          '', 
          'TOTAL',
          exportLedgerAmount ? formatPdfCurrency(exportLedgerAmount) : "", 
          exportLedgerDiscount ? `-${formatPdfCurrency(exportLedgerDiscount)}` : "", 
          exportLedgerTax ? formatPdfCurrency(exportLedgerTax) : "", 
          exportLedgerNet ? formatPdfCurrency(exportLedgerNet) : "", 
          '', 
          exportLedgerPayment ? formatPdfCurrency(exportLedgerPayment) : ""
        ],
        [
          { content: 'NET BALANCE (Rs.):', colSpan: 7, styles: { halign: 'right', fontSize: 14, fontStyle: 'bold', cellPadding: 3 } },
          { content: formatPdfSignedCurrency(finalNetBalance), colSpan: 3, styles: { halign: 'right', fontSize: 18, fontStyle: 'bold', cellPadding: 3 } }
        ]
      ],
      footStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        lineWidth: 0.2, 
        lineColor: [0, 0, 0] 
      }
    })

    const safeFilename = `${selectedAccount.name}_Ledger`.replace(/[^a-zA-Z0-9_-]/g, '_')
    
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${safeFilename}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportSelectedRows = () => {
    if (selectedRowIds.size === 0) {
      toast.error("Please select at least one row to export")
      return
    }
    const entriesToExport = sortedLedger.filter(e => selectedRowIds.has(e.id))
    generateLedgerPDF(entriesToExport)
    setIsSelectionMode(false)
    setSelectedRowIds(new Set())
  }

  const handleAdvancedExport = () => {
    let filtered = [...sortedLedger]
    
    if (exportFilterFrom) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(exportFilterFrom))
    }
    if (exportFilterTo) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(exportFilterTo))
    }
    if (exportFilterType === 'bill') {
      filtered = filtered.filter(e => e.type === 'bill')
    } else if (exportFilterType === 'payment') {
      filtered = filtered.filter(e => e.type === 'payment')
    }

    if (filtered.length === 0) {
      toast.error("No entries match the selected filters")
      return
    }

    generateLedgerPDF(filtered)
    setIsAdvancedExportModalOpen(false)
  }

  return (
    <div className="p-6 space-y-6 flex-1">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ledgers</p>
              <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10">
              <ArrowUpRight className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receivable (To Collect)</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totalReceivable)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-destructive/10">
              <ArrowDownRight className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payable (To Give)</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPayable)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search ledgers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 rounded-xl bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary" />
        </div>

        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" onClick={openNewAccount}>
              <Plus className="w-5 h-5 mr-2" />
              New Ledger
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-border bg-card w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingAccountId ? "Edit Ledger" : "Create New Ledger"}</DialogTitle>
              <DialogDescription>Add or update an agency or direct agent in your CRM.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ledger Name</label>
                <Input placeholder="e.g. Customer Name" value={newAccountName ?? ''} onChange={(e) => setNewAccountName(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Station / Location</label>
                <Input placeholder="e.g. Location Code" value={newAccountStation ?? ''} onChange={(e) => setNewAccountStation(e.target.value)} className="rounded-xl h-12 bg-muted border-0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="flex gap-2">
                  {(["Customer", "Supplier"] as const).map((cat) => (
                    <Button key={cat} type="button" variant={newAccountCategory === cat ? "default" : "outline"} onClick={() => setNewAccountCategory(cat)} className={cn("flex-1 rounded-xl h-12", newAccountCategory === cat ? "bg-primary" : "bg-transparent")}>
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <div className="flex gap-2">
                  {(["Direct", "Agency"] as const).map((type) => (
                    <Button key={type} type="button" variant={newAccountType === type ? "default" : "outline"} onClick={() => setNewAccountType(type)} className={cn("flex-1 rounded-xl h-12", newAccountType === type ? "bg-primary" : "bg-transparent")}>
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSaveAccount} className="rounded-xl bg-primary hover:bg-primary/90">
                {editingAccountId ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={activeCategoryTab === "Customer" ? "default" : "outline"} 
          onClick={() => setActiveCategoryTab("Customer")}
          className="rounded-xl flex-1 sm:flex-none"
        >
          Customers
        </Button>
        <Button 
          variant={activeCategoryTab === "Supplier" ? "default" : "outline"} 
          onClick={() => setActiveCategoryTab("Supplier")}
          className="rounded-xl flex-1 sm:flex-none"
        >
          Suppliers
        </Button>
      </div>

      {/* Account Tables */}
      <div className="space-y-8">
        {[
          { title: `${activeCategoryTab}s - Direct`, data: filteredAccounts.filter(a => (a.category || "Customer") === activeCategoryTab && a.type === "Direct") },
          { title: `${activeCategoryTab}s - Agencies`, data: filteredAccounts.filter(a => (a.category || "Customer") === activeCategoryTab && a.type === "Agency") }
        ].map((group, groupIndex) => (
          <div key={groupIndex}>
            <h3 className="text-lg font-semibold text-foreground mb-3 px-1">{group.title}</h3>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground w-1/3">Account Details</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Type</th>
                      <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Net Balance</th>
                      <th className="text-center p-4 text-sm font-semibold text-muted-foreground w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.data.map((account, index) => (
                <tr key={account.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", index === filteredAccounts.length - 1 && "border-b-0")}>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground tracking-tight">{account.name}</span>
                      <span className="text-sm text-muted-foreground">{account.station}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className={cn("rounded-md px-2 py-1 font-medium", account.type === "Agency" ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
                      {account.type}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      {account.category === "Customer" ? (
                        <>
                          <span className={cn("font-bold text-lg font-mono", account.balance > 0 ? "text-accent" : account.balance < 0 ? "text-destructive" : "text-muted-foreground")}>
                            {formatCurrency(account.balance)}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {account.balance > 0 ? "Receivable" : account.balance < 0 ? "Payable" : "Settled"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={cn("font-bold text-lg font-mono", account.balance > 0 ? "text-destructive" : account.balance < 0 ? "text-accent" : "text-muted-foreground")}>
                            {formatCurrency(account.balance)}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {account.balance > 0 ? "Payable" : account.balance < 0 ? "Advance" : "Settled"}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl"><MoreHorizontal className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedAccountId(account.id); resetEntryForm(); }} className="rounded-lg gap-2 cursor-pointer text-primary">
                              <FileText className="w-4 h-4" /> View Ledger
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] lg:max-w-[90vw] xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                            <div className="p-4 md:p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                              <DialogHeader>
                                <DialogTitle className="text-2xl flex flex-wrap items-center gap-3">
                                  {selectedAccount?.name}
                                  <Badge className="font-normal">{selectedAccount?.type}</Badge>
                                </DialogTitle>
                                <DialogDescription className="text-sm mt-1">{selectedAccount?.station}</DialogDescription>
                              </DialogHeader>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input placeholder="Filter by Party, Date..." value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} className="pl-9 h-10 w-full sm:w-64 rounded-xl bg-background border-border" />
                                </div>
                                
                                {isSelectionMode ? (
                                  <>
                                    <Button onClick={handleExportSelectedRows} variant="default" className="h-10 px-3 sm:px-4 rounded-xl shadow-lg">
                                      Export Selected ({selectedRowIds.size})
                                    </Button>
                                    <Button onClick={() => { setIsSelectionMode(false); setSelectedRowIds(new Set()); }} variant="ghost" className="h-10 px-3 rounded-xl border border-border">
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button onClick={() => generateLedgerPDF()} variant="outline" className="h-10 px-3 sm:px-4 rounded-xl border-dashed shrink-0 hover:bg-muted">
                                      <Download className="w-4 h-4 sm:mr-2" />
                                      <span className="hidden sm:inline">Export PDF</span>
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted shrink-0 border border-transparent">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                        <DropdownMenuItem onClick={() => setIsAdvancedExportModalOpen(true)} className="rounded-lg gap-2 cursor-pointer">
                                          <Filter className="w-4 h-4" /> Advanced Filter Export
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsSelectionMode(true)} className="rounded-lg gap-2 cursor-pointer">
                                          <CheckSquare className="w-4 h-4" /> Select Rows to Export
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Ledger Table */}
                            <div className="flex-1 overflow-x-auto min-h-[400px]">
                              <table className="w-full text-sm min-w-[1000px]">
                                <thead className="bg-muted sticky top-0 z-10 shadow-sm border-b border-border">
                                  <tr>
                                    {isSelectionMode && (
                                      <th className="p-3 text-center min-w-[50px]">
                                        <Checkbox 
                                          checked={selectedRowIds.size === sortedLedger.length && sortedLedger.length > 0}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedRowIds(new Set(sortedLedger.map(e => e.id)))
                                            } else {
                                              setSelectedRowIds(new Set())
                                            }
                                          }}
                                        />
                                      </th>
                                    )}
                                    <th className="p-3 text-left font-semibold text-foreground min-w-32">DATE</th>
                                    <th className="p-3 text-left font-semibold text-foreground min-w-32">INV NO</th>
                                    <th className="p-3 text-left font-semibold text-foreground min-w-40">PARTY</th>
                                    <th className="p-3 text-left font-semibold text-foreground min-w-32">STATION</th>
                                    <th className="p-3 text-right font-semibold text-foreground min-w-28">AMOUNT</th>
                                    <th className="p-3 text-right font-semibold text-foreground min-w-24">DISCOUNT</th>
                                    <th className="p-3 text-right font-semibold text-foreground min-w-24">Taxes+Expense</th>
                                    <th className="p-3 text-right font-semibold text-foreground min-w-32">NET AMOUNT</th>
                                    <th className="p-3 text-left font-semibold text-foreground min-w-32">ITEMS</th>
                                    <th className="p-3 text-right font-semibold text-foreground min-w-32">PAYMENT</th>
                                    <th className="p-3 text-center min-w-[70px]"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedLedger.map((entry, idx) => (
                                    <tr key={entry.id || idx} className={cn("border-b border-border/50 transition-colors", selectedRowIds.has(entry.id) ? "bg-primary/5" : "hover:bg-muted/10")}>
                                      {isSelectionMode && (
                                        <td className="p-3 text-center">
                                          <Checkbox 
                                            checked={selectedRowIds.has(entry.id)}
                                            onCheckedChange={(checked) => {
                                              const newSet = new Set(selectedRowIds)
                                              if (checked) newSet.add(entry.id)
                                              else newSet.delete(entry.id)
                                              setSelectedRowIds(newSet)
                                            }}
                                          />
                                        </td>
                                      )}
                                      <td className="p-3 font-mono text-xs">
                                        {new Date(entry.date).toLocaleDateString('en-GB')}
                                      </td>
                                      <td className="p-3">
                                        {splitParty(entry.party || "").invNo !== "-" && (
                                          <span className="font-semibold text-xs bg-muted px-2 py-1 rounded">{splitParty(entry.party || "").invNo}</span>
                                        )}
                                      </td>
                                      <td className="p-3 flex flex-col">
                                        <span>{splitParty(entry.party || "").party}</span>
                                        {entry.type === "payment" && entry.paymentMode && (
                                          <span className="text-[10px] uppercase text-accent font-semibold">{entry.paymentMode}</span>
                                        )}
                                      </td>
                                      <td className="p-3">{entry.station}</td>
                                      <td className="p-3 text-right font-medium">{entry.amount ? formatCurrency(entry.amount) : "-"}</td>
                                      <td className="p-3 text-right text-destructive">{entry.discount ? `-${formatCurrency(entry.discount)}` : "-"}</td>
                                      <td className="p-3 text-right text-warning">{entry.taxOrPaid ? `+${formatCurrency(entry.taxOrPaid)}` : "-"}</td>
                                      <td className="p-3 text-right font-bold">{entry.netAmount ? formatCurrency(entry.netAmount) : "-"}</td>
                                      <td className="p-3 text-muted-foreground">{entry.items || "-"}</td>
                                      <td className="p-3 text-right text-accent font-medium">{entry.payment ? formatCurrency(entry.payment) : "-"}</td>
                                      <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => openEditLedgerEntry(entry)}>
                                            <Edit2 className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleDeleteLedgerEntry(entry.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Subtotals Row */}
                                  {sortedLedger.length > 0 && (
                                    <tr className="bg-muted/40 font-semibold border-b border-border text-xs uppercase tracking-wider">
                                      <td className="p-3 text-muted-foreground" colSpan={isSelectionMode ? 5 : 4}>Subtotals</td>
                                      <td className="p-3 text-right">{totalLedgerAmount ? formatCurrency(totalLedgerAmount) : "-"}</td>
                                      <td className="p-3 text-right text-destructive">{totalLedgerDiscount ? formatCurrency(totalLedgerDiscount) : "-"}</td>
                                      <td className="p-3 text-right text-warning">{totalLedgerTax ? formatCurrency(totalLedgerTax) : "-"}</td>
                                      <td className="p-3 text-right">{totalLedgerNet ? formatCurrency(totalLedgerNet) : "-"}</td>
                                      <td className="p-3"></td>
                                      <td className="p-3 text-right text-accent">{totalLedgerPayment ? formatCurrency(totalLedgerPayment) : "-"}</td>
                                      <td className="p-3"></td>
                                    </tr>
                                  )}

                                  {/* Input Row for New/Edit */}
                                  <tr className="border-t border-border bg-muted/80">
                                    <td colSpan={isSelectionMode ? 12 : 11} className="p-3">
                                      <div className="flex flex-wrap gap-4 items-center">
                                        <span className="text-sm font-semibold text-foreground">Entry Controls:</span>
                                        <div className="flex gap-2">
                                          <Button size="sm" variant={entryType === "bill" ? "default" : "outline"} onClick={() => setEntryType("bill")} className="h-8 text-xs rounded-lg">Bill</Button>
                                          <Button size="sm" variant={entryType === "payment" ? "default" : "outline"} onClick={() => setEntryType("payment")} className="h-8 text-xs rounded-lg bg-accent text-accent-foreground hover:bg-accent/90">Payment</Button>
                                        </div>
                                        {entryType === "payment" && (
                                          <div className="flex items-center gap-2 ml-4">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase">Mode:</span>
                                            <Input placeholder="e.g. Cash, Cheque" className="h-8 w-32 text-xs bg-background rounded-lg border-border" value={entryPaymentMode ?? ''} onChange={(e) => setEntryPaymentMode(e.target.value)} />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>

                                  <tr className={cn("border-t-2 border-primary/20", editingEntryId ? "bg-primary/5" : "bg-muted/10")}>
                                    {isSelectionMode && <td className="p-2"></td>}
                                    <td className="p-2"><Input type="date" value={entryDate ?? ''} onChange={(e) => setEntryDate(e.target.value)} className="h-9 w-32 text-xs" /></td>
                                    <td className="p-2">
                                      <Input placeholder="Inv No" value={entryInvoiceNo ?? ''} onChange={(e) => setEntryInvoiceNo(e.target.value)} className="h-9 w-full min-w-24 text-xs" />
                                    </td>
                                    <td className="p-2">
                                      <Input placeholder="Party Name" value={entryParty ?? ''} onChange={(e) => setEntryParty(e.target.value)} className="h-9 w-full min-w-32 text-xs" />
                                    </td>
                                    <td className="p-2"><Input placeholder="Station" value={entryStation ?? ''} onChange={(e) => setEntryStation(e.target.value)} className="h-9 w-full min-w-24 text-xs" /></td>
                                    <td className="p-2"><Input type="number" placeholder="Amt" value={entryAmount ?? ''} onChange={(e) => setEntryAmount(e.target.value === '' ? '' : Number(e.target.value))} className="h-9 w-full min-w-24 text-right text-xs" /></td>
                                    <td className="p-2"><Input type="number" placeholder="Disc" value={entryDiscount ?? ''} onChange={(e) => setEntryDiscount(e.target.value === '' ? '' : Number(e.target.value))} className="h-9 w-full min-w-20 text-right text-xs" /></td>
                                    <td className="p-2"><Input type="number" placeholder="Tax" value={entryTaxOrPaid ?? ''} onChange={(e) => setEntryTaxOrPaid(e.target.value === '' ? '' : Number(e.target.value))} className="h-9 w-full min-w-20 text-right text-xs" /></td>
                                    <td className="p-2 text-right font-bold px-4">{currentNetAmount ? formatCurrency(currentNetAmount) : "-"}</td>
                                    <td className="p-2"><Input placeholder="" value={entryItems ?? ''} onChange={(e) => setEntryItems(e.target.value)} className="h-9 w-full min-w-24 text-xs" /></td>
                                    <td className="p-2"><Input type="number" placeholder="Paid" value={entryPayment ?? ''} onChange={(e) => setEntryPayment(e.target.value === '' ? '' : Number(e.target.value))} className="h-9 w-full min-w-24 text-right text-xs" /></td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center gap-2 justify-center">
                                        <Button 
                                          size="sm" 
                                          onClick={handleSaveLedgerEntry} 
                                          className={cn(
                                            "h-10 px-6 font-bold rounded-xl shadow-lg transition-all",
                                            editingEntryId ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                                          )}
                                        >
                                          {editingEntryId ? "UPDATE" : "ADD"}
                                        </Button>
                                        {editingEntryId && (
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={resetEntryForm} 
                                            className="h-10 px-4 font-semibold border-muted text-muted-foreground hover:bg-muted/10 rounded-xl"
                                          >
                                            CANCEL
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                             <div className="p-4 md:p-6 border-t border-border bg-card flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                  {hasChanges && (
                                    <>
                                      <Button onClick={handleGlobalSave} className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-green-600/20">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> SAVE ALL CHANGES
                                      </Button>
                                      <Button variant="outline" onClick={handleGlobalCancel} className="rounded-xl h-11 px-6 border-muted text-muted-foreground hover:bg-muted/10">
                                        CANCEL ALL
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  <span className="text-xl font-medium text-foreground tracking-tight">NET BALANCE</span>
                                  <span className={cn(
                                    "text-3xl md:text-4xl font-bold font-mono tracking-tight",
                                    currentStagedBalance > 0 ? "text-accent" : currentStagedBalance < 0 ? "text-destructive" : "text-foreground"
                                  )}>
                                    {formatCurrency(currentStagedBalance)}
                                  </span>
                                </div>
                            </div>

                            <Dialog open={isAdvancedExportModalOpen} onOpenChange={setIsAdvancedExportModalOpen}>
                              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle>Advanced Export</DialogTitle>
                                  <DialogDescription>
                                    Filter ledger entries before exporting to PDF.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <div className="space-y-3">
                                    <label className="text-sm font-semibold">Date Range</label>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">From</label>
                                        <Input type="date" value={exportFilterFrom} onChange={(e) => setExportFilterFrom(e.target.value)} className="rounded-xl h-10" />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">To</label>
                                        <Input type="date" value={exportFilterTo} onChange={(e) => setExportFilterTo(e.target.value)} className="rounded-xl h-10" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <label className="text-sm font-semibold">Transaction Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                      <Button 
                                        variant={exportFilterType === 'all' ? 'default' : 'outline'} 
                                        onClick={() => setExportFilterType('all')}
                                        className="rounded-lg h-9 text-xs"
                                      >
                                        All
                                      </Button>
                                      <Button 
                                        variant={exportFilterType === 'bill' ? 'default' : 'outline'} 
                                        onClick={() => setExportFilterType('bill')}
                                        className="rounded-lg h-9 text-xs"
                                      >
                                        Bills Only
                                      </Button>
                                      <Button 
                                        variant={exportFilterType === 'payment' ? 'default' : 'outline'} 
                                        onClick={() => setExportFilterType('payment')}
                                        className="rounded-lg h-9 text-xs"
                                      >
                                        Payments Only
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsAdvancedExportModalOpen(false)} className="rounded-xl h-10 px-4">Cancel</Button>
                                  <Button onClick={handleAdvancedExport} className="rounded-xl h-10 px-6">Generate PDF</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                          </DialogContent>
                        </Dialog>
                        
                        <DropdownMenuItem className="rounded-lg gap-2" onClick={() => openEditAccount(account)}>
                          <Edit2 className="w-4 h-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg gap-2 text-destructive" onClick={() => deleteAccount(account.id)}>
                          <Trash2 className="w-4 h-4" /> Delete Ledger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {group.data.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No accounts found in this category.</p>
              </div>
            )}
          </div>
        </div>
        ))}
      </div>
    </div>
  )
}
