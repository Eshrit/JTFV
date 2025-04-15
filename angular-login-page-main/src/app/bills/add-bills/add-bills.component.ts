import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-bill',
  templateUrl: './add-bills.component.html',
  styleUrls: ['./add-bills.component.css']
})
export class AddBillsComponent implements OnInit {
  billForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.billForm = this.fb.group({
      billNumber: [''],  // Bill number will be auto-generated
      clientName: ['', Validators.required],
      address: ['', Validators.required],
      date: ['', Validators.required],
      items: this.fb.array([this.createItem()])
    });
  }

  createItem(): FormGroup {
    return this.fb.group({
      productName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      margin: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]],
      total: [{ value: 0, disabled: true }]
    });
  }

  addItem(): void {
    (this.billForm.get('items') as FormArray).push(this.createItem());
  }

  removeItem(index: number): void {
    (this.billForm.get('items') as FormArray).removeAt(index);
  }

  calculate(index: number): void {
    const item = (this.billForm.get('items') as FormArray).at(index);
    const quantity = item.get('quantity')?.value;
    const price = item.get('price')?.value;
    const margin = item.get('margin')?.value;
    const discount = item.get('discount')?.value;

    // Calculate total for the row
    const total = (price * quantity) + ((price * quantity) * margin / 100) - ((price * quantity) * discount / 100);
    item.get('total')?.setValue(total);
  }

  submit(): void {
    console.log(this.billForm.value); // Log form data to console or send to backend
  }

  get items(): FormArray {
    return this.billForm.get('items') as FormArray;
  }
}
