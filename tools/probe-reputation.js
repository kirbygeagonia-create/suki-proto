/* One expression: shot.cjs evaluates the probe as `(${expr})`.
   Records a 1-star rating through the app's own handler, then writes and re-reads the
   dump, to answer the two questions that matter — does the published figure move, and
   does it move only once. The booking must be one the resident is allowed to rate:
   setBookingRating reads bookingsForResident(), and an earlier draft of this probe
   picked a provider-side id, which the handler correctly refused and the probe reported
   as "nothing moved" for the wrong reason. */
(function () {
  var byId = function (id) { return PROVIDERS.filter(function (x) { return x.id === id; })[0]; };
  var b = bookingsForResident().filter(function (x) {
    return x.status === 'completed';
  })[0];
  if (!b) return { error: 'no completed booking on this account' };
  changeBookingRating(b.id);          // the app's own way back to an unrated job
  var byId2 = byId(b.providerId);
  var cleared = { rating: byId2.rating, fromDevice: byId2.ratingsFromDevice };
  var seed = { provider: b.providerId, rating: byId2.seedRating, ratings: byId2.seedRatings,
    jobs: byId2.seedJobs };
  var before = { rating: byId2.rating, jobs: byId2.jobs, fromDevice: byId2.ratingsFromDevice };
  setBookingRating(b.id, 1);
  var q = byId(b.providerId);
  var after = { rating: q.rating, jobs: q.jobs, fromDevice: q.ratingsFromDevice, booking: b.id };
  persist();
  hydrate();
  refreshReputation();
  var r = byId(b.providerId);
  return { seed: seed, before: before, after: after,
    reloaded: { rating: r.rating, jobs: r.jobs, fromDevice: r.ratingsFromDevice } };
})()
