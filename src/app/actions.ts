"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { login as setSession, verifySession, logout as clearSession } from "@/lib/session"
import { revalidatePath } from "next/cache"

// -------------------------------------------------------------------------------- //
// AUTHENTICATION ACTIONS
// -------------------------------------------------------------------------------- //

export async function checkFreshInstall() {
  const count = await prisma.organization.count()
  return count === 0
}

export async function serverLogin(orgId: string, password?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  })

  if (!org) throw new Error("Organization not found")
  
  if (!org.masterPasswordHash) {
     await setSession(orgId)
     return { success: true }
  }

  if (!password) throw new Error("Password required")

  // Check if hash is BCrypt (starts with $2a$ or $2b$)
  const isBcrypt = org.masterPasswordHash.startsWith("$2");
  
  if (isBcrypt) {
    const isValid = await bcrypt.compare(password, org.masterPasswordHash)
    if (!isValid) throw new Error("Invalid password")
  } else {
    // legacy SHA-256 check for automatic migration
    // A SHA-256 hash is always 64 hex characters
    if (org.masterPasswordHash.length === 64) {
       // We'll use a simple verification: if they provide a password, 
       // and we are in migration mode, we will allow them to 'Reset' 
       // but actually let's just do a quick SHA-256 on the server to be sure.
       const hash = crypto.createHash('sha256').update(password).digest('hex');
       if (hash === org.masterPasswordHash) {
          // SUCCESS! Now migrate to bcrypt automatically
          const salt = await bcrypt.genSalt(10)
          const newHash = await bcrypt.hash(password, salt)
          await prisma.organization.update({
            where: { id: orgId },
            data: { masterPasswordHash: newHash }
          })
          console.log(`Successfully migrated password hash for org: ${orgId}`)
       } else {
          throw new Error("Invalid password")
       }
    } else {
       throw new Error("Invalid password format")
    }
  }

  await setSession(orgId)
  return { success: true }
}

export async function serverLogout() {
  await clearSession()
}

export async function serverSetMasterPasswordHash(password: string, orgId?: string) {
  // Hash on server!
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  if (orgId) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { masterPasswordHash: hash }
    })
  } else {
    const org = await prisma.organization.findFirst()
    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { masterPasswordHash: hash }
      })
    }
  }
}

// -------------------------------------------------------------------------------- //
// DATA ACTIONS (PROTECTED)
// -------------------------------------------------------------------------------- //

export async function fetchStoreContext(orgId: string) {
  // STRICT: Verify the session belongs to the requested Org
  await verifySession(orgId)

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, gstNumber: true, panNumber: true, address: true, city: true, state: true, linkInvoicesLedgers: true, linkInvoicesChanged: true, inventoryEnabled: true, strictInventoryInvoicing: true, currency: true, invoiceShowBrandName: true, invoiceShowSize: true, invoiceBrandNameLabel: true, invoiceSizeLabel: true, taxMode: true, taxPercentage: true }
  })
  
  const activeOrg = organizations.find((o) => o.id === orgId)
  if (!activeOrg) throw new Error("Unauthorized access to organization data")

  const [accounts, invoices, rawMaterials, wipGoods, finishedGoods] = await Promise.all([
    prisma.account.findMany({ where: { orgId: activeOrg.id }, include: { ledger: true } }),
    prisma.invoice.findMany({ where: { orgId: activeOrg.id }, include: { items: true }, orderBy: { date: 'desc' }, take: 500 }),
    prisma.rawMaterial.findMany({ where: { orgId: activeOrg.id }, orderBy: { date: 'desc' } }),
    prisma.wIPGood.findMany({ where: { orgId: activeOrg.id }, include: { rawMaterials: true, jobWorks: true }, orderBy: { date: 'desc' } }),
    prisma.finishedGood.findMany({ where: { orgId: activeOrg.id }, orderBy: { date: 'desc' } })
  ])

  return { organizations, accounts, invoices, rawMaterials, wipGoods, finishedGoods }
}


