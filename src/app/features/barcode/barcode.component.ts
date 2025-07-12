  import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
  import { ProductService, Name } from 'src/app/core/services/products.service';
  import bwipjs from 'bwip-js';

  export type LabelStyle = 'dmart' | 'reliance';

  @Component({
    selector: 'app-barcode',
    templateUrl: './barcode.component.html',
    styleUrls: ['./barcode.component.css'],
  })
  export class BarcodeComponent implements OnInit {
    products: any[] = [];
    printItems: any[] = [];
    nameOptions: Name[] = [];
    currentDate: string = new Date().toISOString().substring(0, 10);
    selectedPrintStyle: LabelStyle = 'dmart';

    constructor(
      private cdRef: ChangeDetectorRef,
      private productService: ProductService,
    ) {}

    ngOnInit(): void {
      for (let i = 0; i < 5; i++) this.addRow();

      this.productService.getNames().subscribe({
        next: (names) => {
          this.nameOptions = names.sort((a, b) =>
            (`${a.name} ${a.units}`).localeCompare(`${b.name} ${b.units}`)
          );
        },
        error: (err) => console.error('Failed to load names:', err)
      });
    }

    addRow() {
      this.products.push({
        productName: '',
        mrp: 0,
        category: '',
        quantity: 1,
        expiryDays: 1,
        expiryDate: this.currentDate,
        barcode: '',
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
      const selected = this.nameOptions.find((n) => n.id === nameId);
      if (selected) {
        this.products[i].productName = `${selected.name} ${selected.units}`;
        this.products[i].category = selected.type
          ? selected.type.charAt(0).toUpperCase() + selected.type.slice(1)
          : '';

        // ✅ Fix: assign properly padded barcode with check digit
        this.products[i].barcode = selected.barcode;
      }
    }

    resetForm() {
      this.products = [];
      for (let i = 0; i < 10; i++) this.addRow();
    }

    printSelected() {
      this.preparePrintItems();

      const win = window.open('', '', 'width=800,height=1000');
      if (!win) {
        alert('Popup blocked. Please allow pop-ups for this site.');
        return;
      }

      win.document.open();
      win.document.write(this.generatePrintHTML());
      win.document.close();

      const checkReady = () => {
        if (win.document.readyState === 'complete') {
          this.renderBarcodesInWindow(win);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    }

    private preparePrintItems() {
      this.printItems = [];
      this.products.forEach((p) => {
        if (p.quantity > 0 && p.productName && p.mrp > 0) {
          for (let i = 0; i < p.quantity; i++) {
            this.printItems.push({ ...p });
          }
        }
      });
      this.cdRef.detectChanges();
    }

    private generatePrintHTML(): string {
      const head = `\n<meta charset="UTF-8">\n<meta name="viewport" content="width=240px">\n<title>Print Barcodes</title>`;

      const dmartStyles = `
        @media print {
          @page {
            size: 38mm 25mm;
            margin: 0;
          }
          body, html {
            margin: 0;
            padding: 0;
          }
          .print-section {
            display: flex;
            flex-wrap: wrap;
            gap: 0;
            margin: 0;
            padding: 0;
          }
        }

        .dmart-label {
          position: relative;
          width: 144px;
          height: 96px;
          box-sizing: border-box;
          padding: 2px 2px 0;
          font-size: 9px;
          font-family: monospace;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dmart-label img {
          width: 120px;
          height: 28px;
        }

        .side-brand {
          position: absolute;
          right: -4px;
          top: 25%;
          transform: rotate(-90deg) translateY(-50%);
          transform-origin: right top;
          font-size: 14px;
          font-weight: bold;
        }

        .label-header {
          font-weight: bold;
        }

        .label-product {
          font-weight: bold;
          margin: 1px 0;
          font-size: 9.5px;
          line-height: 1.1;
        }

        .barcode-value {
          font-size: 7px;
          margin-top: 1px;
        }

        .price-row {
          display: flex;
          gap: 4px;
          font-weight: bold;
          margin: 1px 0;
        }

        .subinfo {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 8px;
          padding: 0 2px;
        }

        .label-footer {
          font-size: 7px;
          margin-top: auto;
        }
      `;

      const relianceStyles = `
        @media print {
          @page {
            size: 50mm 50mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-section {
            margin: 0;
            padding: 6px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: flex-start;
          }
        }

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
          text-align: left;
          page-break-inside: avoid;
          border: 1px solid transparent; /* optional: helps with visual debugging */
        }

        .reliance-label canvas {
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

        .label-product {
          font-size: 11px;
          font-weight: bold;
          margin: 2px 0;
          text-align: center;
        }

        .label-bold {
          font-weight: bold;
        }

        .label-info-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }

        .reliance-footer {
          text-align: center;
          font-size: 9px;
          line-height: 1.1;
          margin-top: 4px;
        }
      `;

      let css = '';
      let body = '';
      switch (this.selectedPrintStyle) {
        case 'dmart':
          css = dmartStyles;
          body = this.generateDmartBody();
          break;
        case 'reliance':
        default:
          css = relianceStyles;
          body = this.generateRelianceBody();
          break;
      }

      return `<!DOCTYPE html><html><head>${head}<style>${css}</style></head><body><div class="print-section">${body}</div></body></html>`;
    }

    private generateDmartBody(): string {
      return this.printItems
        .map(
          (p, i) => `
        <div class="dmart-label">
          <span class="side-brand">Dmart</span>
          <div class="label-header">J T FRUITS &amp; VEG</div>
          <div class="label-product">${p.productName}</div>
          <img id="dmart-bar-${i}" />
          <div class="barcode-value">${p.barcode}</div>
          <div class="price-row">M.R.P.&nbsp;₹${p.mrp}</div>
          <div class="subinfo"><span>Pkd. On&nbsp;${this.currentDate}</span><span>Exp. Dt.&nbsp;${p.expiryDate}</span></div>
          <div class="label-footer">Incl. of all Taxes </div>
        </div>`
        )
        .join('');
    }

    private generateRelianceBody(): string {
      return this.printItems
        .map(
          (p, i) => `
        <div class="reliance-label">
          <div><b>J T FRUITS &amp; VEG</b></div>
          <div style="text-align:center;font-size:12px;font-weight:bold;">${p.productName}</div>
          <img id="rel-barcode-img-${i}" style="width:180px;height:40px;" />
          <div class="barcode-value">${p.barcode}</div>
          <div style="display:flex;justify-content:space-between;"><div><b>M.R.P :</b></div><div>₹${p.mrp}/-</div></div>
          <div style="display:flex;justify-content:space-between;"><div><b>PACKED ON :</b></div><div>${this.currentDate}</div></div>
          <div style="display:flex;justify-content:space-between;"><div><b>BEST BEFORE :</b></div><div><b>${p.expiryDays} DAYS</b></div></div>
          <div style="text-align:center;font-size:9px;">
            <div><b>FSSAI No. 11517011000128</b></div>
            <div>Shop No. 31-32, Bldg No. 27,</div>
            <div>EMP Op Jogers Park, Thakur Village,</div>
            <div>Kandivali(E)</div>
            <div>Customer Care No. 9594117456</div>
          </div>
        </div>`
        )
        .join('');
    }

    private async renderBarcodesInWindow(win: Window) {
      const promises: Promise<void>[] = [];

      this.printItems.forEach((p, i) => {
        const imgId =
          this.selectedPrintStyle === 'dmart'
            ? `dmart-bar-${i}`
            : `rel-barcode-img-${i}`;

        const imgEl = win.document.getElementById(imgId) as HTMLImageElement;
          if (!imgEl) {
            console.warn(`Barcode image element not found: ${imgId}`);
            return;
          }
          if (!p.barcode || p.barcode.trim().length === 0) {
            console.warn(`Empty or missing barcode: ${p.productName}`);
            return;
          }

        const canvas = document.createElement('canvas');
        try {
          bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: p.barcode,
            scale: 1.6,
            height: 8,
            includetext: false,
            textxalign: 'center',
            backgroundcolor: 'FFFFFF',
          });

          const dataUrl = canvas.toDataURL('image/png');

          const loadPromise = new Promise<void>((resolve, reject) => {
            imgEl.onload = () => resolve();
            imgEl.onerror = () => reject();
            imgEl.src = dataUrl;
          });

          promises.push(loadPromise);
        } catch (e) {
          console.error('bwip-js render error:', e);
        }
      });

      try {
        await Promise.all(promises);

        // ✅ Only call print ONCE here — no onafterprint, no media query listener
        win.focus();
        win.print();

        // Optional safe delay to close the print window
        setTimeout(() => {
          if (!win.closed) win.close();
        }, 500000000);

      } catch (e) {
        console.error('Error loading one or more barcode images:', e);
      }
    }

    // Handle print style change from UI
    onPrintStyleChange(style: LabelStyle) {
      this.selectedPrintStyle = style;
      this.cdRef.detectChanges();
    }
  }