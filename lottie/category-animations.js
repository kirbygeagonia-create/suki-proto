/* Sukinnect category artwork, in Lottie's own format.
 *
 * Why Lottie and not the CSS keyframes this file used to carry: the animation is
 * now *content*. A designer can open any entry below in After Effects or
 * LottieFiles, replace it, and no line of the app changes. The CSS version could
 * only be edited here.
 *
 * Why the data is a script and not six .json files: the Android shell loads the
 * app over file://, where Chrome refuses the XHR that lottie's `path:` option
 * uses. Passing `animationData` from a script tag is the only route that works
 * offline. Same reason leaflet is vendored rather than fetched.
 *
 * Colours are injected at mount time from SERVICE_THEME, so the trade palette
 * still has exactly one source in the app.
 */
(function (global) {
  'use strict';

  var FR = 30;          /* frames per second */
  var LOOP = 90;        /* three seconds, then repeat */

  /* ---- schema helpers -------------------------------------------------- */
  /* A scalar track: opacity and rotation. */
  function kNum(stops) {
    return {
      a: 1,
      k: stops.map(function (s, i) {
        var f = { t: s[0], s: [s[1]] };
        if (i < stops.length - 1) { f.i = { x: [0.62], y: [1] }; f.o = { x: [0.38], y: [0] }; }
        return f;
      })
    };
  }
  /* A two/three-dimensional track: position and scale. */
  function kVec(stops) {
    return {
      a: 1,
      k: stops.map(function (s, i) {
        var f = { t: s[0], s: s[1] };
        if (i < stops.length - 1) {
          var n = s[1].length;
          f.i = { x: new Array(n).fill(0.62), y: new Array(n).fill(1) };
          f.o = { x: new Array(n).fill(0.38), y: new Array(n).fill(0) };
        }
        return f;
      })
    };
  }
  function stat(v) { return { a: 0, k: v }; }

  function transform(p, a, s, r, o) {
    return {
      /* `ty:'tr'` is how Lottie finds a group's transform. Without it the shape
         items parse fine but the group renders empty — an invisible failure with
         nothing in the console. */
      ty: 'tr',
      p: p === undefined ? stat([0, 0]) : p,
      a: a === undefined ? stat([0, 0]) : a,
      s: s === undefined ? stat([100, 100]) : s,
      r: r === undefined ? stat(0) : r,
      o: o === undefined ? stat(100) : o
    };
  }
  function fill(rgb, opacity) { return { ty: 'fl', c: stat(rgb), o: stat(opacity === undefined ? 100 : opacity), r: 1 }; }
  function stroke(rgb, w, opacity) { return { ty: 'st', c: stat(rgb), o: stat(opacity === undefined ? 100 : opacity), w: stat(w), lc: 2, lj: 2 }; }
  function ellipse(x, y, w, h) { return { ty: 'el', p: stat([x, y]), s: stat([w, h === undefined ? w : h]) }; }
  function rect(x, y, w, h, r) { return { ty: 'rc', p: stat([x, y]), s: stat([w, h]), r: stat(r || 0) }; }
  function poly(pts, closed) { return { ty: 'sh', ks: stat({ c: !!closed, v: pts, i: pts.map(function () { return [0, 0]; }), o: pts.map(function () { return [0, 0]; }) }) }; }

  /* One group = one shape + its paint + its own animated transform. */
  function part(shapes, tr) { return { ty: 'gr', nm: 'p', np: 3, it: shapes.concat([tr || transform()]) }; }

  function layer(parts, tr) {
    return {
      ddd: 0, ty: 4, nm: 'L', sr: 1, ao: 0, ip: 0, op: LOOP, st: 0,
      ks: Object.assign({ o: stat(100), r: stat(0), p: stat([0, 0]), a: stat([0, 0]), s: stat([100, 100]) }, tr || {}),
      shapes: parts
    };
  }
  function scene(parts) {
    return { v: '5.7.4', fr: FR, ip: 0, op: LOOP, w: 56, h: 56, nm: 'cat', ddd: 0, assets: [], layers: [layer(parts)] };
  }

  /* ---- the artwork ------------------------------------------------------ */
  /* Each builder receives [fg, bg] as 0..1 rgb, straight from SERVICE_THEME. */
  var BUILDS = {
    plumbing: function (c) {
      var fg = c.fg, soft = c.soft;
      return scene([
        /* the tap: body, arm, spout */
        part([rect(14, 18, 10, 16, 3), fill(fg, 92)]),
        part([rect(11, 8, 16, 5, 2), fill(fg, 74)]),
        part([rect(22, 19, 16, 8, 3), fill(fg, 92)]),
        part([rect(34, 22, 8, 10, 3), fill(fg, 92)]),
        /* three drops falling in turn */
        part([ellipse(38, 36, 6, 7), fill(soft, 95)], transform(
          stat([0, 0]), stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: 0, s: [100] }, { t: 26, s: [100] }, { t: 30, s: [0] }, { t: 90, s: [0] }] })),
        part([ellipse(38, 36, 6, 7), fill(soft, 95)], transform(
          kVec([[0, [0, -14]], [30, [0, -14]], [60, [0, 8]], [64, [0, 8]], [90, [0, 8]]]),
          stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: 0, s: [0] }, { t: 32, s: [0] }, { t: 36, s: [100] }, { t: 60, s: [100] }, { t: 64, s: [0] }, { t: 90, s: [0] }] })),
        /* the pool, rippling */
        part([ellipse(38, 48, 22, 6), fill(soft, 34)], transform(
          stat([0, 0]), stat([0, 0]),
          kVec([[0, [60, 60]], [45, [100, 100]], [90, [60, 60]]]))),
      ]);
    },

    electrical: function (c) {
      var fg = c.fg, soft = c.soft;
      return scene([
        /* halo breathing */
        part([ellipse(28, 22, 44, 44), fill(soft, 30)], transform(
          stat([0, 0]), stat([0, 0]),
          kVec([[0, [72, 72]], [45, [100, 100]], [90, [72, 72]]]),
          stat(0),
          { a: 1, k: [{ t: 0, s: [40] }, { t: 45, s: [100] }, { t: 90, s: [40] }] })),
        /* glass, neck, screw */
        part([ellipse(28, 21, 27, 27), fill(fg, 88)]),
        part([poly([[21, 31], [35, 31], [32, 38], [24, 38]], true), fill(fg, 88)]),
        part([rect(22, 38, 12, 4, 1.6), fill(fg, 72)]),
        part([rect(23.5, 43, 9, 3.4, 1.4), fill(fg, 58)]),
        part([rect(25, 47, 6, 3, 1.2), fill(fg, 44)]),
        /* filament flicking */
        part([rect(25, 24, 2.4, 9, 1.2), fill([1, 1, 1, 1], 92)], transform(
          stat([0, 0]), stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: 0, s: [55] }, { t: 22, s: [100] }, { t: 34, s: [62] }, { t: 58, s: [100] }, { t: 90, s: [55] }] })),
        part([rect(29, 24, 2.4, 9, 1.2), fill([1, 1, 1, 1], 92)], transform(
          stat([0, 0]), stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: 0, s: [100] }, { t: 26, s: [58] }, { t: 48, s: [100] }, { t: 90, s: [100] }] })),
      ]);
    },

    cleaning: function (c) {
      var fg = c.fg, soft = c.soft;
      function bubble(x, y, d, delay) {
        return part([ellipse(x, y, d, d), stroke(soft, 2.2, 90)], transform(
          kVec([[delay, [0, 0]], [delay + 55, [0, -26]]]),
          stat([0, 0]),
          kVec([[delay, [55, 55]], [delay + 20, [100, 100]], [delay + 55, [108, 108]]]),
          stat(0),
          { a: 1, k: [{ t: delay, s: [0] }, { t: delay + 10, s: [95] }, { t: delay + 45, s: [80] }, { t: delay + 55, s: [0] }, { t: 90, s: [0] }] }));
      }
      return scene([
        part([rect(16, 32, 15, 20, 4), fill(fg, 90)]),          /* bottle */
        part([rect(19, 25, 9, 8, 2), fill(fg, 76)]),            /* neck   */
        part([poly([[27, 26], [38, 26], [36, 32], [27, 32]], true), fill(fg, 66)]), /* head */
        part([rect(36, 20, 5, 7, 2), fill(fg, 80)]),            /* nozzle */
        part([rect(18.5, 39, 10, 11, 3), fill([1, 1, 1, 1], 34)]), /* liquid */
        bubble(41, 26, 9, 0),
        bubble(47, 22, 6.5, 18),
        bubble(43, 16, 4.5, 36),
        /* a sparkle, twice */
        part([poly([[9, 12], [10.6, 16], [14.6, 17.6], [10.6, 19.2], [9, 23.2], [7.4, 19.2], [3.4, 17.6], [7.4, 16]], true), fill(soft, 95)], transform(
          stat([0, 0]), stat([9, 17.6]),
          kVec([[0, [30, 30]], [22, [100, 100]], [44, [30, 30]], [90, [30, 30]]]),
          kNum([0, 22, 44, 90].map(function (t, i) { return [t, [0, 45, 90, 135][i]]; })))),
      ]);
    },

    tutoring: function (c) {
      var fg = c.fg, soft = c.soft;
      return scene([
        part([rect(28, 30, 34, 22, 3), fill(fg, 82)]),                       /* covers  */
        part([rect(17, 29, 11, 18, 1.5), fill([1, 1, 1, 1], 88)]),           /* left    */
        part([rect(39, 29, 11, 18, 1.5), fill([1, 1, 1, 1], 74)]),           /* right   */
        part([rect(28, 30, 1.6, 21, .8), fill(fg, 95)]),                     /* spine   */
        /* the page lifting and turning over the spine */
        part([rect(34, 29, 11, 18, 1.5), fill([1, 1, 1, 1], 62)], transform(
          stat([0, 0]), stat([28.5, 0]),
          kVec([[0, [100, 100]], [34, [100, 100]], [52, [6, 100]], [70, [100, 100]], [90, [100, 100]]]))),
        /* rules on the left page */
        part([rect(15, 25, 8, 1.6, .8), fill(soft, 70)]),
        part([rect(15, 29, 8, 1.6, .8), fill(soft, 55)]),
        /* an idea, rising off the book */
        part([ellipse(28, 14, 5, 5), fill(soft, 90)], transform(
          kVec([[0, [0, 6]], [50, [0, -10]], [90, [0, 6]]]),
          stat([0, 0]),
          kVec([[0, [50, 50]], [25, [100, 100]], [50, [100, 100]], [90, [50, 50]]]),
          stat(0),
          { a: 1, k: [{ t: 0, s: [0] }, { t: 18, s: [95] }, { t: 44, s: [80] }, { t: 60, s: [0] }, { t: 90, s: [0] }] })),
      ]);
    },

    appliance: function (c) {
      var fg = c.fg, soft = c.soft;
      return scene([
        part([rect(28, 28, 40, 42, 9), fill(fg, 86)]),                        /* shell  */
        part([rect(28, 11, 38, 6, 3), fill([1, 1, 1, 1], 26)]),               /* panel  */
        part([ellipse(16, 11.5, 5, 5), fill([1, 1, 1, 1], 78)]),
        part([ellipse(24, 11.5, 5, 5), fill([1, 1, 1, 1], 95)], transform(
          stat([0, 0]), stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: 0, s: [30] }, { t: 20, s: [100] }, { t: 44, s: [34] }, { t: 68, s: [100] }, { t: 90, s: [30] }] })),
        part([ellipse(28, 32, 26, 26), fill([1, 1, 1, 1], 52)]),              /* glass  */
        /* the load, tumbling */
        part([
          ellipse(28, 24, 6, 6), fill(soft, 85),
          ellipse(35, 36, 6, 6), fill(soft, 85),
          ellipse(21, 36, 6, 6), fill(soft, 85)
        ], transform(stat([0, 0]), stat([28, 32]), stat([100, 100]), kNum([[0, 0], [90, 360]]))),
        part([ellipse(28, 32, 26, 26), stroke(fg, 3, 92)]),                   /* rim    */
        part([ellipse(28, 32, 10, 10), fill(soft, 30)], transform(
          stat([0, 0]), stat([0, 0]),
          kVec([[0, [80, 80]], [45, [118, 118]], [90, [80, 80]]]))),
      ]);
    },

    delivery: function (c) {
      var fg = c.fg, soft = c.soft;
      function dash(x, delay) {
        return part([rect(x, 22, 7, 2.6, 1.3), fill(soft, 80)], transform(
          kVec([[delay, [0, 0]], [delay + 34, [-16, 0]], [delay + 35, [16, 0]], [90, [0, 0]]]),
          stat([0, 0]), stat([100, 100]), stat(0),
          { a: 1, k: [{ t: delay, s: [0] }, { t: delay + 6, s: [85] }, { t: delay + 30, s: [0] }, { t: 90, s: [0] }] }));
      }
      return scene([
        /* the parcel, riding */
        part([rect(28, 20, 26, 22, 3), fill(fg, 88)], transform(
          kVec([[0, [0, 0]], [22, [0, -3]], [45, [0, 0]], [67, [0, -3]], [90, [0, 0]]]))),
        part([rect(28, 12, 26, 6, 2), fill([1, 1, 1, 1], 40)], transform(
          kVec([[0, [0, 0]], [22, [0, -3]], [45, [0, 0]], [67, [0, -3]], [90, [0, 0]]]))),
        part([rect(28, 20, 3, 22, 1.2), fill([1, 1, 1, 1], 58)], transform(
          kVec([[0, [0, 0]], [22, [0, -3]], [45, [0, 0]], [67, [0, -3]], [90, [0, 0]]]))),
        /* the road coming at you */
        dash(8, 0), dash(8, 12), dash(8, 24),
        part([rect(28, 47, 46, 3, 1.5), fill(fg, 46)]),
      ]);
    },
  };

  /* hex -> 0..1 rgb, the only format Lottie paints with */
  function rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }

  global.SUKI_CAT_LOTTIE = {
    names: Object.keys(BUILDS),
    /* build('plumbing', {fg:'#0352AE', bg:'#E7EDFF'}) -> lottie.loadAnimation data */
    build: function (id, theme) {
      var f = BUILDS[id];
      if (!f) return null;
      return f({ fg: rgb(theme.fg), soft: rgb(theme.bg) });
    },
  };
})(typeof window !== 'undefined' ? window : this);
