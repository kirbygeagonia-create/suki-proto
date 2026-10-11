/* node tools/shot.cjs --probe=@tools/probe-injection.js --only=resident-profile
   ------------------------------------------------------------------
   Does typed text stay text?

   esc() is documented as the rule for every value that came from a keyboard, and
   tools/audit-escaping.cjs finds the sites statically. This asks the painted page whether
   it agrees: it puts a marker into each writable field, re-renders, and counts how many
   times the browser turned the marker into a real element instead of characters.

   A non-zero count is not a theoretical XSS note, it is the page admitting it parsed markup
   out of a name field. The marker is inert (an img that fails to load and an id we look for);
   nothing here executes anything. */
(function () {
  var MARK = '<img id="inj-probe" alt="">';
  var out = { paintedAsMarkup: [], paintedAsText: [], checked: 0 };

  function probe(label, setup) {
    document.querySelectorAll('#inj-probe').forEach(function (n) { n.remove(); });
    try { setup(); } catch (e) { out.checked++; out.paintedAsText.push(label + ' (threw: ' + e.message + ')'); return; }
    render();
    /* A profile module opens as a sheet, so the painted value may be anywhere in the layer
       stack — searching only #screen would report "not painted" for a field that is on screen. */
    var where = document.querySelector('#screen') || document.body;
    var live = document.querySelectorAll('#inj-probe').length;
    /* The escaped form is what proves it stayed text. Match the angle bracket only: esc()
       also turns the quotes into entities, and a check written against one quoting style
       reports a value that is now safely escaped as "not painted at all". */
    var raw = document.documentElement.innerHTML.indexOf('&lt;img') > -1;
    out.checked++;
    if (live) out.paintedAsMarkup.push(label + ' -> ' + live + ' element(s) built from the text');
    else if (raw) out.paintedAsText.push(label + ' -> stayed text');
    else out.paintedAsText.push(label + ' -> not painted on this screen');
  }

  var saved = JSON.stringify({ n: state.profileData.name, p: state.profileData.phone, a: state.profileData.address,
    b: state.profileData.barangay, e: state.profileData.emergencyContact, items: state.residentHouseholdItems,
    ppPhone: state.providerProfileData.phone, ppHours: state.providerProfileData.workingHours,
    portfolio: state.providerPortfolio, apName: state.adminProfileData.name, apOffice: state.adminProfileData.officeLocation });

  probe('resident profile name (edit modal input value)', function () {
    state.profileData.name = MARK; state.residentProfileModal = 'edit';
  });
  probe('resident profile phone (edit modal input value)', function () {
    state.profileData.phone = MARK; state.residentProfileModal = 'edit';
  });
  probe('resident profile address (edit modal input value)', function () {
    state.profileData.address = MARK; state.residentProfileModal = 'edit';
  });
  probe('resident household item nickname (profile module, opened as a sheet)', function () {
    state.residentProfileModal = null;
    state.residentHouseholdItems = [{ type: 'Water Pump', nickname: MARK }];
    openProfileSection('resident', 'home', 'Home & Maintenance', 'What the house runs on');
  });
  probe('resident profile name (hub card header, not the input)', function () {
    closeSheet();
    state.residentProfileModal = null;
  });

  /* The same three shapes in the other two roles, because a fix proven on one screen is a
     fix on one screen. */
  probe('provider profile phone (edit modal input value)', function () {
    state.providerProfileData.phone = MARK; state.providerProfileModal = 'edit';
  });
  probe('provider working hours (settings row, escaped by settingsRow)', function () {
    state.providerProfileModal = null;
    state.providerProfileData.workingHours = MARK;
    openProfileSection('provider', 'hours', 'Working Hours', MARK);
  });
  probe('provider portfolio description (profile module sheet)', function () {
    state.providerPortfolio = [{ service: 'Re-piping', description: MARK }];
    openProfileSection('provider', 'portfolio', 'Work Portfolio', 'Jobs worth showing');
  });
  probe('admin display name (edit modal input value)', function () {
    state.adminProfileData.name = MARK; state.adminAccountModal = 'edit';
  });
  probe('admin office location (account card body)', function () {
    state.adminAccountModal = null;
    state.adminProfileData.officeLocation = MARK;
  });

  var s = JSON.parse(saved);
  state.profileData.name = s.n; state.profileData.phone = s.p; state.profileData.address = s.a;
  state.profileData.barangay = s.b; state.profileData.emergencyContact = s.e;
  state.residentHouseholdItems = s.items; state.residentProfileModal = null;
  state.providerProfileData.phone = s.ppPhone; state.providerProfileData.workingHours = s.ppHours;
  state.providerPortfolio = s.portfolio;
  state.adminProfileData.name = s.apName; state.adminProfileData.officeLocation = s.apOffice;
  state.providerProfileModal = null; state.adminAccountModal = null;
  try { closeSheet(); } catch (ignored) {}
  document.querySelectorAll('#inj-probe').forEach(function (n) { n.remove(); });
  render();
  return out;
})()