export async function serverAddInvoice(orgId: string, invoicePayload: any) {
  await verifySession(orgId)
  const { items, ...inv } = invoicePayload
  
  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) throw new Error("Invoice must have items")
  const date = inv.date ? new Date(inv.date) : new Date()
  
  return await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({ where: { id: orgId } })
    
    // 1. If strict inventory is on, decrement stock
    if (org?.strictInventoryInvoicing) {
      for (const item of items) {
        if (item.finishedGoodId) {
          const fg = await tx.finishedGood.findUnique({ where: { id: item.finishedGoodId } })
          if (!fg || fg.qty < item.qty) {
            throw new Error(`Insufficient stock for ${fg?.name || 'Item'}. Available: ${fg?.qty || 0}, Required: ${item.qty}`)
          }
          await tx.finishedGood.update({
            where: { id: item.finishedGoodId },
            data: { qty: { decrement: Math.max(0, item.qty) } }
          })
        }
      }
    }

    // 2. Create Invoice
    return await tx.invoice.create({
      data: {
        ...inv,
        date,
        orgId,
        items: {
          create: items.map(({ id: _id, ...item }: any) => ({
             ...item,
             qty: Math.max(0, Number(item.qty) || 0),
             rate: Math.max(0, Number(item.rate) || 0),
             amount: Math.max(0, Number(item.amount) || 0)
          }))
        }
      }
    })
  })
}


export async function serverUpdateInvoice(id: string, updates: any) {
  const inv = await prisma.invoice.findUnique({ 
    where: { id }, 
    include: { items: true, organization: true } 
  })
  if (!inv) throw new Error("Invoice not found")
  await verifySession(inv.orgId)

  const { items, date, ...rest } = updates
  const data: any = { ...rest }
  if (date) data.date = new Date(date)

  return await prisma.$transaction(async (tx) => {
    // 1. If strict inventory is on, reconcile stock
    if (inv.organization.strictInventoryInvoicing) {
      // Return old quantities
      for (const oldItem of inv.items) {
        if (oldItem.finishedGoodId) {
          await tx.finishedGood.update({
            where: { id: oldItem.finishedGoodId },
            data: { qty: { increment: oldItem.qty } }
          })
        }
      }
      // Deduct new quantities
      if (items && Array.isArray(items)) {
        for (const newItem of items) {
          if (newItem.finishedGoodId) {
            const fg = await tx.finishedGood.findUnique({ where: { id: newItem.finishedGoodId } })
            if (!fg || fg.qty < newItem.qty) {
              throw new Error(`Insufficient stock for ${fg?.name || 'Item'}. Available: ${fg?.qty || 0}, Required: ${newItem.qty}`)
            }
            await tx.finishedGood.update({
              where: { id: newItem.finishedGoodId },
              data: { qty: { decrement: newItem.qty } }
            })
          }
        }
      }
    }

    // 2. Update Invoice
    if (items && Array.isArray(items)) {
      data.items = {
        deleteMany: {},
        create: items.map(({ id: _id, invoiceId: _invId, ...itemProps }: any) => itemProps)
      }
    }

    return await tx.invoice.update({
      where: { id },
      data
    })
  })
}


export async function serverDeleteInvoice(id: string) {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { organization: true } })
  if (!inv) return
  await verifySession(inv.orgId)
  
  await prisma.$transaction(async (tx) => {
    // 1. If it was linked to a ledger, delete the ledger entry too
    if (inv.ledgerEntryId) {
      const entry = await tx.ledgerEntry.findUnique({ where: { id: inv.ledgerEntryId } })
      if (entry) {
        const impact = (entry.amount - entry.discount + entry.taxOrPaid - entry.payment)
        await tx.ledgerEntry.delete({ where: { id: inv.ledgerEntryId } })
        await tx.account.update({ 
          where: { id: entry.accountId }, 
          data: { balance: { decrement: impact } } 
        })
      }
    }
    
    // 2. Return stock if inventory was strictly managed
    if (inv.organization.strictInventoryInvoicing) {
      const items = await tx.itemRow.findMany({ where: { invoiceId: id } })
      for (const item of items) {
        if (item.finishedGoodId) {
          await tx.finishedGood.update({
            where: { id: item.finishedGoodId },
            data: { qty: { increment: item.qty } }
          })
        }
      }
    }

    // 3. Delete the invoice itself
    await tx.invoice.delete({ where: { id } })
  })
}


