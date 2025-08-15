import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { BillsService } from 'src/app/core/services/bills.service';
import { AfterViewInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-add-lumpsum-bills',
  templateUrl: './add-lumpsum-bills.component.html',
  styleUrls: ['./add-lumpsum-bills.component.css']
})

export class AddLumpsumBillsComponent implements OnInit, AfterViewInit {
  @ViewChild('addressBox') addressBox!: ElementRef<HTMLTextAreaElement>;

  clients: any[] = [];
  selectedClient: any = null;
  clientName: string = '';
  address: string = '';
  description: string = '';
  amount: number = 0;
  discount: number = 0;
  finalAmount: number = 0;
  billNumber: string = '';
  billDate: string = new Date().toISOString().substring(0, 10);
  manualEmail: string = '';

  constructor(
    private http: HttpClient,
    private billsService: BillsService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Add Lumpsum Bill');
    this.http.get<any[]>('http://localhost:3001/api/clients').subscribe(data => {
      this.clients = data;
    });

    this.billsService.getLatestBillNumber().subscribe({
      next: (res: { billNumber: string }) => this.billNumber = res.billNumber,
      error: () => this.billNumber = '001'
    });

    this.calculateFinalAmount();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.addressBox && this.addressBox.nativeElement) {
        const textArea = this.addressBox.nativeElement;
        textArea.style.height = 'auto';
        textArea.style.height = textArea.scrollHeight + 'px';
      }
    });
  }
  
  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      this.clientName = c.firstName;
      this.address = [c.address1, c.address2, c.area, c.city].filter(Boolean).join(', ');

      // Trigger auto-resize even for short addresses like "MUMBAI"
      setTimeout(() => {
        const textArea = document.querySelector('.address-area') as HTMLTextAreaElement;
        if (textArea) {
          textArea.style.height = 'auto';
          textArea.style.height = textArea.scrollHeight + 'px';
        }
      });
    }
  }

  calculateFinalAmount(): void {
    const discountAmount = this.amount * (this.discount / 100);
    this.finalAmount = this.amount - discountAmount;
  }

  saveBill(): void {
    const active = document.activeElement as HTMLElement;
    if (active && active.tagName === 'TEXTAREA') active.blur();

    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.amount,
      finalAmount: this.finalAmount,
      description: this.description,
      billItems: []
    };

    this.billsService.saveBill(billData).subscribe({
      next: () => {
        alert('Bill saved successfully!');
      },
      error: () => alert('Failed to save bill. Please try again.')
    });
  }

  printBill(): void {
    // Flush any focused input/textarea so ngModel updates first
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();

    // Validate minimal data to print
    if (!this.clientName && !this.address && !this.description && !this.amount) {
      alert('Nothing to print. Please fill bill details.');
      return;
    }

    // Ensure latest final amount is calculated
    this.calculateFinalAmount();

    const html = this.buildPrintHtml({
      clientName: this.clientName || '',
      address: this.address || '',
      billNumber: this.billNumber || '',
      billDate: this.billDate || '',
      description: this.description || '',
      amount: this.amount || 0,
      discount: this.discount || 0,
      finalAmount: this.finalAmount,
    });

    this.printHtmlInHiddenIframe(html); // no new tab / no popup
  }

  private async printHtmlInHiddenIframe(html: string): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
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
      // @ts-ignore fonts may not exist in some engines
      if ((doc as any).fonts?.ready) promises.push((doc as any).fonts.ready);
      const imgs = Array.from(doc.images || []);
      imgs.forEach(img => {
        if (img.complete) return;
        promises.push(new Promise(res => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }));
      });
      promises.push(new Promise(res => setTimeout(res, 50)));
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

  private buildPrintHtml(meta: {
    clientName: string;
    address: string;
    billNumber: string;
    billDate: string;
    description: string;
    amount: number;
    discount: number;
    finalAmount: number;
  }): string {
    const esc = (s: string) =>
      (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtINR = (n: number) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
      }).format(n);
    const dateStr = this.formatDateDDMMYYYY(meta.billDate);

    const styles = `
    <style>
      @page { size: A4; margin: 10mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      .print-toggle textarea,
      .print-toggle input,
      .print-toggle select {
        display: none !important;
      }
      .print-toggle .print-view {
        display: inline !important;
      }

      /* === BASE CONTAINER === */
      .container {
        max-width: 950px;
        margin: 0 auto;
        padding: 40px;
        font-family: 'Poppins','Segoe UI',Tahoma,sans-serif;
        background: #ffffff;
        color: #2c3e50;
      }

      /* === HEADER === */
      .top-section { text-align: center; margin-bottom: 20px; }
      .title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 6px; }
      .address-line,.license-line,.email-line { font-size: 13px; color: #546e7a; margin: 2px 0; }

      /* === INVOICE INFO === */
      .invoice-top {
        display: flex; justify-content: space-between; align-items: center;
        flex-wrap: wrap; margin: 20px 0; gap: 12px;
      }
      .invoice-title { flex: 1; text-align: center; font-size: 20px; font-weight: bold; }
      .field-inline { display: flex; align-items: center; gap: 8px; font-size: 14px; white-space: nowrap; }

      /* === NAME / ADDRESS BLOCK === */
      .horizontal-info { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
      .field-row { display: flex; flex: 1; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
      .field-row label { font-weight: 600; min-width: 80px; margin-top: 6px; white-space: nowrap; }

      /* === PRINT TOGGLE: ONLY SHOW TEXT, HIDE INPUTS === */
      .print-toggle .print-view { display: inline; }
      .print-toggle input,
      .print-toggle textarea,
      .print-toggle select { display: none; }   /* <- hides the input box in print */

      /* === DESCRIPTION (plain text, centered) === */
      .description-container { text-align: center; margin: 16px 0 22px; }
      .description-print {
        display: block;
        margin: 0 auto;
        padding: 0;                 /* remove padding so it doesn’t look like an input */
        border: 0;                  /* no border */
        background: transparent;    /* no background */
        border-radius: 0;           /* no rounded corners */
        font-size: 13px;            /* compact */
        line-height: 1.45;
        max-width: 85%;
        white-space: pre-line;      /* keep line breaks */
        word-break: break-word;     /* wrap long words */
        text-align: center;         /* stays centered—change to left if you prefer */
      }

      /* === SUMMARY BLOCK === */
      .print-summary-footer { margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
      .summary { display: flex; justify-content: flex-end; align-items: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; gap: 12px; }
    </style>`;

    return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Lumpsum Invoice ${esc(meta.billNumber)}</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <!-- HEADER -->
          <div class="top-section">
            <h2 class="title">J.T. Fruits &amp; Vegetables</h2>
            <div class="address-line">Shop No. 31-32, Bldg No. 27, EMP Op Jogers Park, Thakur Village, Kandivali(E), Mumbai 400101</div>
            <div class="license-line">PAN: AAJFJ0258J | FSS LICENSE ACT 2006 LICENSE NO: 11517011000128</div>
            <div class="email-line">Email: jkumarshahu5@gmail.com</div>

            <div class="invoice-top">
              <div class="field-inline">
                <label class="bold-label">Date:</label>
                <span class="print-view">${esc(dateStr)}</span>
              </div>
              <h3 class="invoice-title">TAX FREE INVOICE</h3>
              <div class="field-inline">
                <label class="bold-label">Bill No:</label>
                <span class="print-view">${esc(meta.billNumber)}</span>
              </div>
            </div>
          </div>

          <!-- CLIENT INFO -->
          <div class="horizontal-info">
            <div class="field-row">
              <label>Name:</label>
              <span class="print-view">${esc(meta.clientName)}</span>
            </div>
            <div class="field-row">
              <label>Address:</label>
              <span class="print-view" style="white-space: pre-line;">${esc(meta.address)}</span>
            </div>
          </div>

          <!-- DESCRIPTION (centered) -->
          <div class="description-container">
            <div class="description-print">${esc(meta.description)}</div>
          </div>

          <!-- SUMMARY -->
          <div class="print-summary-footer">
            <div class="summary">
              <label>Total Amount:</label>
              <div>${fmtINR(meta.amount)}</div>
            </div>
            <div class="summary">
              <label>Margin (%):</label>
              <div>${esc(String(meta.discount))}</div>
            </div>
            <div class="summary">
              <label>Final Amount:</label>
              <div>${fmtINR(meta.finalAmount)}</div>
            </div>
          </div>
        </div>
      </body>
    </html>`;
  }

  emailBill(): void {
    // Flush any focused control so ngModel writes latest values
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();

    setTimeout(() => {
      if (!this.manualEmail || !this.manualEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }

      // Make sure amounts are up to date
      this.calculateFinalAmount();

      // 🔑 Build the print-ready HTML using the SAME template you print
      const pdfHtml = this.buildPrintHtml({
        clientName: this.clientName || '',
        address: this.address || '',
        billNumber: this.billNumber || '',
        billDate: this.billDate || '',
        description: this.description || '',
        amount: this.amount || 0,
        discount: this.discount || 0,
        finalAmount: this.finalAmount || 0,
      });

      const billData = {
        clientName: this.clientName,
        address: this.address,
        billNumber: this.billNumber,
        billDate: this.billDate,
        discount: this.discount,
        totalAmount: this.amount,
        finalAmount: this.finalAmount,
        description: this.description,
        billItems: [],              // no line items for lumpsum
        email: this.manualEmail,
        billType: 'lumpsum',        // (optional) helpful if you want to branch later
        pdfHtml                     // ✨ send print HTML to server for PDF rendering
      };

      this.billsService.sendBillByEmail(billData).subscribe({
        next: () => alert('Email Sent!'),
        error: () => alert('Failed to send email. Please try again.')
      });
    }, 10);
  }

  autoResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto'; // Reset
    target.style.height = target.scrollHeight + 'px'; // Resize
  }
}
