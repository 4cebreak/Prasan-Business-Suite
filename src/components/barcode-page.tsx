"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Printer, Barcode, RefreshCw, Layers } from "lucide-react"
import bwipjs from "bwip-js"

export function BarcodePage() {
  const [barcodeData, setBarcodeData] = useState({
    style: "",
    brand: "",
    size: "",
    rate: "",
    qty: "1"
  })
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
    } catch (e) {
      // Ignore errors during typing
    }
  }, [barcodeData])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL()

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @page { size: auto; margin: 0; }
            body { 
              margin: 0; 
              display: flex; 
              flex-wrap: wrap; 
              justify-content: center;
              font-family: sans-serif;
            }
            .label {
              width: 2in;
              height: 1in;
              padding: 10px;
              border: 1px dashed #ccc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
            }
            .brand { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
            .details { font-size: 10px; margin-bottom: 5px; }
            img { width: 100%; height: auto; }
            @media print {
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          ${Array(parseInt(barcodeData.qty || "1")).fill(0).map(() => `
            <div class="label">
              <div class="brand">${barcodeData.brand.toUpperCase() || "PRASAN"}</div>
              <div class="details">STYLE: ${barcodeData.style} | SIZE: ${barcodeData.size} | RATE: ${barcodeData.rate}</div>
              <img src="${dataUrl}" />
            </div>
          `).join('')}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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

            <div className="space-y-2">
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
              <div className="text-slate-600 text-xs mb-4 uppercase tracking-wider font-medium">
                {barcodeData.style} | Size: {barcodeData.size} | ₹{barcodeData.rate}
              </div>
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
            <span className="font-bold">Pro Tip:</span> Connect your Thermal Label Printer (like Zebra or TSC) and set the page size to 2"x1" in the browser print dialog for perfect results.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
