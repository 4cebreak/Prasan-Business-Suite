import bwipjs from "bwip-js"

export const printBarcodes = (items: Array<{ 
  brand?: string, 
  style: string, 
  size?: string, 
  rate: number, 
  qty: number,
  customFields?: Array<{ key: string, value: string }>
}>) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const generateBarcodeUrl = (text: string) => {
    const canvas = document.createElement('canvas')
    try {
      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text: text.toUpperCase() || "SAMPLE",
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      })
      return canvas.toDataURL()
    } catch (e) {
      return ""
    }
  }

  const labelsHtml = items.map(item => {
    const barcodeUrl = generateBarcodeUrl(`${item.style}|${item.size || ''}|${item.rate}`)
    const customHtml = (item.customFields || []).map(cf => `<span style="margin-right: 5px;">${cf.key.toUpperCase()}: ${cf.value}</span>`).join(' | ')
    
    return Array(item.qty || 1).fill(0).map(() => `
      <div class="label">
        <div class="brand">${(item.brand || "PRASAN").toUpperCase()}</div>
        <div class="details">STYLE: ${item.style} | SIZE: ${item.size || ''} | RATE: ${item.rate}</div>
        ${customHtml ? `<div class="details">${customHtml}</div>` : ''}
        <img src="${barcodeUrl}" />
      </div>
    `).join('')
  }).join('')


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
        ${labelsHtml}
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
