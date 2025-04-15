import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BillService } from '../bills.service';

@Component({
  selector: 'app-edit-bills',
  templateUrl: './edit-bills.component.html',
  styleUrls: ['./edit-bills.component.css']
})
export class EditBillComponent implements OnInit {
  billForm: FormGroup;
  billId: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private billService: BillService
  ) {
    this.billForm = this.fb.group({
      billNumber: ['', Validators.required],
      customerName: ['', Validators.required],
      date: ['', Validators.required],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.billId = this.route.snapshot.paramMap.get('id') || '';
    if (this.billId) {
      const id = Number(this.billId); // 👈 convert to number
      this.billService.getBillById(id).subscribe(bill => {
        this.billForm.patchValue({
          billNumber: bill.billNumber,
          customerName: bill.customerName,
          date: bill.date
        });
        this.setItems(bill.items);
      });
    }
}

  setItems(items: any[]): void {
    const formArray = this.billForm.get('items') as FormArray;
    formArray.clear(); // In case of previous data

    items.forEach(item => {
      formArray.push(this.fb.group({
        productName: [item.productName, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        price: [item.price, [Validators.required, Validators.min(0)]],
        margin: [item.margin, [Validators.min(0)]],
        discount: [item.discount, [Validators.min(0)]],
        total: [item.total]
      }));
    });
  }

  createItem(): FormGroup {
    return this.fb.group({
      productName: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      margin: [0, [Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      total: [0]
    });
  }

  get items(): FormArray {
    return this.billForm.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  calculate(index: number): void {
    const itemGroup = this.items.at(index) as FormGroup;

    const quantity = itemGroup.value.quantity || 0;
    const price = itemGroup.value.price || 0;
    const margin = itemGroup.value.margin || 0;
    const discount = itemGroup.value.discount || 0;

    const base = quantity * price;
    const withMargin = base + (base * margin / 100);
    const finalTotal = withMargin - (withMargin * discount / 100);

    itemGroup.patchValue({ total: finalTotal });
  }

  submit(): void {
    if (this.billForm.valid) {
      const billData = this.billForm.value;
      this.billService.updateBill(Number(this.billId), billData).subscribe({
        next: () => {
          alert('Bill updated!');
          this.router.navigate(['/bills']);
        },
        error: (err) => alert('Error: ' + err.message)
      });
    } else {
      alert('Please fill all required fields correctly.');
    }
  }
}
