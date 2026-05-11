import { LedgerEntry, Invoice } from "@/types"
import { formatCurrency as globalFormatCurrency } from "@/lib/utils"

export const splitParty = (partyStr: string) => {
  if (!partyStr) return { invNo: "-", party: "-" };
  if (partyStr.includes(" - ")) {
    const parts = partyStr.split(" - ");
    return { invNo: parts[0], party: parts.slice(1).join(" - ") };
  }
  return { invNo: "-", party: partyStr };
}

export async function exportLedgerPDF(
  entriesToExport: LedgerEntry[],
  selectedAccount: { name: string, station?: string },
  activeOrg: { name: string }
) {
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

export async function exportInvoicePDF(
  invoice: Invoice,
  activeOrg: { name: string, address?: string, city?: string, state?: string, gstNumber?: string, invoiceShowBrandName?: boolean, invoiceBrandNameLabel?: string, invoiceShowSize?: boolean, invoiceSizeLabel?: string }
) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  
  const doc = new jsPDF()
  const primaryColor = [16, 133, 252] as [number, number, number]
  
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  // Header
  doc.setFontSize(28)
  doc.setTextColor(...primaryColor)
  doc.text(activeOrg?.name || "Parasnath Jeans", 14, 22)
  
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
    'Price (Rs)', 
    'Amount (Rs)'
  ]

  const formatPdfCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const tableData = invoice.items.map(item => [
    item.sno, 
    item.style || "", 
    ...(showBrand ? [item.brandName || ""] : []),
    ...(showSize ? [item.size || ""] : []),
    item.qty, 
    formatPdfCurrency(item.rate), 
    formatPdfCurrency(item.amount)
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
      [...footEmptyCols, 'Subtotal', '', formatPdfCurrency(invoice.subtotal)],
      [...footEmptyCols, 'Discount', '', `-${formatPdfCurrency(invoice.discount)}`],
      [...footEmptyCols, 'Taxes+Expense', '', `+${formatPdfCurrency((invoice.taxes || 0) + (invoice.transportCharges || 0))}`],
      [...footEmptyCols, 'Grand Total (Rs)', '', formatPdfCurrency(invoice.grandTotal)],
    ],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 }, // S.No
      1: { halign: 'left', cellWidth: 'auto' }, // Product
      ...(showBrand ? { 2: { halign: 'left', cellWidth: 'auto' } } : {}), // Brand
      ...(showSize ? { [showBrand ? 3 : 2]: { halign: 'center', cellWidth: 20 } } : {}), // Size
      [footColSpan - 2]: { halign: 'center', cellWidth: 20 }, // Qty
      [footColSpan - 1]: { halign: 'right', cellWidth: 35 }, // Price
      [footColSpan]: { halign: 'right', cellWidth: 35 } // Amount
    }
  })

  const safeFilename = (invoice.invoiceNo || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')
  
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