export async function serverAddAccount(orgId: string, accountPayload: any) {
  await verifySession(orgId)
  return await prisma.account.create({
    data: {
      ...accountPayload,
      orgId
    }
  })
}

export async function serverUpdateAccount(id: string, updates: any) {
  const acc = await prisma.account.findUnique({ where: { id } })
  if (!acc) throw new Error("Account not found")
  await verifySession(acc.orgId)

  return await prisma.account.update({
    where: { id },
    data: updates
  })
}

export async function serverDeleteAccount(id: string) {
  const acc = await prisma.account.findUnique({ where: { id } })
  if (!acc) return
  await verifySession(acc.orgId)
  await prisma.account.delete({ where: { id } })
}

// -------------------------------------------------------------------------------- //
// LEDGER ACTIONS (WITH TRANSACTIONS)
// -------------------------------------------------------------------------------- //

export async function serverAddLedgerEntry(accountId: string, entryPayload: any) {
  const acc = await prisma.account.findUnique({ where: { id: accountId } })
  if (!acc) throw new Error("Account not found")
  await verifySession(acc.orgId)

  const { id: _id, date, ...rest } = entryPayload
  
  return await prisma.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.create({
      data: {
        ...rest,
        date: new Date(date),
        accountId
      }
    })
    
    // Update balance incrementally
    await tx.account.update({
      where: { id: accountId },
      data: { 
        balance: { 
          increment: (rest.amount || 0) - (rest.discount || 0) + (rest.taxOrPaid || 0) - (rest.payment || 0) 
        } 
      }
    })
    
    return entry
  })
}

export async function serverUpdateLedgerEntry(id: string, updates: any) {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id }, include: { account: true } })
  if (!entry) throw new Error("Entry not found")
  await verifySession(entry.account.orgId)

  const { date, ...rest } = updates
  const data: any = { ...rest }
  if (date) data.date = new Date(date)
  
  return await prisma.$transaction(async (tx) => {
    const old = await tx.ledgerEntry.findUnique({ where: { id } })
    if (!old) throw new Error("Entry not found")

    const updated = await tx.ledgerEntry.update({
      where: { id },
      data
    })
    
    // Calculate the difference and update balance incrementally
    const oldImpact = (old.amount - old.discount + old.taxOrPaid - old.payment)
    const newImpact = (updated.amount - updated.discount + updated.taxOrPaid - updated.payment)
    const diff = newImpact - oldImpact

    await tx.account.update({ 
      where: { id: entry.accountId }, 
      data: { balance: { increment: diff } } 
    })
    
    return updated
  })
}

export async function serverDeleteLedgerEntry(id: string) {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id }, include: { account: true } })
  if (!entry) return
  await verifySession(entry.account.orgId)
  
  const accountId = entry.accountId
  return await prisma.$transaction(async (tx) => {
    const impact = (entry.amount - entry.discount + entry.taxOrPaid - entry.payment)
    await tx.ledgerEntry.delete({ where: { id } })
    await tx.account.update({ 
      where: { id: accountId }, 
      data: { balance: { decrement: impact } } 
    })
  })
}


// -------------------------------------------------------------------------------- //
// ORGANIZATION & INVENTORY ACTIONS
// -------------------------------------------------------------------------------- //

export async function serverListOrganizations() {
  return await prisma.organization.findMany({
    select: { id: true, name: true }
  })
}

export async function serverDeleteOrganization(id: string) {
  await verifySession(id)
  await prisma.organization.delete({ where: { id } })
}

