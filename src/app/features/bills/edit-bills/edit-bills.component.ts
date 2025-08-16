import { Component, OnInit, ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ProductService, Name } from 'src/app/core/services/products.service';
import { BillsService } from 'src/app/core/services/bills.service';

interface BillItem {
  productId: number | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

@Component({
  selector: 'app-edit-bills',
  templateUrl: './edit-bills.component.html',
  styleUrls: ['./edit-bills.component.css'],
})
export class EditBillsComponent implements OnInit {
  @ViewChildren('productSelect') productSelectInputs!: QueryList<ElementRef>;
  @ViewChild('addressTextarea') addressTextarea!: ElementRef<HTMLTextAreaElement>;

  products: Name[] = [];
  namesMap: { [id: number]: string } = {};
  billItems: BillItem[] = [];
  clientName = '';
  address = '';
  billNumber = '';
  billDate = new Date().toISOString().substring(0, 10);
  discount = 0;
  totalAmount = 0;
  finalAmount = 0;
  manualEmail: string = '';

  clients: any[] = [];
  selectedClient: any = null;

  constructor(
    private productService: ProductService,
    private billsService: BillsService,
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Edit Bill - J.T. Fruits & Vegetables');

    this.productService.getNames().subscribe((names: Name[]) => {
      this.products = names.sort((a, b) => a.name.localeCompare(b.name));
      this.namesMap = Object.fromEntries(this.products.map((n) => [n.id, n.name]));

      this.route.paramMap.subscribe((params) => {
        const billNumber = params.get('billNumber');
        if (billNumber) this.loadBillForEdit(billNumber);
      });
    });

    this.billsService.getClients().subscribe((data: any[]) => {
      this.clients = data;
    });

    // Initialize with one empty row
    this.billItems.push({
      productId: null,
      productName: '',
      quantity: 0,
      price: 0,
      total: 0,
    });
  }

  /** ========== Helpers for Textarea Resize ========== */
  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  triggerResize(): void {
    if (this.addressTextarea) {
      const el = this.addressTextarea.nativeElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }
  autoResizeTextarea(): void {
    if (this.addressTextarea?.nativeElement) {
      const el = this.addressTextarea.nativeElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }

  /** ========== Load Bill for Editing ========== */
  loadBillForEdit(billNumber: string) {
    this.billsService.getBillByNumber(billNumber).subscribe({
      next: (bill) => {
        this.clientName = bill.clientName;
        this.address = bill.address;

        setTimeout(() => this.autoResizeTextarea(), 0);

        this.billNumber = bill.billNumber;
        this.billDate = bill.billDate;
        this.discount = bill.discount;
        this.totalAmount = bill.totalAmount;
        this.finalAmount = bill.finalAmount;
        this.billItems = bill.billItems || [];

        this.billItems.forEach((item) => {
          item.productName = item.productId
            ? this.namesMap[item.productId] || '(Unknown)'
            : '';
        });

        const match = this.clients.find((c) => c.firstName === bill.clientName);
        if (match) this.selectedClient = match;
      },
      error: (err) => {
        console.error('Failed to load bill:', err);
        alert('Failed to load bill.');
      },
    });
  }

  /** ========== Client & Product Handling ========== */
  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      const parts = [c.address1, c.address2, c.area, c.city].filter(Boolean);
      this.clientName = c.firstName;
      this.address = parts.join(', ');
      setTimeout(() => this.autoResizeTextarea(), 0);
    }
  }

  onProductChange(index: number): void {
    const selectedId = this.billItems[index].productId;
    const selectedProduct = this.products.find((p) => p.id === selectedId);

    if (selectedProduct) {
      const nameWithUnits =
        selectedProduct.name + (selectedProduct.units ? ' ' + selectedProduct.units : '');
      this.billItems[index].productName = nameWithUnits;
    } else {
      this.billItems[index].productName = '(Unknown)';
    }

    this.calculateRowTotal(index);
  }

