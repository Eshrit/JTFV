import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  firstName: String,
  dateOfEntry: String,
  entryTime: String,
  address1: String,
  address2: String,
  area: String,
  city: String,
  phone1: String,
  mobile: String,
  landmark: String,
  email: String
});

const Client = mongoose.model('Client', clientSchema);
export default Client;
