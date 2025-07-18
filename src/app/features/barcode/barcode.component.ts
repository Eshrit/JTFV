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
    packedOnDate: string = this.getTodayLocalDate();
    currentDate: string = this.getTodayLocalDate();
    selectedPrintStyle: LabelStyle = 'reliance';

    constructor(
      private cdRef: ChangeDetectorRef,
      private productService: ProductService,
    ) {}

    ngOnInit(): void {
      for (let i = 0; i < 1; i++) this.addRow();
      this.onPrintStyleChange(this.selectedPrintStyle);
      this.packedOnDate = this.getTodayLocalDate(); // Initialize packed date to today
      this.productService.getNames().subscribe({
        next: (names) => {
          this.nameOptions = names.sort((a, b) =>
            (`${a.name} ${a.units}`).localeCompare(`${b.name} ${b.units}`)
          );
        },
        error: (err) => console.error('Failed to load names:', err)
      });
    }

    onQtyKeyDown(event: KeyboardEvent, index: number) {
      if (event.key === 'Tab' && index === this.products.length - 1) {
        event.preventDefault(); // Stop default tabbing
        this.addRow();
        // Wait for view update before focusing on the new row's product select
        setTimeout(() => {
          const inputs = document.querySelectorAll(
            `tr:nth-child(${this.products.length + 1}) select[name^='productName']`
          );
          if (inputs.length > 0) {
            (inputs[0] as HTMLElement).focus();
          }
        });
      }
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
        dbBarcode: '',
        mrpEdited: false,
        expiryEdited: false,
      });
    }

    onMrpChange(index: number) {
      this.products[index].mrpEdited = true;
      this.generateBarcode(this.products[index]);
    }

    onExpiryChange(index: number) {
      this.products[index].expiryEdited = true;
      this.updateExpiry(index);
    }

    private getTodayLocalDate(): string {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    resetForm() {
      this.packedOnDate = this.getTodayLocalDate(); // reset packed date to today
      this.products = [];
      for (let i = 0; i < 1; i++) this.addRow();
    }

    removeRow(index: number) {
      this.products.splice(index, 1);
    }

    updateExpiry(index: number) {
      const today = new Date(this.packedOnDate);
      const expiry = new Date(today);
      expiry.setDate(today.getDate() + Number(this.products[index].expiryDays));
      this.products[index].expiryDate = expiry.toISOString().substring(0, 10);
    }

    get filteredNameOptions(): Name[] {
      if (this.selectedPrintStyle === 'reliance') {
        return this.nameOptions.filter((n) => n.type?.toLowerCase() === 'vegetable');
      }
      return this.nameOptions;
    }

    onPackedOnChange() {
      this.products.forEach((p, i) => {
        const packed = new Date(this.packedOnDate);
        packed.setDate(packed.getDate() + Number(p.expiryDays));
        p.expiryDate = packed.toISOString().substring(0, 10);

        this.generateBarcode(p);
      });

      this.cdRef.detectChanges();
    }

    onProductSelect(i: number, event: Event) {
      const target = event.target as HTMLSelectElement;
      const nameId = Number(target.value);
      const selected = this.nameOptions.find((n) => n.id === nameId);

      if (selected) {
        const product = this.products[i];
        product.productName = `${selected.name} ${selected.units}`;
        product.category = selected.type
          ? selected.type.charAt(0).toUpperCase() + selected.type.slice(1)
          : '';
        product.units = selected.units;
        product.dbBarcode = selected.barcode;

        // ✅ Update MRP only if not manually edited
        if (!product.mrpEdited) {
          product.mrp = selected.mrp || 0;
        }

        // ✅ Update Expiry Days only if not manually edited
        if (!product.expiryEdited) {
          product.expiryDays = selected.expiryDays || 1;
        }

        // Update expiry date
        const today = new Date();
        today.setDate(today.getDate() + product.expiryDays);
        product.expiryDate = today.toISOString().split('T')[0];

        this.generateBarcode(product);
      }
    }

    generateBarcode(product: any) {
      if (!product.category || product.mrp == null) return;

      const mrpPaise = Math.round(product.mrp * 100);
      const mrpPart = mrpPaise.toString().padStart(4, '0'); // e.g., 45.00 → '4500'

      if (this.selectedPrintStyle === 'dmart') {
        const isVegetable = product.category.toLowerCase() === 'vegetable';
        const prefix = isVegetable ? '953779' : '95378';
        product.barcode = `${prefix}0000${mrpPart}`;
      } else {
        // Reliance: just use the DB barcode directly
        product.barcode = product.dbBarcode || '';
      }
    }

    printSelected() {
      this.preparePrintItems();

      const win = window.open('', '', 'width=0,height=0');
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
            margin: 0mm;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
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
          width: 136px; /* Adjusted */
          height: 90px; /* Adjusted */
          box-sizing: border-box;
          padding: 3px 4px 1px;
          font-family: Arial, sans-serif;
          font-size: 9px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          text-align: left;
          line-height: 1.1;
        }

        .label-header {
          font-size: 9px;
          text-align: center;
          width: 100%;
          margin-bottom: 0;
        }

      .label-product {
        font-size: 10px;
        text-align: left;
        width: 100%;
        margin-top: 2px;
        margin-bottom: 1px;
        padding-left: 2px;
      }

        .dmart-label img {
          width: 130px;
          height: 36px;
          margin: 0 0 1px;
        }

        .barcode-value {
          font-size: 11px;
          text-align: left;
          width: 100%;
          letter-spacing: 1px;
          padding-left: 2px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 10px;
          margin: 0;
        }

        .info-left {
          font-weight: normal;
          font-size: 12px;
          text-align: center;
        }

        .price-value {
          font-size: 10.5px;
          font-weight: bold;
          text-align: center;
        }

        .label-footer {
          font-size: 7.5px;
          text-align: left;
          width: 100%;
          margin-top: 2px;
        }

        .side-brand {
          position: absolute;
          right: -4px;
          top: 27%;
          transform: rotate(-90deg);
          transform-origin: right top;
          font-size: 15px;
          font-weight: bold;
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
          font-size: 14px;
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
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}.${mm}.${yy}`;
      };

      return this.printItems
        .map((p, i) => {
          const pkd = formatDate(this.packedOnDate);
          const exp = formatDate(p.expiryDate);

          return `
          <div class="dmart-label">
            <span class="side-brand">Dmart</span>
            <div class="label-header">J T FRUITS &amp; VEG</div>
            <div class="label-product">${p.productName}</div>
            <img id="dmart-bar-${i}" />
            <div class="barcode-value">${p.barcode}</div>

            <div class="info-row">
              <div class="info-left">M.R.P.</div>
              <div>Pkd. On ${pkd}</div>
            </div>
            <div class="info-row">
              <div class="price-value">₹${p.mrp.toFixed(2)}</div>
              <div>Exp. Dt. ${exp}</div>
            </div>

            <div class="label-footer">Incl. of all Taxes)</div>
          </div>`;
        })
        .join('');
    }

    private generateRelianceBody(): string {
      return this.printItems
        .map(
          (p, i) => `
        <div class="reliance-label">
          <div style="text-align:center;font-size:11px;"><b>J T FRUITS &amp; VEG</b></div>
          <div style="text-align:center;font-size:12px;">${p.productName}</div>
          <img id="rel-barcode-img-${i}" style="width:180px;height:40px;" />
          <div class="barcode-value">${p.barcode}</div>
          <div style="display:flex;justify-content:space-between;"><div><b>M.R.P :</b></div><div>₹${p.mrp}/-</div></div>
          <div style="display:flex;justify-content:space-between;"><div>PACKED ON :</b></div><div>${this.packedOnDate}</div></div>
          <div style="display:flex;justify-content:space-between;"><div><b>BEST BEFORE :</b></div><div><b>${p.expiryDays} DAYS</b></div></div>
          <div style="text-align:center;font-size:9px;">
            <div style="text-align:center;font-size:11px;"><b>FSSAI No. 11517011000128</b></div>
            <div style="text-align:center;font-size:10px;">Shop No. 31-32, Bldg No. 27,</div>
            <div style="text-align:center;font-size:10px;">EMP Op Jogers Park, Thakur Village,</div>
            <div style="text-align:center;font-size:10px;">Kandivali(E)</div>
            <div style="text-align:center;font-size:10px;">Customer Care No. 9594117456</div>
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
        },);

      } catch (e) {
        console.error('Error loading one or more barcode images:', e);
      }
    }

    // Handle print style change from UI
    onPrintStyleChange(style: LabelStyle) {
      this.selectedPrintStyle = style;

      // Clear invalid product selections if print style is 'reliance'
      if (style === 'reliance') {
        this.products.forEach(p => {
          const match = this.nameOptions.find(n => `${n.name} ${n.units}` === p.productName);
          if (!match || match.type?.toLowerCase() !== 'vegetable') {
            p.productName = '';
            p.category = '';
            p.barcode = '';
            p.dbBarcode = '';
          }
        });
      }

      this.products.forEach(p => this.generateBarcode(p));
      this.cdRef.detectChanges();
    }
  }