"use client"

import { TrendingUp, TrendingDown, DollarSign, Users, FileText, ArrowUpRight, ArrowDownRight, Package, Hammer, Box, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { formatCurrency as globalFormatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function DashboardPage() {
  const { accounts, invoices, rawMaterials, wipGoods, finishedGoods, activeOrg } = useStore()

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalAccounts = accounts.length
  
  const pendingInvoices = invoices.filter(i => i.status === "pending").length
  
  const outstanding = invoices
    .filter(i => i.status === "pending" || i.status === "overdue")
    .reduce((sum, inv) => sum + inv.grandTotal, 0)

  const stats = [
    {
      title: "Total Revenue",
      value: `${totalRevenue.toLocaleString("en-IN")}`,
      change: "+",
      trend: "up",
      icon: DollarSign,
      color: "primary",
    },
    {
      title: "Total Accounts",
      value: totalAccounts.toString(),
      change: "+",
      trend: "up",
      icon: Users,
      color: "accent",
    },
    {
      title: "Pending Invoices",
      value: pendingInvoices.toString(),
      change: "-",
      trend: "down",
      icon: FileText,
      color: "warning",
    },
    {
      title: "Outstanding",
      value: `${outstanding.toLocaleString("en-IN")}`,
      change: "-",
      trend: "down",
      icon: TrendingDown,
      color: "destructive",
    },
  ]

  if (activeOrg?.inventoryEnabled) {
    const rmValue = rawMaterials.reduce((sum, rm) => {
      const availQty = rm.qty - (rm.qtyUsed || 0)
      const unitPrice = rm.price
      return sum + (availQty * unitPrice)
    }, 0)
    
    const wipValue = wipGoods.reduce((sum, wip) => sum + wip.totalCost, 0)
    const fgValue = finishedGoods.reduce((sum, fg) => sum + fg.cost, 0)
    const totalInventory = rmValue + wipValue + fgValue

    stats.push(
      {
        title: "Total Inventory Value",
        value: `${totalInventory.toLocaleString("en-IN")}`,
        change: "",
        trend: "up",
        icon: Package,
        color: "primary",
      },
      {
        title: "Raw Materials Value",
        value: `${rmValue.toLocaleString("en-IN")}`,
        change: "",
        trend: "up",
        icon: Truck,
        color: "accent",
      },
      {
        title: "Active WIP Cost",
        value: `${wipValue.toLocaleString("en-IN")}`,
        change: "",
        trend: "up",
        icon: Hammer,
        color: "warning",
      },
      {
        title: "Finished Goods Value",
        value: `${fgValue.toLocaleString("en-IN")}`,
        change: "",
        trend: "up",
        icon: Box,
        color: "primary",
      }
    )
  }

  // Flatten logic to get recent transactions from Ledger entries across accounts
  const allEntries = accounts.flatMap(acc => 
    acc.ledger.map(entry => ({
      id: entry.id,
      account: acc.name,
      type: entry.type === "bill" ? "Bill" : "Payment Received",
      amount: entry.type === "bill" ? -entry.amount : entry.amount,
      dateStr: entry.date,
      date: new Date(entry.date).toLocaleDateString()
    }))
  )
  const recentTransactions = allEntries
    .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime())
    .slice(0, 5)

  // Top Customers based on balance - only show Customer category
  const topCustomersData = accounts.filter(a => a.category === "Customer")
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3)

  const formatCurrency = (amount: number) => globalFormatCurrency(Math.abs(amount))

  const maxBalance = Math.max(...topCustomersData.map(c => c.balance), 1)

  const todayTime = new Date().getTime()
  const pendingOrOverdue = invoices.filter(i => i.status === "pending" || i.status === "overdue")
  let pending30 = 0, pending60 = 0, pending90 = 0
  let amt30 = 0, amt60 = 0, amt90 = 0
  pendingOrOverdue.forEach(i => {
    const days = (todayTime - new Date(i.date).getTime()) / (1000 * 3600 * 24)
    if (days >= 90) { pending90++; amt90 += i.grandTotal }
    else if (days >= 60) { pending60++; amt60 += i.grandTotal }
    else if (days >= 30) { pending30++; amt30 += i.grandTotal }
  })

  const totalReceivables = accounts.reduce((sum, a) => {
    if (a.category === "Customer") return sum + (a.balance > 0 ? a.balance : 0)
    return sum + (a.balance < 0 ? Math.abs(a.balance) : 0)
  }, 0)
  const totalPayables = accounts.reduce((sum, a) => {
    if (a.category === "Customer") return sum + (a.balance < 0 ? Math.abs(a.balance) : 0)
    return sum + (a.balance > 0 ? a.balance : 0)
  }, 0)
  const netLedgerBalance = totalReceivables - totalPayables

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here is what is happening with your jeans business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon as any
          return (
            <div
              key={stat.title}
              className="bg-card rounded-2xl p-5 border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    "p-3 rounded-xl",
                    stat.color === "primary" && "bg-primary/10",
                    stat.color === "accent" && "bg-accent/10",
                    stat.color === "warning" && "bg-warning/10",
                    stat.color === "destructive" && "bg-destructive/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6",
                      stat.color === "primary" && "text-primary",
                      stat.color === "accent" && "text-accent",
                      stat.color === "warning" && "text-warning",
                      stat.color === "destructive" && "text-destructive"
                    )}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Ledger & Invoice Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Analysis & Ledger Summary */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="text-lg font-bold text-foreground">Invoice Aging Analysis</h3>
            <p className="text-sm text-muted-foreground">Unpaid invoices by duration</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">30+ Days</span>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{pending30} Invoices</Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(amt30)}</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-warning h-full transition-all duration-500" style={{ width: `${Math.min(100, (pending30 / Math.max(pendingOrOverdue.length, 1)) * 100)}%` }}></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">60+ Days</span>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{pending60} Invoices</Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(amt60)}</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-accent h-full transition-all duration-500" style={{ width: `${Math.min(100, (pending60 / Math.max(pendingOrOverdue.length, 1)) * 100)}%` }}></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">90+ Days</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{pending90} Invoices</Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(amt90)}</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-destructive h-full transition-all duration-500" style={{ width: `${Math.min(100, (pending90 / Math.max(pendingOrOverdue.length, 1)) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Ledger Summary</h3>
            <p className="text-sm text-muted-foreground">Overall accounts standing</p>
          </div>
          <div className="p-5 flex flex-col gap-4 justify-center h-[calc(100%-73px)]">
            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
              <span className="text-sm font-semibold text-muted-foreground uppercase">Total Receivables</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalReceivables)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-destructive/5 rounded-xl border border-destructive/10">
              <span className="text-sm font-semibold text-muted-foreground uppercase">Total Payables</span>
              <span className="text-2xl font-bold text-destructive">{formatCurrency(totalPayables)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-accent/5 rounded-xl border border-accent/10 mt-2">
              <span className="text-sm font-bold text-foreground uppercase">Net Standing</span>
              <span className={cn("text-2xl font-bold", netLedgerBalance >= 0 ? "text-accent" : "text-destructive")}>{formatCurrency(netLedgerBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <p className="text-sm text-muted-foreground">Latest account ledger activities</p>
          </div>
          <div className="divide-y divide-border">
            {recentTransactions.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No recent transactions yet</div>
            )}
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      transaction.amount > 0 ? "bg-accent/10" : "bg-destructive/10"
                    )}
                  >
                    {transaction.amount > 0 ? (
                      <TrendingUp className="w-5 h-5 text-accent" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{transaction.account}</p>
                    <p className="text-xs text-muted-foreground">{transaction.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      transaction.amount > 0 ? "text-accent" : "text-destructive"
                    )}
                  >
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Top Customers</h3>
            <p className="text-sm text-muted-foreground">Highest balance accounts</p>
          </div>
          <div className="p-5 space-y-4">
            {topCustomersData.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">No customers found</div>
            )}
            {topCustomersData.map((customer, index) => (
              <div
                key={customer.name}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{customer.name}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(Math.max(customer.balance, 0) / maxBalance) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent">{formatCurrency(customer.balance)}</p>
                  {customer.balance >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-accent inline" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive inline" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
