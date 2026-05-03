"use client"

import { useState } from "react"
import { Search, Plus, FileText, Download, Edit2, Eye, MoreHorizontal, CheckCircle, Clock, XCircle, Trash2, Barcode } from "lucide-react"
import { printBarcodes } from "@/lib/barcode-utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { useStore, Invoice } from "@/lib/store"
import { useEffect } from "react"
import { toast } from "sonner"

export function InvoicesPage() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, accounts, activeOrg, addAccount, addLedgerEntry, updateLedgerEntry, organization, triggerEditInvoiceId, setTriggerEditInvoiceId, finishedGoods, updateFinishedGood } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  
  // New/Edit Invoice State
  const [invoiceNo, setInvoiceNo] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [city, setCity] = useState("")
  const [transport, setTransport] = useState("")
  const [transportCharges, setTransportCharges] = useState<number | "">("")
  const [remarks, setRemarks] = useState("")
  const [marka, setMarka] = useState("")
  const [discount, setDiscount] = useState<number | "">("")
  const [taxes, setTaxes] = useState<number | "">("")
  
  const [dateStr, setDateStr] = useState("")
  const [itemsDescription, setItemsDescription] = useState("")
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomerType, setNewCustomerType] = useState<"Direct" | "Agency">("Direct")
  
  const [items, setItems] = useState<any[]>([{
    sno: 1, style: "", brandName: "", size: "", qty: 1, rate: 0, amount: 0, finishedGoodId: ""
  }])

  const filteredInvoices = invoices.filter(
    (invoice) => {
      const q = searchQuery.toLowerCase()
      if (!q) return true
      return (
        invoice.invoiceNo?.toLowerCase().includes(q) ||
        invoice.customerName?.toLowerCase().includes(q) ||
        invoice.agencyName?.toLowerCase().includes(q) ||
        invoice.city?.toLowerCase().includes(q) ||
        invoice.itemsDescription?.toLowerCase().includes(q) ||
        new Date(invoice.date).toLocaleDateString().includes(q) ||
        invoice.items?.some(item => item.style?.toLowerCase().includes(q) || item.brandName?.toLowerCase().includes(q))
      )
    }
  )

  const getTodayStr = () => {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
  }

  const openNewInvoice = () => {
    setEditingInvoiceId(null)
    setInvoiceNo(`INV-${String(invoices.length + 1).padStart(3, "0")}`)
    setDateStr(getTodayStr())
    setCustomerName("")
    setAgencyName("")
    setCity("")
    setTransport("")
    setTransportCharges("")
    setRemarks("")
    setMarka("")
    setItemsDescription("")
    setItems([{ sno: 1, style: "", brandName: "", size: "", qty: 1, rate: 0, amount: 0 }])
    setDiscount("")
    setTaxes("")
    setIsNewCustomer(false)
    setIsDialogOpen(true)
  }

  const openEditInvoice = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id)
    setInvoiceNo(invoice.invoiceNo || "")
    const d = new Date(invoice.date)
    setDateStr(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`)
    setCustomerName(invoice.customerName)
    setAgencyName(invoice.agencyName || "")
    setCity(invoice.city || "")
    setTransport(invoice.transport || "")
    setTransportCharges(invoice.transportCharges || "")
    setRemarks(invoice.remarks || "")
    setMarka(invoice.marka || "")
    setItemsDescription(invoice.itemsDescription || "")
    setItems(invoice.items.map(item => ({ ...item })))
    setDiscount(invoice.discount || "")
    setTaxes(invoice.taxes || "")
    setIsNewCustomer(false)
    setIsDialogOpen(true)
  }

  // Listen for cross-module edit trigger via global store
  useEffect(() => {
    if (triggerEditInvoiceId) {
      const inv = invoices.find(i => i.id === triggerEditInvoiceId)
      if (inv) {
        openEditInvoice(inv)
      }
      setTriggerEditInvoiceId(null)
    }
  }, [triggerEditInvoiceId, invoices, setTriggerEditInvoiceId])

  const handleAddItem = () => {
    setItems([...items, { sno: items.length + 1, style: "", brandName: "", size: "", qty: 1, rate: 0, amount: 0, finishedGoodId: "" }])
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    // Clone the specific item object to avoid mutating the original store object
    const item = { ...newItems[index] } as any
    item[field] = value
    
    // Auto-calculate amount
    if (field === 'qty' || field === 'rate') {
      item.amount = (item.qty || 0) * (item.rate || 0)
    }
    newItems[index] = item
    setItems(newItems)
  }
  
  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      sno: i + 1
    }))
    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const parsedTransport = Number(transportCharges) || 0

  // Auto-tax: only for NEW invoices when taxMode is "percentage"
  const isAutoTax = !editingInvoiceId && activeOrg?.taxMode === "percentage" && (activeOrg?.taxPercentage || 0) > 0
  const autoTaxAmount = isAutoTax ? Math.round(subtotal * (activeOrg!.taxPercentage! / 100) * 100) / 100 : 0
  const effectiveTaxes = isAutoTax ? autoTaxAmount : (Number(taxes) || 0)

  const grandTotal = subtotal - (Number(discount) || 0) + effectiveTaxes + parsedTransport

  const handleSaveInvoice = async () => {
    if (customerName && invoiceNo && items.length > 0) {
      if (activeOrg?.strictInventoryInvoicing) {
        for (const item of items) {
          if (!item.finishedGoodId) {
            toast.error("Strict inventory is enabled. Please select a finished good from stock for all items.")
            return
          }
        }
      }

      // Stock Logic - aggregate all changes into a delta dictionary first
      const stockDelta: Record<string, number> = {} // fgId -> net quantity change (positive = deduct from stock)
      
      if (editingInvoiceId) {
        const existingInv = invoices.find(i => i.id === editingInvoiceId)
        if (existingInv) {
          // Restore old stock (negative delta = add back)
          for (const oldItem of existingInv.items) {
            const fgId = (oldItem as any).finishedGoodId
            if (fgId) {
              stockDelta[fgId] = (stockDelta[fgId] || 0) - (oldItem.qty || 0)
            }
          }
        }
      }
      
      // Deduct new stock (positive delta = remove from stock)
      for (const newItem of items) {
        if (newItem.finishedGoodId) {
          stockDelta[newItem.finishedGoodId] = (stockDelta[newItem.finishedGoodId] || 0) + (newItem.qty || 0)
        }
      }
      
      // Apply all deltas at once
      for (const [fgId, delta] of Object.entries(stockDelta)) {
        if (delta !== 0) {
          const fg = finishedGoods.find(f => f.id === fgId)
          if (fg) {
            await updateFinishedGood(fg.id, { qty: Math.max(0, fg.qty - delta) })
          }
        }
      }
      const parts = dateStr.split('/')
      let dateValue = new Date()
      if (parts.length === 3) {
        dateValue = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      }

      const invoiceData = {
        invoiceNo,
        date: dateValue.toISOString(),
        customerName,
        agencyName,
        city,
        transport,
        transportCharges: Number(transportCharges) || 0,
        remarks,
        marka,
        itemsDescription,
        items,
        subtotal,
        discount: Number(discount) || 0,
        taxes: effectiveTaxes,
        grandTotal
      }

      const isLinked = activeOrg?.linkInvoicesLedgers
      let targetAccountId: string | undefined = undefined

      if (isLinked && !editingInvoiceId) {
        if (isNewCustomer) {
          targetAccountId = await addAccount({
            name: newCustomerType === "Agency" ? agencyName : customerName,
            category: "Customer",
            type: newCustomerType,
            station: city
          })
        } else {
          const accNameToMatch = agencyName || customerName
          const existing = accounts.find(a => a.name === accNameToMatch)
          targetAccountId = existing?.id
        }
      } else if (isLinked && editingInvoiceId) {
        const existingInv = invoices.find(i => i.id === editingInvoiceId)
        if (existingInv?.ledgerEntryId) {
          const acc = accounts.find(a => a.ledger.some(l => l.id === existingInv.ledgerEntryId))
          targetAccountId = acc?.id
        }
      }

      if (editingInvoiceId) {
        await updateInvoice(editingInvoiceId, invoiceData)
        if (targetAccountId && isLinked) {
          const existingInv = invoices.find(i => i.id === editingInvoiceId)
          if (existingInv?.ledgerEntryId) {
            await updateLedgerEntry(targetAccountId, existingInv.ledgerEntryId, {
              date: dateValue.toISOString(),
              party: `${invoiceNo} - ${customerName}`,
              station: city,
              amount: subtotal,
              discount: Number(discount) || 0,
              taxOrPaid: effectiveTaxes + parsedTransport,
              netAmount: grandTotal,
              items: itemsDescription
            })
          }
        }
      } else {
        let ledgerEntryId: string | undefined = undefined
        if (targetAccountId && isLinked) {
          ledgerEntryId = await addLedgerEntry(targetAccountId, {
            date: dateValue.toISOString(),
            party: `${invoiceNo} - ${customerName}`,
            station: city,
            amount: subtotal,
            discount: Number(discount) || 0,
            taxOrPaid: effectiveTaxes + parsedTransport,
            netAmount: grandTotal,
            items: itemsDescription,
            payment: 0,
            type: "bill"
          })
        }

        const newInvId = await addInvoice({
          ...invoiceData,
          ledgerEntryId
        })
        
        if (targetAccountId && ledgerEntryId) {
          await updateLedgerEntry(targetAccountId, ledgerEntryId, { invoiceId: newInvId })
        }
      }
      setIsDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    const currency = activeOrg?.currency || "INR"
    const locale = currency === "INR" ? "en-IN" : currency === "EUR" ? "de-DE" : "en-US"
    const symbol = currency === "INR" ? "INR" : currency === "EUR" ? "EUR" : "USD"
    
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: symbol,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  const getStatusConfig = (status: Invoice["status"]) => {
    switch (status) {
      case "paid": return { icon: CheckCircle, label: "Paid", className: "bg-accent/20 text-accent" }
      case "pending": return { icon: Clock, label: "Pending", className: "bg-warning/20 text-warning" }
      case "overdue": return { icon: XCircle, label: "Overdue", className: "bg-destructive/20 text-destructive" }
    }
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.items) {
      for (const item of invoice.items) {
        if ((item as any).finishedGoodId) {
          const fg = finishedGoods.find(f => f.id === (item as any).finishedGoodId)
          if (fg) {
            await updateFinishedGood(fg.id, { qty: fg.qty + (item.qty || 0) })
          }
        }
      }
    }
    await deleteInvoice(invoice.id)
  }

  const getPendingDaysColor = (dateString: string, status: Invoice["status"]) => {
    if (status === "paid") return "text-muted-foreground"
    const diffTime = new Date().getTime() - new Date(dateString).getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays >= 120) return "text-red-500 font-bold"
    if (diffDays >= 90) return "text-orange-500 font-bold"
    if (diffDays >= 60) return "text-yellow-500 font-bold"
    if (diffDays >= 30) return "text-blue-500 font-bold"
    return "text-muted-foreground"
  }

  const generatePDF = async (invoice: Invoice) => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    
    const doc = new jsPDF()
    const primaryColor = [16, 133, 252] as [number, number, number]
    
    // Header
    doc.setFontSize(28)
    doc.setTextColor(...primaryColor)
    doc.text(organization, 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(80)
    const orgAddress = activeOrg?.address || ""
    const orgCity = activeOrg?.city || ""
    const orgState = activeOrg?.state || ""
    const fullAddress = [orgAddress, orgCity, orgState].filter(Boolean).join(", ")
    doc.text(fullAddress, 14, 30)
    if (activeOrg?.gstNumber) {
      doc.text(`GST: ${activeOrg.gstNumber}`, 14, 35)
    }
    
    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0)
    doc.text("INVOICE", 140, 22)

    doc.setFontSize(10)
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 140, 30)
    doc.text(`Date: ${formatDate(invoice.date)}`, 140, 36)
    
    let metaY = 42
    if (invoice.transport) { doc.text(`Transport: ${invoice.transport}`, 140, metaY); metaY+=6 }
    if (invoice.marka) { doc.text(`Marka: ${invoice.marka}`, 140, metaY); metaY+=6 }
    if (invoice.remarks) { doc.text(`Remarks: ${invoice.remarks}`, 140, metaY); metaY+=6 }

    // Bill To
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.text("BILL TO:", 14, 46)
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.customerName, 14, 54)
    
    let bY = 60
    if (invoice.agencyName) { doc.text(`Agency: ${invoice.agencyName}`, 14, bY); bY+=6 }
    if (invoice.city) { doc.text(`City: ${invoice.city}`, 14, bY); bY+=6 }

    // Table
    const showBrand = activeOrg?.invoiceShowBrandName !== false
    const showSize = activeOrg?.invoiceShowSize !== false

    const tableHead = [
      'S.No', 
      'Product', 
      ...(showBrand ? [activeOrg?.invoiceBrandNameLabel || 'Brand Name'] : []),
      ...(showSize ? [activeOrg?.invoiceSizeLabel || 'Size'] : []),
      'Qty', 
      'Price', 
      'Amount'
    ]

    const tableData = invoice.items.map(item => [
      item.sno, 
      item.style, 
      ...(showBrand ? [item.brandName] : []),
      ...(showSize ? [item.size] : []),
      item.qty, 
      item.rate, 
      item.amount
    ])

    const footColSpan = 2 + (showBrand ? 1 : 0) + (showSize ? 1 : 0)
    const footEmptyCols = Array(footColSpan).fill('')

    autoTable(doc, {
      startY: Math.max(bY, metaY) + 10,
      head: [tableHead],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor },
      foot: [
        [...footEmptyCols, 'Subtotal', '', `${invoice.subtotal}`],
        [...footEmptyCols, 'Discount', '', `-${invoice.discount}`],
        [...footEmptyCols, 'Taxes+Expense', '', `+${(invoice.taxes || 0) + (invoice.transportCharges || 0)}`],
        [...footEmptyCols, 'Grand Total', '', `${invoice.grandTotal}`],
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    })

    const safeFilename = (invoice.invoiceNo || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')
    
    // Explicit HTML5 strict local download to guarantee exact filename behavior:
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

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((sum, inv) => sum + inv.grandTotal, 0)
  const pendingAmount = invoices.filter((i) => i.status === "pending").reduce((sum, inv) => sum + inv.grandTotal, 0)

  // Autocomplete helpers - only Customer category accounts
  const customerAccounts = accounts.filter(a => a.category === "Customer")
  const uniqueCustomers = Array.from(new Set(customerAccounts.filter(a => a.type === "Direct").map(a => a.name)))
  const uniqueAgencies = Array.from(new Set(customerAccounts.filter(a => a.type === "Agency").map(a => a.name)))

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 rounded-xl bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary" />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" onClick={openNewInvoice}>
              <Plus className="w-5 h-5 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-border bg-card w-[95vw] sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-7xl p-0 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 pb-4 border-b border-border bg-muted/20 shrink-0">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold tracking-tight">{editingInvoiceId ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
                <DialogDescription className="text-muted-foreground">Fill out the party details and line items below.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {activeOrg?.linkInvoicesLedgers && !editingInvoiceId && (
                  <div className="flex items-center gap-4 bg-primary/10 p-3 rounded-xl border border-primary/20">
                    <input
                      type="checkbox"
                      id="isNewCustomer"
                      checked={isNewCustomer}
                      onChange={(e) => setIsNewCustomer(e.target.checked)}
                      className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <label htmlFor="isNewCustomer" className="text-sm font-bold text-foreground cursor-pointer">
                        New Customer (Create Ledger)
                      </label>
                      <span className="text-xs text-muted-foreground">
                        Automatically create a new ledger account for this invoice.
                      </span>
                    </div>
                    {isNewCustomer && (
                      <div className="ml-auto">
                        <select
                          value={newCustomerType}
                          onChange={(e) => setNewCustomerType(e.target.value as any)}
                          className="rounded-lg h-9 bg-background border border-border text-sm px-3 focus-visible:ring-primary outline-none font-medium shadow-sm"
                        >
                          <option value="Direct">Direct</option>
                          <option value="Agency">Agency</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Agency Name</label>
                    {isNewCustomer ? (
                      <Input 
                        placeholder={newCustomerType === "Agency" ? "e.g. XYZ AGENCIES" : "N/A (Direct)"} 
                        value={newCustomerType === "Agency" ? agencyName : ""} 
                        onChange={(e) => setAgencyName(e.target.value)} 
                        disabled={!!editingInvoiceId || newCustomerType === "Direct"}
                        className="rounded-lg h-10 bg-background border-border/50 focus-visible:ring-primary disabled:opacity-50 font-medium" 
                      />
                    ) : (
                      <select
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        disabled={!!editingInvoiceId}
                        className="w-full rounded-lg h-10 bg-background border border-border/50 px-3 text-sm focus-visible:ring-primary outline-none disabled:opacity-50 font-medium shadow-sm"
                      >
                        <option value="">Select Agency (Optional)...</option>
                        {uniqueAgencies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="col-span-1 md:col-span-1 lg:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Customer Name</label>
                    {isNewCustomer || agencyName ? (
                      <Input 
                        placeholder="e.g. ABC RETAIL PVT LTD" 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)} 
                        disabled={!!editingInvoiceId} 
                        className="rounded-lg h-10 bg-background border-border/50 focus-visible:ring-primary disabled:opacity-50 font-medium" 
                      />
                    ) : (
                      <select
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={!!editingInvoiceId}
                        className="w-full rounded-lg h-10 bg-background border border-border/50 px-3 text-sm focus-visible:ring-primary outline-none disabled:opacity-50 font-medium shadow-sm"
                      >
                        <option value="">Select Customer...</option>
                        {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="col-span-1 lg:col-span-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Invoice No</label>
                    <Input placeholder="INV-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="rounded-lg h-10 bg-background border-border/50 font-mono font-bold text-primary" />
                  </div>

                  <div className="col-span-1 lg:col-span-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Date</label>
                    <Input placeholder="dd/mm/yyyy" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="rounded-lg h-10 bg-background border-border/50 font-mono" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">City</label>
                  <Input placeholder="e.g. City A" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-lg h-10 bg-background border-border/50" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Item Summary</label>
                  <Input placeholder="e.g. SHIRTS" value={itemsDescription} onChange={(e) => setItemsDescription(e.target.value)} className="rounded-lg h-10 bg-background border-border/50" />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Transport</label>
                  <Input placeholder="e.g. V-Trans" value={transport} onChange={(e) => setTransport(e.target.value)} className="rounded-lg h-10 bg-background border-border/50" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Marka</label>
                  <Input placeholder="e.g. MRK-001" value={marka} onChange={(e) => setMarka(e.target.value)} className="rounded-lg h-10 bg-background border-border/50" />
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Remarks</label>
                  <Input placeholder="Any additional notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="rounded-lg h-10 bg-background border-border/50 w-full" />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left w-12">S.No</th>
                      <th className="p-3 text-left">Product</th>
                      {activeOrg?.invoiceShowBrandName !== false && <th className="p-3 text-left w-48">{activeOrg?.invoiceBrandNameLabel || "Brand Name"}</th>}
                      {activeOrg?.invoiceShowSize !== false && <th className="p-3 text-left w-24">{activeOrg?.invoiceSizeLabel || "Size"}</th>}
                      <th className="p-3 text-left w-24">Qty</th>
                      <th className="p-3 text-left w-28">Price</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/50">
                        <td className="p-2 text-center text-muted-foreground">{item.sno}</td>
                        <td className="p-2">
                          {activeOrg?.strictInventoryInvoicing ? (
                            <select
                              className="w-full h-9 border-0 bg-muted/50 rounded-lg text-sm px-2 focus-visible:ring-1 focus-visible:ring-primary outline-none"
                              value={item.finishedGoodId || ''}
                              onChange={e => {
                                const fgId = e.target.value;
                                const fg = finishedGoods.find(f => f.id === fgId);
                                if (fg) {
                                  const newItems = [...items];
                                  const it = newItems[idx] as any;
                                  it.finishedGoodId = fg.id;
                                  it.style = fg.name;
                                  it.size = fg.size || "";
                                  it.qty = 1;
                                  it.rate = 0;
                                  it.amount = 0;
                                  setItems(newItems);
                                } else {
                                  handleItemChange(idx, 'finishedGoodId', '');
                                  handleItemChange(idx, 'style', '');
                                }
                              }}
                            >
                              <option value="">Select Item...</option>
                              {finishedGoods.filter(f => f.qty > 0 || f.id === item.finishedGoodId).map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.qty} in stock)</option>
                              ))}
                            </select>
                          ) : (
                            <Input className="h-9 border-0 bg-muted/50 rounded-lg text-sm min-w-24" value={item.style ?? ''} onChange={e => handleItemChange(idx, 'style', e.target.value)} />
                          )}
                        </td>
                        {activeOrg?.invoiceShowBrandName !== false && <td className="p-2"><Input className="h-9 border-0 bg-muted/50 rounded-lg text-sm min-w-32" value={item.brandName ?? ''} onChange={e => handleItemChange(idx, 'brandName', e.target.value)} /></td>}
                        {activeOrg?.invoiceShowSize !== false && <td className="p-2"><Input className="h-9 border-0 bg-muted/50 rounded-lg text-sm min-w-20" value={item.size ?? ''} onChange={e => handleItemChange(idx, 'size', e.target.value)} /></td>}
                        <td className="p-2"><Input type="number" className="h-9 border-0 bg-muted/50 rounded-lg text-sm min-w-16" value={item.qty ?? ''} onChange={e => handleItemChange(idx, 'qty', e.target.value === '' ? '' : Number(e.target.value))} /></td>
                        <td className="p-2"><Input type="number" className="h-9 border-0 bg-muted/50 rounded-lg text-sm min-w-20" value={item.rate ?? ''} onChange={e => handleItemChange(idx, 'rate', e.target.value === '' ? '' : Number(e.target.value))} /></td>
                        <td className="p-2 text-right font-medium min-w-24">{formatCurrency(item.amount)}</td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" className="w-full border-dashed rounded-xl" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item Row
              </Button>

              <div className="flex flex-col items-end gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-8 w-full max-w-xs justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex items-center gap-8 w-full max-w-xs justify-between">
                  <span className="text-sm text-muted-foreground">Discount:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8 bg-muted border-0 text-right text-sm" 
                      value={discount ?? ""} 
                      onChange={(e) => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full max-w-xs justify-between">
                  <span className="text-sm text-muted-foreground">Taxes{isAutoTax ? ` (${activeOrg?.taxPercentage}%)` : ''}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">+</span>
                    {isAutoTax ? (
                      <span className="w-24 h-8 bg-primary/10 border border-primary/20 rounded text-right text-sm font-semibold px-2 flex items-center justify-end text-primary">
                        {formatCurrency(autoTaxAmount)}
                      </span>
                    ) : (
                      <Input 
                        type="number" 
                        className="w-24 h-8 bg-muted border-0 text-right text-sm" 
                        value={taxes ?? ""} 
                        onChange={(e) => setTaxes(e.target.value === "" ? "" : Number(e.target.value))} 
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full max-w-xs justify-between">
                  <span className="text-sm text-muted-foreground">Other Expenses:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">+</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8 bg-muted border-0 text-right text-sm" 
                      value={transportCharges ?? ""} 
                      onChange={(e) => setTransportCharges(e.target.value === "" ? "" : Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full max-w-xs justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-lg font-bold text-foreground">Grand Total:</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 flex-1 sm:flex-none px-8">Cancel</Button>
              <Button onClick={handleSaveInvoice} disabled={!customerName || !invoiceNo} className="rounded-xl bg-primary hover:bg-primary/90 h-11 flex-1 sm:flex-none px-8 shadow-lg shadow-primary/20">
                {editingInvoiceId ? "Save Changes" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Invoice</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Customer & Agency</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Total Quantity</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Grand Total</th>
                <th className="text-center p-4 text-sm font-semibold text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => {
                const statusConfig = getStatusConfig(invoice.status)
                const StatusIcon = statusConfig.icon
                const totalQty = invoice.items.reduce((s, i) => s + (i.qty || 0), 0)
                return (
                  <tr key={invoice.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", index === filteredInvoices.length - 1 && "border-b-0")}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{invoice.invoiceNo}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-foreground tracking-tight">{invoice.customerName}</span>
                        {invoice.agencyName && <span className="text-xs text-muted-foreground uppercase">{invoice.agencyName}</span>}
                      </div>
                    </td>
                    <td className="p-4"><span className={getPendingDaysColor(invoice.date, invoice.status)}>{formatDate(invoice.date)}</span></td>
                    <td className="p-4">
                      <Badge className={cn("rounded-lg px-3 py-1 font-medium border-0 gap-1", statusConfig.className)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-muted-foreground font-medium">{totalQty} pcs</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-lg text-foreground">{formatCurrency(invoice.grandTotal)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl"><MoreHorizontal className="w-5 h-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="rounded-lg gap-2" onClick={() => openEditInvoice(invoice)}>
                            <Edit2 className="w-4 h-4" /> Edit Invoice
                          </DropdownMenuItem>
                          {invoice.status !== "paid" ? (
                            <DropdownMenuItem className="rounded-lg gap-2 text-accent font-medium bg-accent/5 hover:bg-accent/10" onClick={() => updateInvoice(invoice.id, { status: "paid" })}>
                              <CheckCircle className="w-4 h-4" /> Mark as Paid
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="rounded-lg gap-2 text-warning font-medium bg-warning/5 hover:bg-warning/10" onClick={() => updateInvoice(invoice.id, { status: "pending" })}>
                              <Clock className="w-4 h-4" /> Mark as Pending
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="rounded-lg gap-2" onClick={() => generatePDF(invoice)}>
                            <Download className="w-4 h-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg gap-2 font-medium text-primary bg-primary/5" onClick={() => printBarcodes(invoice.items)}>
                            <Barcode className="w-4 h-4" /> Print Barcodes
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg gap-2 text-destructive" onClick={() => handleDeleteInvoice(invoice)}>
                            <Trash2 className="w-4 h-4" /> Delete Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No invoices found</p>
          </div>
        )}

        <div className="border-t border-border bg-muted/30 p-4">
          <span className="text-sm text-muted-foreground">Showing {filteredInvoices.length} of {invoices.length} invoices</span>
        </div>
      </div>
    </div>
  )
}
