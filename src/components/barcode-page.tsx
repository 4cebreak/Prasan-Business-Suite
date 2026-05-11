"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Printer, Barcode, RefreshCw, Layers, Plus, Trash2 } from "lucide-react"

import { printBarcodes } from "@/lib/barcode-utils"
import bwipjs from "bwip-js"

export function BarcodePage() {
  const [barcodeData, setBarcodeData] = useState({
    style: "",
    brand: "",
    size: "",
    rate: "",
    qty: "1"
  })
  const [customFields, setCustomFields] = useState<{ key: string, value: string }[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Generate combined data for the barcode
    // Format: STYLE|SIZE|RATE
    const combinedData = `${barcodeData.style}|${barcodeData.size}|${barcodeData.rate}`.toUpperCase()

    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'code128',       // Barcode type
        text: combinedData || "SAMPLE",    // Text to encode
        scale: 3,              // 3x scaling factor
        height: 10,            // Bar height, in millimeters
        includetext: true,     // Show human-readable text
        textxalign: 'center',  // Always good to set this
      })
    } catch {
      // Ignore errors during typing
    }
  }, [barcodeData])

  const handlePrint = () => {
    printBarcodes([{
      brand: barcodeData.brand,
      style: barcodeData.style,
      size: barcodeData.size,
      rate: Number(barcodeData.rate) || 0,
      qty: Number(barcodeData.qty) || 1,
      customFields
    }])
  }

  const addCustomField = () => {
    if (customFields.length < 3) {
      setCustomFields([...customFields, { key: "", value: "" }])
    }
  }

  const updateCustomField = (index: number, key: string, value: string) => {
    const newFields = [...customFields]
    newFields[index] = { key, value }
    setCustomFields(newFields)
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }


  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle>Barcode Details</CardTitle>
            </div>
            <CardDescription>Enter the information you want to encode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand Name</Label>
                <Input 
                  id="brand" 
                  placeholder="e.g. Parasnath" 
                  value={barcodeData.brand}
                  onChange={(e) => setBarcodeData({...barcodeData, brand: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style">Style Number</Label>
                <Input 
                  id="style" 
                  placeholder="e.g. JS-501" 
                  value={barcodeData.style}
                  onChange={(e) => setBarcodeData({...barcodeData, style: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input 
                  id="size" 
                  placeholder="e.g. 32" 
                  value={barcodeData.size}
                  onChange={(e) => setBarcodeData({...barcodeData, size: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (₹)</Label>
                <Input 
                  id="rate" 
                  type="number"
                  placeholder="999" 
                  value={barcodeData.rate}
                  onChange={(e) => setBarcodeData({...barcodeData, rate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Custom Fields (Max 3)</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={addCustomField} 
                  disabled={customFields.length >= 3}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Field
                </Button>
              </div>
              
              {customFields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Input 
                      placeholder="Label (e.g. Color)" 
                      value={field.key} 
                      className="h-8 text-xs"
                      onChange={(e) => updateCustomField(idx, e.target.value, field.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input 
                      placeholder="Value" 
                      value={field.value} 
                      className="h-8 text-xs"
                      onChange={(e) => updateCustomField(idx, field.key, e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeCustomField(idx)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="qty">Number of Labels to Print</Label>
              <Input 
                id="qty" 
                type="number"
                min="1"
                value={barcodeData.qty}
                onChange={(e) => setBarcodeData({...barcodeData, qty: e.target.value})}
              />
            </div>


            <Button className="w-full gap-2 mt-4 shadow-lg shadow-primary/20" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Print Barcodes
            </Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-inner flex flex-col items-center">
              <div className="text-slate-900 font-bold mb-1 text-lg">{barcodeData.brand.toUpperCase() || "PRASAN"}</div>
              <div className="text-slate-600 text-xs mb-1 uppercase tracking-wider font-medium">
                {barcodeData.style} | Size: {barcodeData.size} | ₹{barcodeData.rate}
              </div>
              {customFields.length > 0 && (
                <div className="text-[10px] text-slate-500 mb-4 flex flex-wrap justify-center gap-1">
                  {customFields.map((f, i) => f.key && f.value && (
                    <span key={i}>{f.key.toUpperCase()}: {f.value} {i < customFields.length - 1 ? '|' : ''}</span>
                  ))}
                </div>
              )}

              <canvas ref={canvasRef} className="max-w-full h-auto"></canvas>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <Barcode className="w-4 h-4 animate-pulse" />
              Live Preview
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
              This is how your labels will appear on the sticker roll.
            </p>
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="border-none shadow-lg bg-secondary/30">
        <CardContent className="p-4 flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Pro Tip:</span> Connect your Thermal Label Printer (like Zebra or TSC) and set the page size to 2&quot;x1&quot; in the browser print dialog for perfect results.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