export async function serverAddOrganization(name: string, newId: string, password?: string, linkInvoicesLedgers?: boolean) {
  let hash = null
  if (password) {
    const salt = await bcrypt.genSalt(10)
    hash = await bcrypt.hash(password, salt)
  }

  return await prisma.organization.create({
    data: {
      id: newId,
      name,
      masterPasswordHash: hash,
      linkInvoicesLedgers: linkInvoicesLedgers || false,
      linkInvoicesChanged: !!linkInvoicesLedgers,
    }
  })
}

export async function serverUpdateOrganization(id: string, updates: any) {
  await verifySession(id)
  // Prevent direct password hash update through this general function
  const { masterPasswordHash: _, ...safeUpdates } = updates
  await prisma.organization.update({
    where: { id },
    data: safeUpdates
  })
}

export async function serverAddRawMaterial(orgId: string, payload: any) {
  await verifySession(orgId)
  const { date, ...rest } = payload
  return await prisma.rawMaterial.create({
    data: { ...rest, date: new Date(date), orgId }
  })
}

export async function serverUpdateRawMaterial(id: string, updates: any) {
  const rm = await prisma.rawMaterial.findUnique({ where: { id } })
  if (!rm) throw new Error("Not found")
  await verifySession(rm.orgId)

  const { date, ...rest } = updates
  const data: any = { ...rest }
  if (date) data.date = new Date(date)
  
  return await prisma.rawMaterial.update({ where: { id }, data })
}

export async function serverDeleteRawMaterial(id: string) {
  const rm = await prisma.rawMaterial.findUnique({ where: { id } })
  if (!rm) return
  await verifySession(rm.orgId)
  return await prisma.rawMaterial.delete({ where: { id } })
}

export async function serverAddWIPGood(orgId: string, payload: any) {
  await verifySession(orgId)
  const { date, rawMaterials, jobWorks, ...rest } = payload
  return await prisma.wIPGood.create({
    data: {
      ...rest,
      date: new Date(date),
      orgId,
      rawMaterials: rawMaterials ? { create: rawMaterials.map(({ id: _id, ...rm }: any) => rm) } : undefined,
      jobWorks: jobWorks ? { create: jobWorks.map(({ id: _id, ...jw }: any) => jw) } : undefined
    }
  })
}

export async function serverUpdateWIPGood(id: string, updates: any) {
  const wip = await prisma.wIPGood.findUnique({ where: { id } })
  if (!wip) throw new Error("Not found")
  await verifySession(wip.orgId)

  const { date, rawMaterials, jobWorks, ...rest } = updates
  const data: any = { ...rest }
  if (date) data.date = new Date(date)
  
  if (rawMaterials) {
    data.rawMaterials = { deleteMany: {}, create: rawMaterials.map(({ id: _id, wipId: _wipId, ...rm }: any) => rm) }
  }
  if (jobWorks) {
    data.jobWorks = { deleteMany: {}, create: jobWorks.map(({ id: _id, wipId: _wipId, ...jw }: any) => jw) }
  }

  return await prisma.wIPGood.update({ where: { id }, data })
}

export async function serverDeleteWIPGood(id: string) {
  const wip = await prisma.wIPGood.findUnique({ where: { id } })
  if (!wip) return
  await verifySession(wip.orgId)
  return await prisma.wIPGood.delete({ where: { id } })
}

export async function serverAddFinishedGood(orgId: string, payload: any) {
  await verifySession(orgId)
  const { date, ...rest } = payload
  return await prisma.finishedGood.create({
    data: { ...rest, date: new Date(date), orgId }
  })
}

export async function serverUpdateFinishedGood(id: string, updates: any) {
  const fg = await prisma.finishedGood.findUnique({ where: { id } })
  if (!fg) throw new Error("Not found")
  await verifySession(fg.orgId)

  const { date, ...rest } = updates
  const data: any = { ...rest }
  if (date) data.date = new Date(date)
  
  return await prisma.finishedGood.update({ where: { id }, data })
}

