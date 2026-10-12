/* The resident's privacy card makes two promises:
     "your exact address is shared only when a booking is active"
     "your phone number is visible to a provider once they accept your request"
   Does the provider's screen keep them? A request the provider has not answered is
   neither active nor accepted. */
const { boot } = require('./harness.cjs');
const app = boot();

const renderProviderJob = (id) => {
  app.state.view = 'app'; app.state.role = 'provider'; app.state.tab = 'provider_booking_detail';
  app.state.selectedProviderBookingId = id;
  app.state.providerProfileModal = null; app.state.profileSheet = null; app.state.sheet = null;
  app.render();
  return app._document.getElementById('screen').innerHTML;
};

const rows = [];
for (const id of ['pb6', 'pb7', 'b8', 'b10', 'pb1', 'pb2', 'pb3', 'b6']) {
  const b = app.BOOKINGS.find(x => x.id === id);
  if (!b) { rows.push([id, 'no such booking', '', '']); continue; }
  const html = renderProviderJob(id);
  const text = html.replace(/<[^>]*>/g, ' ');
  const cust = app.CUSTOMERS.find(c => c.id === b.customerId) || {};
  const addr = b.address || '';
  const phone = cust.phone || b.phone || '';
  rows.push([id, b.status,
    addr && text.includes(addr) ? 'FULL ADDRESS ' + addr : 'address withheld',
    phone && text.includes(phone) ? 'PHONE ' + phone : 'phone withheld']);
}
console.log('booking  status      address                                        phone');
for (const [id, st, a, p] of rows) {
  console.log(String(id).padEnd(8) + String(st).padEnd(13) + a.padEnd(47) + p);
}

/* What the card promises, verbatim, and whether the two agree. */
const promise = app.residentSectionBody('privacy');
console.log('\nthe promise painted to the resident:');
console.log(promise.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320));
