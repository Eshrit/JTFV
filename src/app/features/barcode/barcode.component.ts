import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProductService, Name } from 'src/app/core/services/products.service';
import JsBarcode from 'jsbarcode';
import bwipjs from 'bwip-js';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.css']
})
export class BarcodeComponent implements OnInit {
  products: any[] = [];
  printItems: any[] = [];
  nameOptions: Name[] = [];
  currentDate: string = new Date().toISOString().substring(0, 10);
  selectedPrintStyle: 'dmart' | 'reliance' = 'dmart';

  constructor(
    private cdRef: ChangeDetectorRef,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    for (let i = 0; i < 5; i++) this.addRow();
    this.productService.getNames().subscribe({
      next: (names) => this.nameOptions = names,
      error: (err) => console.error('Failed to load names:', err)
    });
  }

  addRow() {
    this.products.push({
      productName: '',
      mrp: 0,
      category: 'Fruit',
      quantity: 1,
      expiryDays: 1,
      expiryDate: this.currentDate,
      barcode: this.generateBarcodeValue()
    });
  }

  removeRow(index: number) {
    this.products.splice(index, 1);
  }

  updateExpiry(index: number) {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + Number(this.products[index].expiryDays));
    this.products[index].expiryDate = expiry.toISOString().substring(0, 10);
  }

  onProductSelect(i: number, event: Event) {
    const target = event.target as HTMLSelectElement;
    const nameId = Number(target.value);
    const selected = this.nameOptions.find(n => n.id === nameId);
    if (selected) {
      this.products[i].productName = `${selected.name} ${selected.units}`;
      this.products[i].category = selected.type
        ? selected.type.charAt(0).toUpperCase() + selected.type.slice(1)
        : '';
    }
  }

  generateBarcodeValue(): string {
    const base = Math.floor(Math.random() * 1e11).toString().padStart(11, '0');
    return base + this.calculateUPCCheckDigit(base);
  }

  calculateUPCCheckDigit(upc: string): string {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(upc.charAt(i), 10);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    return ((10 - (sum % 10)) % 10).toString();
  }

  resetForm() {
    this.products = [];
    for (let i = 0; i < 10; i++) this.addRow();
  }

  printSelected() {
    this.preparePrintItems();

    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = this.generatePrintHTML();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(async () => {
        await this.renderBarcodesInWindow(printWindow);
      }, 500); // smaller delay since rendering now handles sync
    }, 200);
  }

  private preparePrintItems() {
    this.printItems = [];
    this.products.forEach(p => {
      if (p.quantity > 0 && p.productName && p.mrp > 0) {
        for (let i = 0; i < p.quantity; i++) {
          const barcodeValue = this.generateBarcodeValue();
          this.printItems.push({ ...p, barcode: barcodeValue });
        }
      }
    });
    this.cdRef.detectChanges();
  }

  private generatePrintHTML(): string {
    return `
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: monospace;
            }

            .print-section {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-start;
              gap: 6px;
              padding: 6px;
            }

            /* D-Mart Label */
            .dmart-label {
              width: 189px;
              height: 189px;
              padding: 4px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              page-break-inside: avoid;
              font-size: 10px;
              line-height: 1.2;
              text-align: center;
              font-family: monospace;
            }

            /* Reliance Label */
            .reliance-label {
              width: 240px;
              height: 189px;
              padding: 6px 10px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.2;
              page-break-inside: avoid;
              text-align: left;
            }

            svg, canvas {
              display: block;
              margin: 2px auto;
              width: 160px;
              height: 40px;
            }

            .barcode-value {
              font-size: 11px;
              letter-spacing: 1px;
              margin: 2px 0;
              text-align: center;
            }

            .label-header {
              font-size: 10px;
              font-weight: bold;
            }

            .label-product {
              font-size: 11px;
              font-weight: bold;
              margin: 2px 0;
            }

            .label-info-compact {
              display: flex;
              justify-content: space-between;
              width: 100%;
              font-size: 9px;
              margin-top: 4px;
            }

            .label-footer {
              font-size: 8px;
              margin-top: 4px;
              white-space: nowrap;
              text-align: center;
            }

            .label-bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="print-section">
            ${this.selectedPrintStyle === 'dmart' ? this.generateDmartContent() : this.generateRelianceContent()}
          </div>
        </body>
      </html>`;
  }

  private generateDmartContent(): string {
    return this.printItems.map((p, i) => `
      <div class="dmart-label">
        <div class="label-header">J T FRUITS & VEG</div>
        <div class="label-product"><strong>${p.productName}</strong></div>
        <svg id="print-barcode-${i}"></svg>
        <div class="barcode-value">${p.barcode}</div>
        <div class="label-info-compact">
          <div><strong>MRP</strong><br>₹${p.mrp}</div>
          <div><strong>Pkd</strong><br>${this.currentDate}</div>
          <div><strong>Exp</strong><br>${p.expiryDate}</div>
        </div>
        <div class="label-footer">Incl. of all Taxes</div>
      </div>
    `).join('');
  }

