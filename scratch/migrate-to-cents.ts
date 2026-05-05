import { prisma } from '../src/lib/prisma'

async function migrate() {
  console.log("🚀 Starting database migration to cents...")

  // 1. Update Accounts
  const accounts = await prisma.account.findMany()
  for (const acc of accounts) {
    await prisma.account.update({
      where: { id: acc.id },
      data: { balance: Math.round(Number(acc.balance) * 100) }
    })
  }
  console.log(`✅ Migrated ${accounts.length} accounts.`)

  // 2. Update Ledger Entries
  const entries = await prisma.ledgerEntry.findMany()
  for (const entry of entries) {
    await prisma.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        amount: Math.round(Number(entry.amount) * 100),
        discount: Math.round(Number(entry.discount) * 100),
        taxOrPaid: Math.round(Number(entry.taxOrPaid) * 100),
        netAmount: Math.round(Number(entry.netAmount) * 100),
        payment: Math.round(Number(entry.payment) * 100),
      }
    })
  }
  console.log(`✅ Migrated ${entries.length} ledger entries.`)

  // 3. Update Invoices
  const invoices = await prisma.invoice.findMany()
  for (const inv of invoices) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        transportCharges: Math.round(Number(inv.transportCharges) * 100),
        subtotal: Math.round(Number(inv.subtotal) * 100),
        discount: Math.round(Number(inv.discount) * 100),
        taxes: Math.round(Number(inv.taxes) * 100),
        grandTotal: Math.round(Number(inv.grandTotal) * 100),
      }
    })
  }
  console.log(`✅ Migrated ${invoices.length} invoices.`)

  // 4. Update Invoice Items
  const items = await prisma.itemRow.findMany()
  for (const item of items) {
    await prisma.itemRow.update({
      where: { id: item.id },
      data: {
        rate: Math.round(Number(item.rate) * 100),
        amount: Math.round(Number(item.amount) * 100),
      }
    })
  }
  console.log(`✅ Migrated ${items.length} invoice line items.`)

  // 5. Update Inventory
  const rms = await prisma.rawMaterial.findMany()
  for (const rm of rms) {
    await prisma.rawMaterial.update({ 
      where: { id: rm.id }, 
      data: { 
        price: Math.round(Number(rm.price) * 100), 
        total: Math.round(Number(rm.total) * 100) 
      }
    })
  }
  
  const fgs = await prisma.finishedGood.findMany()
  for (const fg of fgs) {
    await prisma.finishedGood.update({ 
      where: { id: fg.id }, 
      data: { cost: Math.round(Number(fg.cost) * 100) }
    })
  }
  
  const processes = await prisma.manufacturingProcess.findMany()
  for (const p of processes) {
    await prisma.manufacturingProcess.update({
        where: { id: p.id },
        data: {
            price: Math.round(Number(p.price) * 100),
            total: Math.round(Number(p.total) * 100)
        }
    })
  }

  const usages = await prisma.rawMaterialUsage.findMany()
  for (const u of usages) {
    await prisma.rawMaterialUsage.update({
        where: { id: u.id },
        data: {
            cost: Math.round(Number(u.cost) * 100)
        }
    })
  }

  console.log("🎉 Migration complete! Your data is now cents-compatible.")
}

migrate()
  .catch(e => console.error("❌ Migration failed:", e))
  .finally(() => prisma.$disconnect())
