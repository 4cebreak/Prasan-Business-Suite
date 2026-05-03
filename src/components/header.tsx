"use client"

import { useState } from "react"
import { Bell, Menu, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { serverLogin } from "@/app/actions"
import { Eye, EyeOff, Lock } from "lucide-react"
import { toast } from "sonner"

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { organization, activeOrgId, organizations, setOrganization } = useStore()
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [passwordToVerify, setPasswordToVerify] = useState("")
  const [targetOrg, setTargetOrg] = useState<{id: string, name: string} | null>(null)
  const [passwordError, setPasswordError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleOrgClick = (orgId: string, orgName: string) => {
    if (orgId === activeOrgId) return
    setTargetOrg({ id: orgId, name: orgName })
    setPasswordToVerify("")
    setPasswordError("")
    setIsPasswordOpen(true)
  }

  const handleVerifyPassword = async () => {
    if (!targetOrg) return
    setIsVerifying(true)
    setPasswordError("")
    try {
      await serverLogin(targetOrg.id, passwordToVerify)
      setOrganization(targetOrg.id)
      setIsPasswordOpen(false)
      toast.success(`Switched to ${targetOrg.name}`)
    } catch (err: any) {
      setPasswordError(err.message || "Incorrect password. Access denied.")
    } finally {
      setIsVerifying(false)
    }

  }

  const abbr = organization.substring(0, 2).toUpperCase()

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-xl"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 sm:gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold tracking-tight outline-none cursor-pointer text-sm sm:text-base">
            <span className="hidden min-[400px]:inline">{organization}</span>
            <span className="min-[400px]:hidden">{abbr}</span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-48">
            {organizations.map(org => (
              <DropdownMenuItem key={org.id} onClick={() => handleOrgClick(org.id, org.name)} className="font-medium cursor-pointer py-2">
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>


        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
          <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Unlock {targetOrg?.name}
              </DialogTitle>
              <DialogDescription>
                Enter the master password for this organization to switch.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Master Password" 
                  value={passwordToVerify} 
                  onChange={(e) => setPasswordToVerify(e.target.value)} 
                  className="rounded-xl h-12 bg-muted border-0 pr-12"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyPassword() }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5 font-medium">
                  {passwordError}
                </p>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsPasswordOpen(false)} className="rounded-xl flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleVerifyPassword} 
                disabled={isVerifying || !passwordToVerify}
                className="rounded-xl flex-[2] bg-primary hover:bg-primary/90"
              >
                {isVerifying ? "Verifying..." : "Switch Organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  )
}
