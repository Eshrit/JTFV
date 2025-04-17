import { Component, OnInit } from '@angular/core';
import { BarcodeService } from './barcode.service';
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
id: any;

  constructor(private barcodeService: BarcodeService) {}

  ngOnInit(): void {
    this.addRow();
  }

  addRow() {
    this.products.push({
      productName: '',
      mrp: 0,
      category: 'Fruit',
      quantity: 0,
      expiryDays: 1,
      expiryDate: '',
      selected: false,
      barcode: this.generateBarcodeValue()
    });
  }

  removeRow(index: number) {
    this.products.splice(index, 1);
  }

  updateExpiry(index: number) {
    const today = new Date();
    const days = Number(this.products[index].expiryDays);
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + days);
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
    const remainder = sum % 10;
    return (remainder === 0 ? '0' : (10 - remainder).toString());
  }

  saveAll() {
    this.barcodeService.saveProducts(this.products).subscribe({
      next: () => alert('Saved to database!'),
      error: err => console.error('Error saving:', err)
    });
  }

  resetForm() {
    this.products = [];
    this.addRow();
  }

  printSelected() {
    this.printItems = this.products.filter(p => p.selected);
    setTimeout(() => {
      this.printItems.forEach((p, i) => {
        const svgId = `barcode-${i}`;
        const element = document.getElementById(svgId);
    
        if (element && p.barcode?.length === 12) {
          JsBarcode(element, p.barcode, {
            format: 'UPC',
            lineColor: '#000',
            width: 1.6,
            height: 50,
            displayValue: true,
            fontSize: 10
          });
        }
      });
    
      window.print();
    }, 300);
  }
  
}
