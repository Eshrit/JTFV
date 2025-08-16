import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BillsService } from 'src/app/core/services/bills.service';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, args?: any) => Promise<any>;
      };
    };
  }
}

@Component({
  selector: 'app-edit-lumpsum-bills',
  templateUrl: './edit-lumpsum-bills.component.html',
  styleUrls: ['./edit-lumpsum-bills.component.css']
})
export class EditLumpsumBillsComponent implements OnInit, AfterViewInit {
  @ViewChild('addressBox') addressBox!: ElementRef<HTMLTextAreaElement>;

  clients: any[] = [];
  selectedClient: any = null;
  clientName = '';
  address = '';
  description = '';
  amount = 0;
  discount = 0;
  finalAmount = 0;
  billNumber = '';
  billDate = '';
  manualEmail = '';

  constructor(
    private route: ActivatedRoute,
    private billsService: BillsService,
    private http: HttpClient,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Edit Lumpsum Bill');
    this.billNumber = this.route.snapshot.paramMap.get('billNumber') || '';

    // Fetch clients
    this.http.get<any[]>('http://localhost:3001/api/clients').subscribe(data => {
      this.clients = data;
    });

    // Load bill data
    this.billsService.getBillByNumber(this.billNumber).subscribe(bill => {
      this.clientName = bill.clientName;
      this.address = bill.address;
      this.description = bill.description;
      this.amount = bill.totalAmount;
      this.discount = bill.discount;
      this.finalAmount = bill.finalAmount;
      this.billDate = bill.billDate;

      const matchingClient = this.clients.find(c => c.firstName === bill.clientName);
      if (matchingClient) {
        this.selectedClient = matchingClient;
      }

      // Trigger resize after address is loaded
      setTimeout(() => this.autoResize(), 0);
    });

    this.calculateFinalAmount();
  }

  ngAfterViewInit(): void {
    // Trigger resize after view has been initialized
    setTimeout(() => this.autoResize(), 0);
  }

  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      this.clientName = c.firstName;
      this.address = [c.address1, c.address2, c.area, c.city].filter(Boolean).join(', ');
      setTimeout(() => this.autoResize(), 0);
    }
  }

  calculateFinalAmount(): void {
    const discountAmount = this.amount * (this.discount / 100);
    this.finalAmount = this.amount - discountAmount;
  }

  updateBill(): void {
    const updatedBill = {
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

    this.billsService.updateBill(this.billNumber, updatedBill).subscribe({
      next: () => alert('Bill updated successfully!'),
      error: () => alert('Failed to update bill. Please try again.')
    });
  }

  async printBill(): Promise<void> {
    // Blur active element so ngModel updates
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();

    if (!this.clientName && !this.address && !this.description && !this.amount) {
      alert('Nothing to print. Please fill bill details.');
      return;
    }

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

    try {
      // Prefer Electron IPC → forces A4 via Canon (handled in main process)
      if (window.electron?.ipcRenderer?.invoke) {
        const dataUrl = this.htmlToDataUrl(html);
        await window.electron.ipcRenderer.invoke('print:canon-a4', {
          url: dataUrl,
          landscape: false
        });
      } else {
        // Fallback when running in a normal browser
        await this.printHtmlInHiddenIframe(html);
      }
    } catch (err) {
      console.error('Print failed:', err);
      alert('Print failed. Please check the printer connection.');
    }
  }

  private async printHtmlInHiddenIframe(html: string): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
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
      // @ts-ignore
      if ((doc as any).fonts?.ready) promises.push((doc as any).fonts.ready);
      Array.from(doc.images || []).forEach(img => {
        if (!img.complete) {
          promises.push(new Promise(res => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          }));
        }
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

    const dateStr = meta.billDate ? new Date(meta.billDate).toLocaleDateString('en-GB') : '';

    return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invoice ${esc(meta.billNumber)}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Poppins','Segoe UI',sans-serif; }

          .container { max-width: 950px; margin: 0 auto; padding: 40px; background: #fff; color: #2c3e50; }

          .top-section { text-align: center; margin-bottom: 20px; }
          .title { font-size: 28px; font-weight: bold; margin-bottom: 6px; }
          .address-line,.license-line,.email-line { font-size: 13px; margin: 2px 0; color: #546e7a; }

          .invoice-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 20px 0; }
          .invoice-title { flex: 1; text-align: center; font-size: 20px; font-weight: bold; }

          .horizontal-info { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
          .field-row { display: flex; gap: 10px; }
          .field-row label { font-weight: 600; white-space: nowrap; }

          .description-container { text-align: center; margin: 16px 0 22px; }
          .description-print { font-size: 13px; line-height: 1.45; max-width: 85%; margin: auto; white-space: pre-line; word-break: break-word; }

          .print-summary-footer { margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          .summary { display: flex; justify-content: flex-end; font-size: 16px; font-weight: bold; margin-bottom: 12px; gap: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="top-section">
            <h2 class="title">J.T. Fruits &amp; Vegetables</h2>
            <div class="address-line">Shop No. 31-32, Bldg No. 27, EMP Op Jogers Park, Thakur Village, Kandivali(E), Mumbai 400101</div>
            <div class="license-line">PAN: AAJFJ0258J | FSS LICENSE ACT 2006 LICENSE NO: 11517011000128</div>
            <div class="email-line">Email: jkumarshahu5@gmail.com</div>
            <div class="invoice-top">
              <div>Date: ${esc(dateStr)}</div>
              <div class="invoice-title">TAX FREE INVOICE</div>
              <div>Bill No: ${esc(meta.billNumber)}</div>
            </div>
          </div>

          <div class="horizontal-info">
            <div class="field-row"><label>Name:</label> <span>${esc(meta.clientName)}</span></div>
            <div class="field-row"><label>Address:</label> <span style="white-space: pre-line;">${esc(meta.address)}</span></div>
          </div>

          <div class="description-container">
            <div class="description-print">${esc(meta.description)}</div>
          </div>

          <div class="print-summary-footer">
            <div class="summary"><label>Total Amount:</label> <div>${fmtINR(meta.amount)}</div></div>
            <div class="summary"><label>Margin (%):</label> <div>${esc(String(meta.discount))}</div></div>
            <div class="summary"><label>Final Amount:</label> <div>${fmtINR(meta.finalAmount)}</div></div>
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

      // Build the print-ready HTML using the SAME template you print
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
        billType: 'lumpsum',        // optional flag
        pdfHtml                     // send print HTML to server for PDF rendering
      };

      this.billsService.sendBillByEmail(billData).subscribe({
        next: () => alert('Email Sent!'),
        error: () => alert('Failed to send email. Please try again.')
      });
    }, 10);
  }

  autoResize(event?: Event): void {
    const textarea = event
      ? (event.target as HTMLTextAreaElement)
      : this.addressBox?.nativeElement;

    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  /** Convert raw HTML to a data URL for Electron printing */
  private htmlToDataUrl(html: string): string {
    const b64 = btoa(unescape(encodeURIComponent(html)));
    return `data:text/html;base64,${b64}`;
  }
}