export async function serverDeleteFinishedGood(id: string) {
  const fg = await prisma.finishedGood.findUnique({ where: { id } })
  if (!fg) return
  await verifySession(fg.orgId)
  return await prisma.finishedGood.delete({ where: { id } })
}

export async function serverPurgeInventory(orgId: string) {
  await verifySession(orgId)
  await prisma.$transaction([
    prisma.rawMaterial.deleteMany({ where: { orgId } }),
    prisma.wIPGood.deleteMany({ where: { orgId } }),
    prisma.finishedGood.deleteMany({ where: { orgId } })
  ])
}

// -------------------------------------------------------------------------------- //
// MIGRATION ENGINE (REDUCED LOGIC FOR SAFETY)
// -------------------------------------------------------------------------------- //

export async function migrateLegacyData(payload: any) {
  try {
    console.log("Starting Migration Engine...")

    // 1. Insert Organizations safely
    for (const org of payload.organizations) {
      await prisma.organization.upsert({
        where: { id: org.id },
        update: { name: org.name },
        create: {
          id: org.id,
          name: org.name,
          gstNumber: org.gstNumber,
          panNumber: org.panNumber,
          address: org.address,
          city: org.city,
          state: org.state
        }
      })
    }

    // Helper to migrate accounts and ledgers
    const migrateAccounts = async (orgId: string, accounts: any[]) => {
      for (const acc of accounts) {
        const createdAcc = await prisma.account.upsert({
          where: { id: acc.id },
          update: { name: acc.name, type: acc.type, station: acc.station, balance: acc.balance },
          create: {
            id: acc.id,
            name: acc.name,
            type: acc.type,
            station: acc.station,
            balance: acc.balance,
            orgId: orgId
          }
        })
        
        for (const entry of acc.ledger) {
          await prisma.ledgerEntry.upsert({
            where: { id: entry.id },
            update: {},
            create: {
              id: entry.id,
              date: new Date(entry.date),
              party: entry.party,
              station: entry.station,
              amount: entry.amount || 0,
              discount: entry.discount || 0,
              taxOrPaid: entry.taxOrPaid || 0,
              netAmount: entry.netAmount || 0,
              items: entry.items || "",
              payment: entry.payment || 0,
              type: entry.type || "bill",
              paymentMode: entry.paymentMode,
              accountId: createdAcc.id
            }
          })
        }
      }
    }

    // Helper to migrate invoices
    const migrateInvoices = async (orgId: string, invoices: any[]) => {
      for (const inv of invoices) {
        const createdInv = await prisma.invoice.upsert({
          where: { id: inv.id },
          update: { },
          create: {
            id: inv.id,
            invoiceNo: inv.invoiceNo || "N/A",
            date: new Date(inv.date),
            customerName: inv.customerName,
            agencyName: inv.agencyName,
            city: inv.city,
            transport: inv.transport,
            remarks: inv.remarks,
            marka: inv.marka,
            subtotal: inv.subtotal || 0,
            discount: inv.discount || 0,
            taxes: inv.taxes || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status || "pending",
            orgId: orgId
          }
        })

        for (const item of inv.items) {
          await prisma.itemRow.upsert({
            where: { id: item.id || Math.random().toString() },
            update: {},
            create: {
              sno: item.sno || 1,
              style: item.style,
              brandName: item.brandName,
              size: item.size,
              qty: item.qty || 0,
              rate: item.rate || 0,
              amount: item.amount || 0,
              invoiceId: createdInv.id
            }
          })
        }
      }
    }

    if (payload.organizations.find((o: any) => o.id === "abc-company")) {
      await migrateAccounts("abc-company", payload.parasnathAccounts)
      await migrateInvoices("abc-company", payload.parasnathInvoices)
    }
    if (payload.organizations.find((o: any) => o.id === "xyz-agencies")) {
      await migrateAccounts("xyz-agencies", payload.jsAccounts)
      await migrateInvoices("xyz-agencies", payload.jsInvoices)
    }

    return { success: true }
  } catch (err: any) {
    console.error("Migration fatal error!", err)
    return { success: false, error: err.message }
  }
}

