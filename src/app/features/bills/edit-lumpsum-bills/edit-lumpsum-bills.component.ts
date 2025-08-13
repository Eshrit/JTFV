import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BillsService } from 'src/app/core/services/bills.service';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

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

  printBill(): void {
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

    this.printHtmlInHiddenIframe(html);
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

    const dateStr = new Date(meta.billDate).toLocaleDateString('en-GB');

    return `
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
          .address-line,.license-line,.email-line { font-size: 13px; margin: 2px 0; }

          .invoice-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin: 20px 0; }
          .invoice-title { flex: 1; text-align: center; font-size: 20px; font-weight: bold; }

          .horizontal-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .field-row { display: flex; gap: 10px; }
          .field-row label { font-weight: 600; }

          .description-container { text-align: center; margin: 16px 0 22px; }
          .description-print { font-size: 13px; line-height: 1.45; max-width: 85%; margin: auto; white-space: pre-line; }

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
            <div class="field-row"><label>Name:</label> ${esc(meta.clientName)}</div>
            <div class="field-row"><label>Address:</label> <span style="white-space: pre-line;">${esc(meta.address)}</span></div>
          </div>

          <div class="description-container">
            <div class="description-print">${esc(meta.description)}</div>
          </div>

          <div class="print-summary-footer">
            <div class="summary"><label>Total Amount:</label> ${fmtINR(meta.amount)}</div>
            <div class="summary"><label>Margin (%):</label> ${esc(String(meta.discount))}</div>
            <div class="summary"><label>Final Amount:</label> ${fmtINR(meta.finalAmount)}</div>
          </div>
        </div>
      </body>
    </html>`;
  }

  emailBill(): void {
    const active = document.activeElement as HTMLElement;
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
      active.blur();
    }

    setTimeout(() => {
      if (!this.manualEmail || !this.manualEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }

      const billData = {
        clientName: this.clientName,
        address: this.address,
        billNumber: this.billNumber,
        billDate: this.billDate,
        discount: this.discount,
        totalAmount: this.amount,
        finalAmount: this.finalAmount,
        description: this.description,
        billItems: [],
        email: this.manualEmail
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
}