  /** ========== Calculations ========== */
  calculateRowTotal(index: number): void {
    const item = this.billItems[index];
    item.total = (item.quantity || 0) * (item.price || 0);
    this.calculateTotalAmount();
  }
  calculateTotalAmount(): void {
    this.totalAmount = this.billItems.reduce((acc, item) => acc + item.total, 0);
    this.calculateFinalAmount();
  }
  calculateFinalAmount(): void {
    const discountAmount = this.totalAmount * (this.discount / 100);
    this.finalAmount = this.totalAmount - discountAmount;
  }

  /** ========== Keyboard Row Add (Tab) ========== */
  onPriceKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();

      if (index === this.billItems.length - 1) {
        this.billItems.push({
          productId: null,
          productName: '',
          quantity: 0,
          price: 0,
          total: 0,
        });

        setTimeout(() => {
          const productSelectArray = this.productSelectInputs.toArray();
          const nextProductSelect = productSelectArray[index + 1];
          if (nextProductSelect) {
            nextProductSelect.nativeElement.focus();
          }
        }, 0);
      } else {
        const productSelectArray = this.productSelectInputs.toArray();
        const nextProductSelect = productSelectArray[index + 1];
        if (nextProductSelect) {
          nextProductSelect.nativeElement.focus();
        }
      }
    }
  }

  /** ========== PRINT BILL ========== */
  printBill(): void {
    const validItems = this.billItems
      .filter((i) => i.productId !== null && i.quantity > 0 && i.price > 0)
      .map((i) => ({
        ...i,
        productName:
          i.productName ||
          (() => {
            const prod = this.products.find((p) => p.id === i.productId);
            return prod ? prod.name + (prod.units ? ' ' + prod.units : '') : '(Unknown)';
          })(),
      }));

    if (validItems.length === 0) {
      alert('No valid items to print. Please check quantity and price fields.');
      return;
    }

    const totalAmount = validItems.reduce(
      (acc, it) => acc + (it.quantity || 0) * (it.price || 0),
      0
    );
    const discountAmount = totalAmount * (this.discount / 100);
    const finalAmount = totalAmount - discountAmount;

    const html = this.buildPrintHtml(validItems, {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount,
      finalAmount,
    });

    this.printHtmlInHiddenIframe(html);
  }

  private async printHtmlInHiddenIframe(html: string): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      alert('Unable to create print frame.');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const waitForAssets = async () => {
      const promises: Promise<unknown>[] = [];
      // Wait for fonts
      if ((doc as any).fonts?.ready) promises.push((doc as any).fonts.ready);
      // Wait for images
      Array.from(doc.images || []).forEach((img) => {
        if (!img.complete) {
          promises.push(
            new Promise((res) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            })
          );
        }
      });
      promises.push(new Promise((res) => setTimeout(res, 100)));
      await Promise.all(promises);
    };

    try {
      await waitForAssets();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }
  }

  private formatDateDDMMYYYY(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || '';
    return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
  }

  /** ========== PRINT HTML TEMPLATE ========== */
  private buildPrintHtml(
    items: Array<{ productId: number | null; productName: string; quantity: number; price: number; total?: number }>,
    meta: {
      clientName: string;
      address: string;
      billNumber: string;
      billDate: string;
      discount: number;
      totalAmount: number;
      finalAmount: number;
    }
  ): string {
    const esc = (s: string) =>
      (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtINR = (n: number) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(n);
    const n2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '');
    const dateStr = this.formatDateDDMMYYYY(meta.billDate);

    const rows = items
      .map((it, i) => {
        const total = (it.quantity || 0) * (it.price || 0);
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(it.productName)}</td>
            <td>${esc(String(it.quantity))}</td>
            <td>${n2(it.price)}</td>
            <td>${n2(total)}</td>
          </tr>`;
      })
      .join('');

    const styles = `
    <style>
      @page { size: A4 portrait; margin: 10mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { background: #fff; }

      .container {
        max-width: 900px; margin: 0 auto; padding: 20px;
        font-family: 'Poppins','Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
        color: #2c3e50; font-size: 10px; line-height: 1.25;
      }
      .header { text-align: center; margin-bottom: 12px; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #333; }
      .header p { margin: 2px 0; font-size: 10px; color: #546e7a; }

      .invoice-header { margin-top: 10px; }
      .header-flex { display: flex; justify-content: space-between; align-items: center; }
      .invoice-title { font-size: 13px; font-weight: 700; }
      .bold-label { font-weight: 700; }

      .horizontal-info { display: flex; gap: 10px; justify-content: space-between; margin-bottom: 12px; }
      .field-row { display: flex; align-items: center; gap: 6px; font-size: 9.5px; }
      .field-row label { font-weight: 600; min-width: 60px; }

      table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin: 10px 0; }
      th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: center; }
      th { background: #ecf0f1; font-weight: 700; }
      tr { page-break-inside: avoid; }

      .summary { display: flex; justify-content: flex-end; font-weight: 700; font-size: 10px; margin-bottom: 4px; gap: 6px; }
    </style>`;

    return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invoice ${esc(meta.billNumber)}</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>J.T. Fruits &amp; Vegetables</h1>
            <p>Shop No. 31-32, Bldg No. 27, EMP Op Jogers Park, Thakur Village, Kandivali(E), Mumbai 400101</p>
            <p>PAN: AAJFJ0258J | FSS LICENSE ACT 2006 LICENSE NO: 11517011000128</p>
            <p>Email: jkumarshahu5@gmail.com</p>
            <div class="invoice-header">
              <div class="header-flex">
                <div><span class="bold-label">Date:</span> ${esc(dateStr)}</div>
                <div class="invoice-title">TAX FREE INVOICE</div>
                <div><span class="bold-label">Bill No:</span> ${esc(meta.billNumber)}</div>
              </div>
            </div>
          </div>

          <div class="horizontal-info">
            <div class="field-row"><label>Name:</label><div>${esc(meta.clientName)}</div></div>
            <div class="field-row"><label>Address:</label><div style="white-space: pre-line;">${esc(meta.address)}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th><th>Product</th><th>Quantity</th><th>Product Price</th><th>Total Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="summary"><label>Total Amount:</label><div>${fmtINR(meta.totalAmount)}</div></div>
          <div class="summary"><label>Margin (%):</label><div>${esc(String(meta.discount || 0))}</div></div>
          <div class="summary"><label>Final Amount:</label><div>${fmtINR(meta.finalAmount)}</div></div>
        </div>
      </body>
    </html>`;
  }

  /** ========== EMAIL BILL ========== */
  emailBill(): void {
    const validItems = this.billItems.filter(
      (item) => item.productId !== null && item.productName && item.quantity > 0 && item.price > 0
    );
    if (validItems.length === 0) {
      alert('No valid items to email.');
      return;
    }
    if (!this.manualEmail || !this.manualEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    const totalAmount = validItems.reduce(
      (acc, it) => acc + (it.quantity || 0) * (it.price || 0),
      0
    );
    const discountAmount = totalAmount * (this.discount / 100);
    const finalAmount = totalAmount - discountAmount;

    const pdfHtml = this.buildPrintHtml(validItems, {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount,
      finalAmount,
    });

    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount,
      finalAmount,
      billItems: validItems,
      email: this.manualEmail,
      pdfHtml,
    };

    this.billsService.sendBillByEmail(billData).subscribe({
      next: () => alert('Email Sent!'),
      error: (err) => {
        console.error('Email failed:', err);
        alert('Failed to send email.');
      },
    });
  }

  /** ========== SAVE BILL ========== */
  saveBill(): void {
    const updatedBill = {
      clientName: this.clientName,
      address: this.address,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.totalAmount,
      finalAmount: this.finalAmount,
      billItems: this.billItems,
    };

    this.billsService.updateBill(this.billNumber, updatedBill).subscribe({
      next: () => alert('Bill updated successfully!'),
      error: (err) => {
        alert('Failed to update bill.');
        console.error('Error updating bill:', err);
      },
    });
  }
}