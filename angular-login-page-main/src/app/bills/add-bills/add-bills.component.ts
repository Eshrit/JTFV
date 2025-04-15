import { Component } from '@angular/core';
import { BillService } from '../bills.service';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-bills',
  templateUrl: './add-bills.component.html',
  styleUrls: ['./add-bills.component.css']
})
export class AddBillComponent {
  billForm: FormGroup;

  constructor(private fb: FormBuilder, private billService: BillService) {
    this.billForm = this.fb.group({
      billNumber: [''],
      customerName: [''],
      date: [''],
      items: this.fb.array([this.createItem()])
    });
  }

  createItem(): FormGroup {
    return this.fb.group({
      productName: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      margin: [0, [Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      total: [0] // Initialize as FormControl
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
    const item = this.items.at(index);

    const qty = item.get('quantity')?.value || 0;
    const price = item.get('price')?.value || 0;
    const margin = item.get('margin')?.value || 0;
    const discount = item.get('discount')?.value || 0;

    const base = qty * price;
    const withMargin = base + (base * margin / 100);
    const final = withMargin - (withMargin * discount / 100);

    // Access 'total' with a check for null
    const totalControl = item.get('total');
    if (totalControl instanceof FormControl) {
      totalControl.setValue(final);
    }
  }

  submit(): void {
    const billData = this.billForm.getRawValue();
    this.billService.addBill(billData).subscribe({
      next: () => alert('Bill added successfully!'),
      error: (err) => alert('Error: ' + err.message)
    });
  }
}
