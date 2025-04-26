import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.css']
})
export class BarcodeComponent implements OnInit {
  products: any[] = [];
  printItems: any[] = [];
  currentDate: string = new Date().toISOString().substring(0, 10);

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    for (let i = 0; i < 5; i++) this.addRow();
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

  // saveAll() {
  //   // Validate and filter only valid rows
  //   const validItems = this.products.filter(p =>
  //     p.productName?.trim() &&
  //     typeof p.mrp === 'number' && p.mrp > 0 &&
  //     p.category &&
  //     p.expiryDate &&
  //     p.barcode?.length === 12
  //   );
  
  //   if (validItems.length === 0) {
  //     alert('No valid products to save.');
  //     return;
  //   }
  
  //   console.log('📤 Sending to backend:', validItems);
  
  //   this.barcodeService.saveProducts(validItems).subscribe({
  //     next: (res) => {
  //       console.log('✅ Server response:', res);
  //       alert('Products saved successfully!');
  //     },
  //     error: (err) => {
  //       console.error('❌ Failed to save:', err);
  //       alert('Failed to save products. Please check the console.');
  //     }
  //   });
  // }  

  printSelected() {
    this.preparePrintItems();

    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = this.generatePrintHTML();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        this.renderBarcodesInWindow(printWindow);
        printWindow.focus();
        printWindow.print();
      }, 500);
    }, 300);
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
            body { margin: 0; font-family: monospace; }
            .barcode-label { width: 180px; height: 90px; padding: 6px 8px; border: 1px solid #000; display: flex; flex-direction: column; justify-content: space-around; text-align: center; overflow: hidden; page-break-inside: avoid; margin: 6px; }
            .print-section { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 6px; padding: 10px; }
            svg { display: block; margin: 0 auto; height: 30px; width: 160px; }
            .label-header { font-weight: bold; font-size: 10px; }
            .label-product { font-size: 9.5px; margin: 2px 0; }
            .barcode-value { font-size: 11px; letter-spacing: 1px; margin: 1px 0; }
            .label-info-compact { display: flex; justify-content: space-between; font-size: 8px; }
            .label-footer { font-size: 8px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="print-section">
            ${this.generatePrintContent()}
          </div>
        </body>
      </html>`;
  }

  private generatePrintContent(): string {
    return this.printItems.map((p, i) => `
      <div class="barcode-label">
        <div class="label-header">J T FRUITS & VEG</div>
        <div class="label-product">${p.productName}</div>
        <svg id="print-barcode-${i}"></svg>
        <div class="barcode-value">${p.barcode}</div>
        <div class="label-info-compact">
          <div><strong>M.R.P.</strong><br>₹${p.mrp}</div>
          <div><strong>Pkd.</strong><br>${this.currentDate}</div>
          <div><strong>Exp.</strong><br>${p.expiryDate}</div>
        </div>
        <div class="label-footer">Incl. of all Taxes</div>
      </div>
    `).join('');
  }

  private renderBarcodesInWindow(win: Window) {
    this.printItems.forEach((p, i) => {
      const el = win.document.getElementById(`print-barcode-${i}`);
      if (el && p.barcode?.length === 12) {
        JsBarcode(el, p.barcode, {
          format: 'UPC',
          lineColor: '#000000',
          background: '#ffffff',
          width: 1.6,
          height: 40,
          displayValue: true,
          fontOptions: 'bold',
          font: 'monospace',
          textMargin: 2,
          fontSize: 12,
          margin: 0
        });
      }
    });
  }
}