private generateRelianceContent(): string {
  return this.printItems.map((p, i) => `
    <div class="reliance-label">
      <div style="text-align: left;"><b>J T FRUITS & VEG</b></div>
      <div style="text-align: center; font-size: 12px; font-weight: bold;">${p.productName}</div>
      <img id="rel-barcode-img-${i}" style="width: 180px; height: 40px;" />
      <div style="text-align: center; font-size: 11px;">${p.barcode}</div>
      <div style="display: flex; justify-content: space-between;"><div><b>M.R.P :</b></div><div>₹${p.mrp}/-</div></div>
      <div style="display: flex; justify-content: space-between;"><div><b>PACKED ON :</b></div><div>${this.currentDate}</div></div>
      <div style="display: flex; justify-content: space-between;"><div><b>BEST BEFORE :</b></div><div><b>${p.expiryDays} DAYS</b></div></div>
      <div style="text-align: center; font-size: 9px;">
        <div><b>FSSAI No. 11517011000128</b></div>
        <div>Shop No. 31-32, Bldg No. 27,</div>
        <div>EMP Op Jogers Park, Thakur Village,</div>
        <div>Kandivali(E)</div>
        <div>Customer Care No. 9594117456</div>
      </div>
    </div>
  `).join('');
}

  private async renderBarcodesInWindow(win: Window) {
    const renderTasks: Promise<void>[] = [];

    this.printItems.forEach((p, i) => {
      // For D-Mart style (SVG)
      const svgEl = win.document.getElementById(`print-barcode-${i}`);
      if (svgEl && p.barcode?.length === 12) {
        JsBarcode(svgEl, p.barcode, {
          format: 'UPC',
          lineColor: '#000000',
          background: '#ffffff',
          width: 1.2,           // reduced width
          height: 30,           // reduced height
          displayValue: true,
          fontOptions: 'bold',
          font: 'monospace',
          textMargin: 1,
          fontSize: 9,
          margin: 0
        });
      }

      // For Reliance style (render to img via canvas)
      const imgEl = win.document.getElementById(`rel-barcode-img-${i}`) as HTMLImageElement;
      if (imgEl && p.barcode?.length === 12) {
        const renderPromise = new Promise<void>((resolve, reject) => {
          const canvas = document.createElement('canvas');
          try {
            bwipjs.toCanvas(canvas, {
              bcid: 'ean13',
              text: p.barcode,
              scale: 2,
              height: 10,
              includetext: false,
              backgroundcolor: 'FFFFFF'
            });

            // convert canvas to base64
            const dataURL = canvas.toDataURL('image/png');
            imgEl.src = dataURL;
            resolve();
          } catch (e) {
            console.error('bwip-js render error:', e);
            reject(e);
          }
        });

        renderTasks.push(renderPromise);
      }
    });

    try {
      await Promise.all(renderTasks);
      win.focus();
      win.print();
    } catch (err) {
      console.error('One or more barcodes failed to render.');
    }
  }
  onPrintStyleChange(style: 'dmart' | 'reliance') {
    this.selectedPrintStyle = style;
    this.cdRef.detectChanges();
  }
}
