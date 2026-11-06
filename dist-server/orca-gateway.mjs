var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/tweetnacl/nacl-fast.js
var require_nacl_fast = __commonJS({
  "node_modules/tweetnacl/nacl-fast.js"(exports, module) {
    (function(nacl2) {
      "use strict";
      var gf = function(init) {
        var i, r = new Float64Array(16);
        if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
        return r;
      };
      var randombytes = function() {
        throw new Error("no PRNG");
      };
      var _0 = new Uint8Array(16);
      var _9 = new Uint8Array(32);
      _9[0] = 9;
      var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
      function ts64(x, i, h, l) {
        x[i] = h >> 24 & 255;
        x[i + 1] = h >> 16 & 255;
        x[i + 2] = h >> 8 & 255;
        x[i + 3] = h & 255;
        x[i + 4] = l >> 24 & 255;
        x[i + 5] = l >> 16 & 255;
        x[i + 6] = l >> 8 & 255;
        x[i + 7] = l & 255;
      }
      function vn(x, xi, y, yi, n) {
        var i, d = 0;
        for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
        return (1 & d - 1 >>> 8) - 1;
      }
      function crypto_verify_16(x, xi, y, yi) {
        return vn(x, xi, y, yi, 16);
      }
      function crypto_verify_32(x, xi, y, yi) {
        return vn(x, xi, y, yi, 32);
      }
      function core_salsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        x0 = x0 + j0 | 0;
        x1 = x1 + j1 | 0;
        x2 = x2 + j2 | 0;
        x3 = x3 + j3 | 0;
        x4 = x4 + j4 | 0;
        x5 = x5 + j5 | 0;
        x6 = x6 + j6 | 0;
        x7 = x7 + j7 | 0;
        x8 = x8 + j8 | 0;
        x9 = x9 + j9 | 0;
        x10 = x10 + j10 | 0;
        x11 = x11 + j11 | 0;
        x12 = x12 + j12 | 0;
        x13 = x13 + j13 | 0;
        x14 = x14 + j14 | 0;
        x15 = x15 + j15 | 0;
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x1 >>> 0 & 255;
        o[5] = x1 >>> 8 & 255;
        o[6] = x1 >>> 16 & 255;
        o[7] = x1 >>> 24 & 255;
        o[8] = x2 >>> 0 & 255;
        o[9] = x2 >>> 8 & 255;
        o[10] = x2 >>> 16 & 255;
        o[11] = x2 >>> 24 & 255;
        o[12] = x3 >>> 0 & 255;
        o[13] = x3 >>> 8 & 255;
        o[14] = x3 >>> 16 & 255;
        o[15] = x3 >>> 24 & 255;
        o[16] = x4 >>> 0 & 255;
        o[17] = x4 >>> 8 & 255;
        o[18] = x4 >>> 16 & 255;
        o[19] = x4 >>> 24 & 255;
        o[20] = x5 >>> 0 & 255;
        o[21] = x5 >>> 8 & 255;
        o[22] = x5 >>> 16 & 255;
        o[23] = x5 >>> 24 & 255;
        o[24] = x6 >>> 0 & 255;
        o[25] = x6 >>> 8 & 255;
        o[26] = x6 >>> 16 & 255;
        o[27] = x6 >>> 24 & 255;
        o[28] = x7 >>> 0 & 255;
        o[29] = x7 >>> 8 & 255;
        o[30] = x7 >>> 16 & 255;
        o[31] = x7 >>> 24 & 255;
        o[32] = x8 >>> 0 & 255;
        o[33] = x8 >>> 8 & 255;
        o[34] = x8 >>> 16 & 255;
        o[35] = x8 >>> 24 & 255;
        o[36] = x9 >>> 0 & 255;
        o[37] = x9 >>> 8 & 255;
        o[38] = x9 >>> 16 & 255;
        o[39] = x9 >>> 24 & 255;
        o[40] = x10 >>> 0 & 255;
        o[41] = x10 >>> 8 & 255;
        o[42] = x10 >>> 16 & 255;
        o[43] = x10 >>> 24 & 255;
        o[44] = x11 >>> 0 & 255;
        o[45] = x11 >>> 8 & 255;
        o[46] = x11 >>> 16 & 255;
        o[47] = x11 >>> 24 & 255;
        o[48] = x12 >>> 0 & 255;
        o[49] = x12 >>> 8 & 255;
        o[50] = x12 >>> 16 & 255;
        o[51] = x12 >>> 24 & 255;
        o[52] = x13 >>> 0 & 255;
        o[53] = x13 >>> 8 & 255;
        o[54] = x13 >>> 16 & 255;
        o[55] = x13 >>> 24 & 255;
        o[56] = x14 >>> 0 & 255;
        o[57] = x14 >>> 8 & 255;
        o[58] = x14 >>> 16 & 255;
        o[59] = x14 >>> 24 & 255;
        o[60] = x15 >>> 0 & 255;
        o[61] = x15 >>> 8 & 255;
        o[62] = x15 >>> 16 & 255;
        o[63] = x15 >>> 24 & 255;
      }
      function core_hsalsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x5 >>> 0 & 255;
        o[5] = x5 >>> 8 & 255;
        o[6] = x5 >>> 16 & 255;
        o[7] = x5 >>> 24 & 255;
        o[8] = x10 >>> 0 & 255;
        o[9] = x10 >>> 8 & 255;
        o[10] = x10 >>> 16 & 255;
        o[11] = x10 >>> 24 & 255;
        o[12] = x15 >>> 0 & 255;
        o[13] = x15 >>> 8 & 255;
        o[14] = x15 >>> 16 & 255;
        o[15] = x15 >>> 24 & 255;
        o[16] = x6 >>> 0 & 255;
        o[17] = x6 >>> 8 & 255;
        o[18] = x6 >>> 16 & 255;
        o[19] = x6 >>> 24 & 255;
        o[20] = x7 >>> 0 & 255;
        o[21] = x7 >>> 8 & 255;
        o[22] = x7 >>> 16 & 255;
        o[23] = x7 >>> 24 & 255;
        o[24] = x8 >>> 0 & 255;
        o[25] = x8 >>> 8 & 255;
        o[26] = x8 >>> 16 & 255;
        o[27] = x8 >>> 24 & 255;
        o[28] = x9 >>> 0 & 255;
        o[29] = x9 >>> 8 & 255;
        o[30] = x9 >>> 16 & 255;
        o[31] = x9 >>> 24 & 255;
      }
      function crypto_core_salsa20(out, inp, k, c) {
        core_salsa20(out, inp, k, c);
      }
      function crypto_core_hsalsa20(out, inp, k, c) {
        core_hsalsa20(out, inp, k, c);
      }
      var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
      function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
          mpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
        }
        return 0;
      }
      function crypto_stream_salsa20(c, cpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = x[i];
        }
        return 0;
      }
      function crypto_stream(c, cpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20(c, cpos, d, sn, s);
      }
      function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
      }
      var poly1305 = function(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = key[0] & 255 | (key[1] & 255) << 8;
        this.r[0] = t0 & 8191;
        t1 = key[2] & 255 | (key[3] & 255) << 8;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        t2 = key[4] & 255 | (key[5] & 255) << 8;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        t3 = key[6] & 255 | (key[7] & 255) << 8;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        t4 = key[8] & 255 | (key[9] & 255) << 8;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        t5 = key[10] & 255 | (key[11] & 255) << 8;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        t6 = key[12] & 255 | (key[13] & 255) << 8;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        t7 = key[14] & 255 | (key[15] & 255) << 8;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
        this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
        this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
        this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
        this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
        this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
        this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
        this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
      };
      poly1305.prototype.blocks = function(m, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c;
        var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
          t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
          h0 += t0 & 8191;
          t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
          h1 += (t0 >>> 13 | t1 << 3) & 8191;
          t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
          h2 += (t1 >>> 10 | t2 << 6) & 8191;
          t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
          h3 += (t2 >>> 7 | t3 << 9) & 8191;
          t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
          h4 += (t3 >>> 4 | t4 << 12) & 8191;
          h5 += t4 >>> 1 & 8191;
          t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
          h6 += (t4 >>> 14 | t5 << 2) & 8191;
          t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
          h7 += (t5 >>> 11 | t6 << 5) & 8191;
          t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
          h8 += (t6 >>> 8 | t7 << 8) & 8191;
          h9 += t7 >>> 5 | hibit;
          c = 0;
          d0 = c;
          d0 += h0 * r0;
          d0 += h1 * (5 * r9);
          d0 += h2 * (5 * r8);
          d0 += h3 * (5 * r7);
          d0 += h4 * (5 * r6);
          c = d0 >>> 13;
          d0 &= 8191;
          d0 += h5 * (5 * r5);
          d0 += h6 * (5 * r4);
          d0 += h7 * (5 * r3);
          d0 += h8 * (5 * r2);
          d0 += h9 * (5 * r1);
          c += d0 >>> 13;
          d0 &= 8191;
          d1 = c;
          d1 += h0 * r1;
          d1 += h1 * r0;
          d1 += h2 * (5 * r9);
          d1 += h3 * (5 * r8);
          d1 += h4 * (5 * r7);
          c = d1 >>> 13;
          d1 &= 8191;
          d1 += h5 * (5 * r6);
          d1 += h6 * (5 * r5);
          d1 += h7 * (5 * r4);
          d1 += h8 * (5 * r3);
          d1 += h9 * (5 * r2);
          c += d1 >>> 13;
          d1 &= 8191;
          d2 = c;
          d2 += h0 * r2;
          d2 += h1 * r1;
          d2 += h2 * r0;
          d2 += h3 * (5 * r9);
          d2 += h4 * (5 * r8);
          c = d2 >>> 13;
          d2 &= 8191;
          d2 += h5 * (5 * r7);
          d2 += h6 * (5 * r6);
          d2 += h7 * (5 * r5);
          d2 += h8 * (5 * r4);
          d2 += h9 * (5 * r3);
          c += d2 >>> 13;
          d2 &= 8191;
          d3 = c;
          d3 += h0 * r3;
          d3 += h1 * r2;
          d3 += h2 * r1;
          d3 += h3 * r0;
          d3 += h4 * (5 * r9);
          c = d3 >>> 13;
          d3 &= 8191;
          d3 += h5 * (5 * r8);
          d3 += h6 * (5 * r7);
          d3 += h7 * (5 * r6);
          d3 += h8 * (5 * r5);
          d3 += h9 * (5 * r4);
          c += d3 >>> 13;
          d3 &= 8191;
          d4 = c;
          d4 += h0 * r4;
          d4 += h1 * r3;
          d4 += h2 * r2;
          d4 += h3 * r1;
          d4 += h4 * r0;
          c = d4 >>> 13;
          d4 &= 8191;
          d4 += h5 * (5 * r9);
          d4 += h6 * (5 * r8);
          d4 += h7 * (5 * r7);
          d4 += h8 * (5 * r6);
          d4 += h9 * (5 * r5);
          c += d4 >>> 13;
          d4 &= 8191;
          d5 = c;
          d5 += h0 * r5;
          d5 += h1 * r4;
          d5 += h2 * r3;
          d5 += h3 * r2;
          d5 += h4 * r1;
          c = d5 >>> 13;
          d5 &= 8191;
          d5 += h5 * r0;
          d5 += h6 * (5 * r9);
          d5 += h7 * (5 * r8);
          d5 += h8 * (5 * r7);
          d5 += h9 * (5 * r6);
          c += d5 >>> 13;
          d5 &= 8191;
          d6 = c;
          d6 += h0 * r6;
          d6 += h1 * r5;
          d6 += h2 * r4;
          d6 += h3 * r3;
          d6 += h4 * r2;
          c = d6 >>> 13;
          d6 &= 8191;
          d6 += h5 * r1;
          d6 += h6 * r0;
          d6 += h7 * (5 * r9);
          d6 += h8 * (5 * r8);
          d6 += h9 * (5 * r7);
          c += d6 >>> 13;
          d6 &= 8191;
          d7 = c;
          d7 += h0 * r7;
          d7 += h1 * r6;
          d7 += h2 * r5;
          d7 += h3 * r4;
          d7 += h4 * r3;
          c = d7 >>> 13;
          d7 &= 8191;
          d7 += h5 * r2;
          d7 += h6 * r1;
          d7 += h7 * r0;
          d7 += h8 * (5 * r9);
          d7 += h9 * (5 * r8);
          c += d7 >>> 13;
          d7 &= 8191;
          d8 = c;
          d8 += h0 * r8;
          d8 += h1 * r7;
          d8 += h2 * r6;
          d8 += h3 * r5;
          d8 += h4 * r4;
          c = d8 >>> 13;
          d8 &= 8191;
          d8 += h5 * r3;
          d8 += h6 * r2;
          d8 += h7 * r1;
          d8 += h8 * r0;
          d8 += h9 * (5 * r9);
          c += d8 >>> 13;
          d8 &= 8191;
          d9 = c;
          d9 += h0 * r9;
          d9 += h1 * r8;
          d9 += h2 * r7;
          d9 += h3 * r6;
          d9 += h4 * r5;
          c = d9 >>> 13;
          d9 &= 8191;
          d9 += h5 * r4;
          d9 += h6 * r3;
          d9 += h7 * r2;
          d9 += h8 * r1;
          d9 += h9 * r0;
          c += d9 >>> 13;
          d9 &= 8191;
          c = (c << 2) + c | 0;
          c = c + d0 | 0;
          d0 = c & 8191;
          c = c >>> 13;
          d1 += c;
          h0 = d0;
          h1 = d1;
          h2 = d2;
          h3 = d3;
          h4 = d4;
          h5 = d5;
          h6 = d6;
          h7 = d7;
          h8 = d8;
          h9 = d9;
          mpos += 16;
          bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h2;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
      };
      poly1305.prototype.finish = function(mac, macpos) {
        var g = new Uint16Array(10);
        var c, mask, f, i;
        if (this.leftover) {
          i = this.leftover;
          this.buffer[i++] = 1;
          for (; i < 16; i++) this.buffer[i] = 0;
          this.fin = 1;
          this.blocks(this.buffer, 0, 16);
        }
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        for (i = 2; i < 10; i++) {
          this.h[i] += c;
          c = this.h[i] >>> 13;
          this.h[i] &= 8191;
        }
        this.h[0] += c * 5;
        c = this.h[0] >>> 13;
        this.h[0] &= 8191;
        this.h[1] += c;
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        this.h[2] += c;
        g[0] = this.h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 8191;
        for (i = 1; i < 10; i++) {
          g[i] = this.h[i] + c;
          c = g[i] >>> 13;
          g[i] &= 8191;
        }
        g[9] -= 1 << 13;
        mask = (c ^ 1) - 1;
        for (i = 0; i < 10; i++) g[i] &= mask;
        mask = ~mask;
        for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
        this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
        this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
        this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
        this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
        this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
        this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
        this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
        this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 65535;
        for (i = 1; i < 8; i++) {
          f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
          this.h[i] = f & 65535;
        }
        mac[macpos + 0] = this.h[0] >>> 0 & 255;
        mac[macpos + 1] = this.h[0] >>> 8 & 255;
        mac[macpos + 2] = this.h[1] >>> 0 & 255;
        mac[macpos + 3] = this.h[1] >>> 8 & 255;
        mac[macpos + 4] = this.h[2] >>> 0 & 255;
        mac[macpos + 5] = this.h[2] >>> 8 & 255;
        mac[macpos + 6] = this.h[3] >>> 0 & 255;
        mac[macpos + 7] = this.h[3] >>> 8 & 255;
        mac[macpos + 8] = this.h[4] >>> 0 & 255;
        mac[macpos + 9] = this.h[4] >>> 8 & 255;
        mac[macpos + 10] = this.h[5] >>> 0 & 255;
        mac[macpos + 11] = this.h[5] >>> 8 & 255;
        mac[macpos + 12] = this.h[6] >>> 0 & 255;
        mac[macpos + 13] = this.h[6] >>> 8 & 255;
        mac[macpos + 14] = this.h[7] >>> 0 & 255;
        mac[macpos + 15] = this.h[7] >>> 8 & 255;
      };
      poly1305.prototype.update = function(m, mpos, bytes) {
        var i, want;
        if (this.leftover) {
          want = 16 - this.leftover;
          if (want > bytes)
            want = bytes;
          for (i = 0; i < want; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          bytes -= want;
          mpos += want;
          this.leftover += want;
          if (this.leftover < 16)
            return;
          this.blocks(this.buffer, 0, 16);
          this.leftover = 0;
        }
        if (bytes >= 16) {
          want = bytes - bytes % 16;
          this.blocks(m, mpos, want);
          mpos += want;
          bytes -= want;
        }
        if (bytes) {
          for (i = 0; i < bytes; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          this.leftover += bytes;
        }
      };
      function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
        var s = new poly1305(k);
        s.update(m, mpos, n);
        s.finish(out, outpos);
        return 0;
      }
      function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
        var x = new Uint8Array(16);
        crypto_onetimeauth(x, 0, m, mpos, n, k);
        return crypto_verify_16(h, hpos, x, 0);
      }
      function crypto_secretbox(c, m, d, n, k) {
        var i;
        if (d < 32) return -1;
        crypto_stream_xor(c, 0, m, 0, d, n, k);
        crypto_onetimeauth(c, 16, c, 32, d - 32, c);
        for (i = 0; i < 16; i++) c[i] = 0;
        return 0;
      }
      function crypto_secretbox_open(m, c, d, n, k) {
        var i;
        var x = new Uint8Array(32);
        if (d < 32) return -1;
        crypto_stream(x, 0, 32, n, k);
        if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
        crypto_stream_xor(m, 0, c, 0, d, n, k);
        for (i = 0; i < 32; i++) m[i] = 0;
        return 0;
      }
      function set25519(r, a) {
        var i;
        for (i = 0; i < 16; i++) r[i] = a[i] | 0;
      }
      function car25519(o) {
        var i, v, c = 1;
        for (i = 0; i < 16; i++) {
          v = o[i] + c + 65535;
          c = Math.floor(v / 65536);
          o[i] = v - c * 65536;
        }
        o[0] += c - 1 + 37 * (c - 1);
      }
      function sel25519(p, q, b) {
        var t, c = ~(b - 1);
        for (var i = 0; i < 16; i++) {
          t = c & (p[i] ^ q[i]);
          p[i] ^= t;
          q[i] ^= t;
        }
      }
      function pack25519(o, n) {
        var i, j, b;
        var m = gf(), t = gf();
        for (i = 0; i < 16; i++) t[i] = n[i];
        car25519(t);
        car25519(t);
        car25519(t);
        for (j = 0; j < 2; j++) {
          m[0] = t[0] - 65517;
          for (i = 1; i < 15; i++) {
            m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
            m[i - 1] &= 65535;
          }
          m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
          b = m[15] >> 16 & 1;
          m[14] &= 65535;
          sel25519(t, m, 1 - b);
        }
        for (i = 0; i < 16; i++) {
          o[2 * i] = t[i] & 255;
          o[2 * i + 1] = t[i] >> 8;
        }
      }
      function neq25519(a, b) {
        var c = new Uint8Array(32), d = new Uint8Array(32);
        pack25519(c, a);
        pack25519(d, b);
        return crypto_verify_32(c, 0, d, 0);
      }
      function par25519(a) {
        var d = new Uint8Array(32);
        pack25519(d, a);
        return d[0] & 1;
      }
      function unpack25519(o, n) {
        var i;
        for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
        o[15] &= 32767;
      }
      function A(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
      }
      function Z(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
      }
      function M(o, a, b) {
        var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
        v = a[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b2;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b2;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b2;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b2;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b2;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b2;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b2;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b2;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b2;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b2;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b2;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b2;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b2;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b2;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b2;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b2;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
      }
      function S(o, a) {
        M(o, a, a);
      }
      function inv25519(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 253; a >= 0; a--) {
          S(c, c);
          if (a !== 2 && a !== 4) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function pow2523(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 250; a >= 0; a--) {
          S(c, c);
          if (a !== 1) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function crypto_scalarmult(q, n, p) {
        var z = new Uint8Array(32);
        var x = new Float64Array(80), r, i;
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
        for (i = 0; i < 31; i++) z[i] = n[i];
        z[31] = n[31] & 127 | 64;
        z[0] &= 248;
        unpack25519(x, p);
        for (i = 0; i < 16; i++) {
          b[i] = x[i];
          d[i] = a[i] = c[i] = 0;
        }
        a[0] = d[0] = 1;
        for (i = 254; i >= 0; --i) {
          r = z[i >>> 3] >>> (i & 7) & 1;
          sel25519(a, b, r);
          sel25519(c, d, r);
          A(e, a, c);
          Z(a, a, c);
          A(c, b, d);
          Z(b, b, d);
          S(d, e);
          S(f, a);
          M(a, c, a);
          M(c, b, e);
          A(e, a, c);
          Z(a, a, c);
          S(b, a);
          Z(c, d, f);
          M(a, c, _121665);
          A(a, a, d);
          M(c, c, a);
          M(a, d, f);
          M(d, b, x);
          S(b, e);
          sel25519(a, b, r);
          sel25519(c, d, r);
        }
        for (i = 0; i < 16; i++) {
          x[i + 16] = a[i];
          x[i + 32] = c[i];
          x[i + 48] = b[i];
          x[i + 64] = d[i];
        }
        var x32 = x.subarray(32);
        var x16 = x.subarray(16);
        inv25519(x32, x32);
        M(x16, x16, x32);
        pack25519(q, x16);
        return 0;
      }
      function crypto_scalarmult_base(q, n) {
        return crypto_scalarmult(q, n, _9);
      }
      function crypto_box_keypair(y, x) {
        randombytes(x, 32);
        return crypto_scalarmult_base(y, x);
      }
      function crypto_box_beforenm(k, y, x) {
        var s = new Uint8Array(32);
        crypto_scalarmult(s, x, y);
        return crypto_core_hsalsa20(k, _0, s, sigma);
      }
      var crypto_box_afternm = crypto_secretbox;
      var crypto_box_open_afternm = crypto_secretbox_open;
      function crypto_box(c, m, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_afternm(c, m, d, n, k);
      }
      function crypto_box_open(m, c, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_open_afternm(m, c, d, n, k);
      }
      var K = [
        1116352408,
        3609767458,
        1899447441,
        602891725,
        3049323471,
        3964484399,
        3921009573,
        2173295548,
        961987163,
        4081628472,
        1508970993,
        3053834265,
        2453635748,
        2937671579,
        2870763221,
        3664609560,
        3624381080,
        2734883394,
        310598401,
        1164996542,
        607225278,
        1323610764,
        1426881987,
        3590304994,
        1925078388,
        4068182383,
        2162078206,
        991336113,
        2614888103,
        633803317,
        3248222580,
        3479774868,
        3835390401,
        2666613458,
        4022224774,
        944711139,
        264347078,
        2341262773,
        604807628,
        2007800933,
        770255983,
        1495990901,
        1249150122,
        1856431235,
        1555081692,
        3175218132,
        1996064986,
        2198950837,
        2554220882,
        3999719339,
        2821834349,
        766784016,
        2952996808,
        2566594879,
        3210313671,
        3203337956,
        3336571891,
        1034457026,
        3584528711,
        2466948901,
        113926993,
        3758326383,
        338241895,
        168717936,
        666307205,
        1188179964,
        773529912,
        1546045734,
        1294757372,
        1522805485,
        1396182291,
        2643833823,
        1695183700,
        2343527390,
        1986661051,
        1014477480,
        2177026350,
        1206759142,
        2456956037,
        344077627,
        2730485921,
        1290863460,
        2820302411,
        3158454273,
        3259730800,
        3505952657,
        3345764771,
        106217008,
        3516065817,
        3606008344,
        3600352804,
        1432725776,
        4094571909,
        1467031594,
        275423344,
        851169720,
        430227734,
        3100823752,
        506948616,
        1363258195,
        659060556,
        3750685593,
        883997877,
        3785050280,
        958139571,
        3318307427,
        1322822218,
        3812723403,
        1537002063,
        2003034995,
        1747873779,
        3602036899,
        1955562222,
        1575990012,
        2024104815,
        1125592928,
        2227730452,
        2716904306,
        2361852424,
        442776044,
        2428436474,
        593698344,
        2756734187,
        3733110249,
        3204031479,
        2999351573,
        3329325298,
        3815920427,
        3391569614,
        3928383900,
        3515267271,
        566280711,
        3940187606,
        3454069534,
        4118630271,
        4000239992,
        116418474,
        1914138554,
        174292421,
        2731055270,
        289380356,
        3203993006,
        460393269,
        320620315,
        685471733,
        587496836,
        852142971,
        1086792851,
        1017036298,
        365543100,
        1126000580,
        2618297676,
        1288033470,
        3409855158,
        1501505948,
        4234509866,
        1607167915,
        987167468,
        1816402316,
        1246189591
      ];
      function crypto_hashblocks_hl(hh, hl, m, n) {
        var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
        var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        var pos = 0;
        while (n >= 128) {
          for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
            wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
          }
          for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            h = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
            l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah4 & ah5 ^ ~ah4 & ah6;
            l = al4 & al5 ^ ~al4 & al6;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = c & 65535 | d << 16;
            tl = a & 65535 | b << 16;
            h = th;
            l = tl;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
            l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
            l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = c & 65535 | d << 16;
            bl7 = a & 65535 | b << 16;
            h = bh3;
            l = bl3;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = c & 65535 | d << 16;
            bl3 = a & 65535 | b << 16;
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
              for (j = 0; j < 16; j++) {
                h = wh[j];
                l = wl[j];
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = wh[(j + 9) % 16];
                l = wl[(j + 9) % 16];
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 1) % 16];
                tl = wl[(j + 1) % 16];
                h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 14) % 16];
                tl = wl[(j + 14) % 16];
                h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                wh[j] = c & 65535 | d << 16;
                wl[j] = a & 65535 | b << 16;
              }
            }
          }
          h = ah0;
          l = al0;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[0];
          l = hl[0];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[0] = ah0 = c & 65535 | d << 16;
          hl[0] = al0 = a & 65535 | b << 16;
          h = ah1;
          l = al1;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[1];
          l = hl[1];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[1] = ah1 = c & 65535 | d << 16;
          hl[1] = al1 = a & 65535 | b << 16;
          h = ah2;
          l = al2;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[2];
          l = hl[2];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[2] = ah2 = c & 65535 | d << 16;
          hl[2] = al2 = a & 65535 | b << 16;
          h = ah3;
          l = al3;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[3];
          l = hl[3];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[3] = ah3 = c & 65535 | d << 16;
          hl[3] = al3 = a & 65535 | b << 16;
          h = ah4;
          l = al4;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[4];
          l = hl[4];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[4] = ah4 = c & 65535 | d << 16;
          hl[4] = al4 = a & 65535 | b << 16;
          h = ah5;
          l = al5;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[5];
          l = hl[5];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[5] = ah5 = c & 65535 | d << 16;
          hl[5] = al5 = a & 65535 | b << 16;
          h = ah6;
          l = al6;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[6];
          l = hl[6];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[6] = ah6 = c & 65535 | d << 16;
          hl[6] = al6 = a & 65535 | b << 16;
          h = ah7;
          l = al7;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[7];
          l = hl[7];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[7] = ah7 = c & 65535 | d << 16;
          hl[7] = al7 = a & 65535 | b << 16;
          pos += 128;
          n -= 128;
        }
        return n;
      }
      function crypto_hash(out, m, n) {
        var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
        hh[0] = 1779033703;
        hh[1] = 3144134277;
        hh[2] = 1013904242;
        hh[3] = 2773480762;
        hh[4] = 1359893119;
        hh[5] = 2600822924;
        hh[6] = 528734635;
        hh[7] = 1541459225;
        hl[0] = 4089235720;
        hl[1] = 2227873595;
        hl[2] = 4271175723;
        hl[3] = 1595750129;
        hl[4] = 2917565137;
        hl[5] = 725511199;
        hl[6] = 4215389547;
        hl[7] = 327033209;
        crypto_hashblocks_hl(hh, hl, m, n);
        n %= 128;
        for (i = 0; i < n; i++) x[i] = m[b - n + i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, b / 536870912 | 0, b << 3);
        crypto_hashblocks_hl(hh, hl, x, n);
        for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
        return 0;
      }
      function add(p, q) {
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
        Z(a, p[1], p[0]);
        Z(t, q[1], q[0]);
        M(a, a, t);
        A(b, p[0], p[1]);
        A(t, q[0], q[1]);
        M(b, b, t);
        M(c, p[3], q[3]);
        M(c, c, D2);
        M(d, p[2], q[2]);
        A(d, d, d);
        Z(e, b, a);
        Z(f, d, c);
        A(g, d, c);
        A(h, b, a);
        M(p[0], e, f);
        M(p[1], h, g);
        M(p[2], g, f);
        M(p[3], e, h);
      }
      function cswap(p, q, b) {
        var i;
        for (i = 0; i < 4; i++) {
          sel25519(p[i], q[i], b);
        }
      }
      function pack(r, p) {
        var tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M(tx, p[0], zi);
        M(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
      }
      function scalarmult(p, q, s) {
        var b, i;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i = 255; i >= 0; --i) {
          b = s[i / 8 | 0] >> (i & 7) & 1;
          cswap(p, q, b);
          add(q, p);
          add(p, p);
          cswap(p, q, b);
        }
      }
      function scalarbase(p, s) {
        var q = [gf(), gf(), gf(), gf()];
        set25519(q[0], X);
        set25519(q[1], Y);
        set25519(q[2], gf1);
        M(q[3], X, Y);
        scalarmult(p, q, s);
      }
      function crypto_sign_keypair(pk, sk, seeded) {
        var d = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()];
        var i;
        if (!seeded) randombytes(sk, 32);
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        scalarbase(p, d);
        pack(pk, p);
        for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
        return 0;
      }
      var L = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
      function modL(r, x) {
        var carry, i, j, k;
        for (i = 63; i >= 32; --i) {
          carry = 0;
          for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
          }
          x[j] += carry;
          x[i] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
          x[j] += carry - (x[31] >> 4) * L[j];
          carry = x[j] >> 8;
          x[j] &= 255;
        }
        for (j = 0; j < 32; j++) x[j] -= carry * L[j];
        for (i = 0; i < 32; i++) {
          x[i + 1] += x[i] >> 8;
          r[i] = x[i] & 255;
        }
      }
      function reduce(r) {
        var x = new Float64Array(64), i;
        for (i = 0; i < 64; i++) x[i] = r[i];
        for (i = 0; i < 64; i++) r[i] = 0;
        modL(r, x);
      }
      function crypto_sign(sm, m, n, sk) {
        var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
        var i, j, x = new Float64Array(64);
        var p = [gf(), gf(), gf(), gf()];
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        var smlen = n + 64;
        for (i = 0; i < n; i++) sm[64 + i] = m[i];
        for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
        crypto_hash(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i = 32; i < 64; i++) sm[i] = sk[i];
        crypto_hash(h, sm, n + 64);
        reduce(h);
        for (i = 0; i < 64; i++) x[i] = 0;
        for (i = 0; i < 32; i++) x[i] = r[i];
        for (i = 0; i < 32; i++) {
          for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
          }
        }
        modL(sm.subarray(32), x);
        return smlen;
      }
      function unpackneg(r, p) {
        var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S(num, r[1]);
        M(den, num, D);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S(den2, den);
        S(den4, den2);
        M(den6, den4, den2);
        M(t, den6, num);
        M(t, t, den);
        pow2523(t, t);
        M(t, t, num);
        M(t, t, den);
        M(t, t, den);
        M(r[0], t, den);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) M(r[0], r[0], I);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) return -1;
        if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
        M(r[3], r[0], r[1]);
        return 0;
      }
      function crypto_sign_open(m, sm, n, pk) {
        var i;
        var t = new Uint8Array(32), h = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
        if (n < 64) return -1;
        if (unpackneg(q, pk)) return -1;
        for (i = 0; i < n; i++) m[i] = sm[i];
        for (i = 0; i < 32; i++) m[i + 32] = pk[i];
        crypto_hash(h, m, n);
        reduce(h);
        scalarmult(p, q, h);
        scalarbase(q, sm.subarray(32));
        add(p, q);
        pack(t, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t, 0)) {
          for (i = 0; i < n; i++) m[i] = 0;
          return -1;
        }
        for (i = 0; i < n; i++) m[i] = sm[i + 64];
        return n;
      }
      var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
      nacl2.lowlevel = {
        crypto_core_hsalsa20,
        crypto_stream_xor,
        crypto_stream,
        crypto_stream_salsa20_xor,
        crypto_stream_salsa20,
        crypto_onetimeauth,
        crypto_onetimeauth_verify,
        crypto_verify_16,
        crypto_verify_32,
        crypto_secretbox,
        crypto_secretbox_open,
        crypto_scalarmult,
        crypto_scalarmult_base,
        crypto_box_beforenm,
        crypto_box_afternm,
        crypto_box,
        crypto_box_open,
        crypto_box_keypair,
        crypto_hash,
        crypto_sign,
        crypto_sign_keypair,
        crypto_sign_open,
        crypto_secretbox_KEYBYTES,
        crypto_secretbox_NONCEBYTES,
        crypto_secretbox_ZEROBYTES,
        crypto_secretbox_BOXZEROBYTES,
        crypto_scalarmult_BYTES,
        crypto_scalarmult_SCALARBYTES,
        crypto_box_PUBLICKEYBYTES,
        crypto_box_SECRETKEYBYTES,
        crypto_box_BEFORENMBYTES,
        crypto_box_NONCEBYTES,
        crypto_box_ZEROBYTES,
        crypto_box_BOXZEROBYTES,
        crypto_sign_BYTES,
        crypto_sign_PUBLICKEYBYTES,
        crypto_sign_SECRETKEYBYTES,
        crypto_sign_SEEDBYTES,
        crypto_hash_BYTES,
        gf,
        D,
        L,
        pack25519,
        unpack25519,
        M,
        A,
        S,
        Z,
        pow2523,
        add,
        set25519,
        modL,
        scalarmult,
        scalarbase
      };
      function checkLengths(k, n) {
        if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
        if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
      }
      function checkBoxLengths(pk, sk) {
        if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
        if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
      }
      function checkArrayTypes() {
        for (var i = 0; i < arguments.length; i++) {
          if (!(arguments[i] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
        }
      }
      function cleanup(arr) {
        for (var i = 0; i < arr.length; i++) arr[i] = 0;
      }
      nacl2.randomBytes = function(n) {
        var b = new Uint8Array(n);
        randombytes(b, n);
        return b;
      };
      nacl2.secretbox = function(msg, nonce, key) {
        checkArrayTypes(msg, nonce, key);
        checkLengths(key, nonce);
        var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
        var c = new Uint8Array(m.length);
        for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
        crypto_secretbox(c, m, m.length, nonce, key);
        return c.subarray(crypto_secretbox_BOXZEROBYTES);
      };
      nacl2.secretbox.open = function(box, nonce, key) {
        checkArrayTypes(box, nonce, key);
        checkLengths(key, nonce);
        var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
        var m = new Uint8Array(c.length);
        for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
        if (c.length < 32) return null;
        if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
        return m.subarray(crypto_secretbox_ZEROBYTES);
      };
      nacl2.secretbox.keyLength = crypto_secretbox_KEYBYTES;
      nacl2.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
      nacl2.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
      nacl2.scalarMult = function(n, p) {
        checkArrayTypes(n, p);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult(q, n, p);
        return q;
      };
      nacl2.scalarMult.base = function(n) {
        checkArrayTypes(n);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult_base(q, n);
        return q;
      };
      nacl2.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
      nacl2.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
      nacl2.box = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox(msg, nonce, k);
      };
      nacl2.box.before = function(publicKey, secretKey) {
        checkArrayTypes(publicKey, secretKey);
        checkBoxLengths(publicKey, secretKey);
        var k = new Uint8Array(crypto_box_BEFORENMBYTES);
        crypto_box_beforenm(k, publicKey, secretKey);
        return k;
      };
      nacl2.box.after = nacl2.secretbox;
      nacl2.box.open = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox.open(msg, nonce, k);
      };
      nacl2.box.open.after = nacl2.secretbox.open;
      nacl2.box.keyPair = function() {
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
        crypto_box_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.box.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_box_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        crypto_scalarmult_base(pk, secretKey);
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
      nacl2.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
      nacl2.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
      nacl2.box.nonceLength = crypto_box_NONCEBYTES;
      nacl2.box.overheadLength = nacl2.secretbox.overheadLength;
      nacl2.sign = function(msg, secretKey) {
        checkArrayTypes(msg, secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        return signedMsg;
      };
      nacl2.sign.open = function(signedMsg, publicKey) {
        checkArrayTypes(signedMsg, publicKey);
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var tmp = new Uint8Array(signedMsg.length);
        var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
        if (mlen < 0) return null;
        var m = new Uint8Array(mlen);
        for (var i = 0; i < m.length; i++) m[i] = tmp[i];
        return m;
      };
      nacl2.sign.detached = function(msg, secretKey) {
        var signedMsg = nacl2.sign(msg, secretKey);
        var sig = new Uint8Array(crypto_sign_BYTES);
        for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
        return sig;
      };
      nacl2.sign.detached.verify = function(msg, sig, publicKey) {
        checkArrayTypes(msg, sig, publicKey);
        if (sig.length !== crypto_sign_BYTES)
          throw new Error("bad signature size");
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        var m = new Uint8Array(crypto_sign_BYTES + msg.length);
        var i;
        for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
        for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
        return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
      };
      nacl2.sign.keyPair = function() {
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.sign.keyPair.fromSeed = function(seed) {
        checkArrayTypes(seed);
        if (seed.length !== crypto_sign_SEEDBYTES)
          throw new Error("bad seed size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (var i = 0; i < 32; i++) sk[i] = seed[i];
        crypto_sign_keypair(pk, sk, true);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
      nacl2.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
      nacl2.sign.seedLength = crypto_sign_SEEDBYTES;
      nacl2.sign.signatureLength = crypto_sign_BYTES;
      nacl2.hash = function(msg) {
        checkArrayTypes(msg);
        var h = new Uint8Array(crypto_hash_BYTES);
        crypto_hash(h, msg, msg.length);
        return h;
      };
      nacl2.hash.hashLength = crypto_hash_BYTES;
      nacl2.verify = function(x, y) {
        checkArrayTypes(x, y);
        if (x.length === 0 || y.length === 0) return false;
        if (x.length !== y.length) return false;
        return vn(x, 0, y, 0, x.length) === 0 ? true : false;
      };
      nacl2.setPRNG = function(fn) {
        randombytes = fn;
      };
      (function() {
        var crypto = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
        if (crypto && crypto.getRandomValues) {
          var QUOTA = 65536;
          nacl2.setPRNG(function(x, n) {
            var i, v = new Uint8Array(n);
            for (i = 0; i < n; i += QUOTA) {
              crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
            }
            for (i = 0; i < n; i++) x[i] = v[i];
            cleanup(v);
          });
        } else if (typeof __require !== "undefined") {
          crypto = __require("crypto");
          if (crypto && crypto.randomBytes) {
            nacl2.setPRNG(function(x, n) {
              var i, v = crypto.randomBytes(n);
              for (i = 0; i < n; i++) x[i] = v[i];
              cleanup(v);
            });
          }
        }
      })();
    })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
  }
});

// apps/gateway/src/config.ts
import { mkdirSync, readFileSync as readFileSync2, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";

// src/gateway/orca/local-pairing.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
function readLocalOrcaPairing(userDataPath = join(process.env.APPDATA ?? "", "orca")) {
  const runtime2 = readJson(join(userDataPath, "orca-runtime.json"));
  const devices = readJson(join(userDataPath, "orca-devices.json"));
  const keypair = readJson(join(userDataPath, "orca-e2ee-keypair.json"));
  const websocket = runtime2.transports?.find((transport) => transport.kind === "websocket");
  if (!websocket) {
    throw new Error("Desktop Orca is not listening on a WebSocket transport. Is it running?");
  }
  const mobile = devices.filter((device) => device.scope === "mobile").sort((left, right) => (right.lastSeenAt ?? 0) - (left.lastSeenAt ?? 0))[0];
  if (!mobile) {
    throw new Error("No mobile-scope paired device in orca-devices.json; pair a phone once first.");
  }
  return {
    // 0.0.0.0 is a bind address; loopback is where this machine reaches it.
    endpoint: websocket.endpoint.replace("://0.0.0.0:", "://127.0.0.1:"),
    deviceToken: mobile.token,
    hostPublicKeyB64: keypair.publicKeyB64,
    deviceId: mobile.deviceId,
    deviceName: mobile.name ?? mobile.deviceId
  };
}
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Could not read ${path}. Start desktop Orca and pair a device first.`);
  }
}

// apps/gateway/src/config.ts
function loadConfig(options) {
  const file = options.configPath ? readJson2(options.configPath) : {};
  return {
    serverUrl: requireOne(process.env.ORCA_WEB_SERVER_URL ?? file.serverUrl, "serverUrl"),
    gatewayKey: requireOne(process.env.ORCA_WEB_GATEWAY_KEY ?? file.gatewayKey, "gatewayKey"),
    gatewayId: process.env.ORCA_WEB_GATEWAY_ID ?? file.gatewayId ?? hostname(),
    adminPort: readNumber(process.env.ORCA_WEB_ADMIN_PORT) ?? readNumber(file.admin?.port) ?? 8790,
    configPath: options.configPath ?? null,
    orca: options.localOrca ? localOrcaOptions() : fileOrcaOptions(file),
    pairedVia: options.localOrca ? "local-orca" : "config"
  };
}
function describeConfigSource(config2) {
  if (config2.pairedVia === "local-orca") {
    return "\u672C\u8F6E\u4ECE\u684C\u9762 Orca \u7684\u672C\u5730\u914D\u5BF9\u6750\u6599\u8BFB\u53D6\uFF1B\u5199\u5165\u7684\u914D\u5BF9\u4FE1\u606F\u8981\u751F\u6548\uFF0C\u542F\u52A8\u547D\u4EE4\u9700\u53BB\u6389 --local-orca\u3002";
  }
  if (process.env.ORCA_WEB_SERVER_URL || process.env.ORCA_WEB_GATEWAY_KEY) {
    return "\u5F53\u524D\u8FDB\u7A0B\u5E26 ORCA_WEB_* \u73AF\u5883\u53D8\u91CF\uFF0C\u73AF\u5883\u53D8\u91CF\u4F18\u5148\u4E8E\u914D\u7F6E\u6587\u4EF6\uFF1B\u5EFA\u8BAE\u7528\u542F\u52A8\u811A\u672C\u7684 --config \u65B9\u5F0F\u8FD0\u884C\u3002";
  }
  return null;
}
function describeConfig(config2) {
  return [
    `server        ${config2.serverUrl}`,
    `gateway id    ${config2.gatewayId}`,
    `orca          ${config2.orca.endpoint}`
  ].join("\n");
}
function applyConfigUpdate(current, updates) {
  if (!current.configPath) {
    throw new ConfigError("gateway \u6CA1\u6709\u7528 --config \u542F\u52A8\uFF0C\u914D\u7F6E\u65E0\u5904\u843D\u76D8");
  }
  const file = readJson2(current.configPath);
  const next = {
    ...file,
    ...updates.serverUrl === void 0 ? {} : { serverUrl: updates.serverUrl },
    ...updates.gatewayKey === void 0 ? {} : { gatewayKey: updates.gatewayKey },
    ...updates.orca === void 0 ? {} : {
      orca: {
        ...file.orca,
        endpoint: updates.orca.endpoint,
        deviceToken: updates.orca.deviceToken,
        hostPublicKeyB64: updates.orca.hostPublicKeyB64
      }
    }
  };
  writeJson(current.configPath, next);
  return loadConfig({ configPath: current.configPath });
}
var ConfigError = class extends Error {
};
function fileOrcaOptions(file) {
  const endpoint = process.env.ORCA_WEB_ORCA_ENDPOINT ?? file.orca?.endpoint;
  const deviceToken = process.env.ORCA_WEB_ORCA_DEVICE_TOKEN ?? file.orca?.deviceToken;
  const hostPublicKeyB64 = process.env.ORCA_WEB_ORCA_HOST_KEY ?? file.orca?.hostPublicKeyB64;
  return {
    endpoint: requireOne(endpoint, "orca.endpoint"),
    deviceToken: requireOne(deviceToken, "orca.deviceToken"),
    hostPublicKeyB64: requireOne(hostPublicKeyB64, "orca.hostPublicKeyB64")
  };
}
function localOrcaOptions() {
  const path = process.env.ORCA_WEB_LOCAL_ORCA_DIR;
  const pairing = path ? readLocalOrcaPairing(path) : readLocalOrcaPairing();
  return {
    endpoint: pairing.endpoint,
    deviceToken: pairing.deviceToken,
    hostPublicKeyB64: pairing.hostPublicKeyB64
  };
}
function normalizeHubUrl(value) {
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ConfigError(`serverUrl \u65E0\u6CD5\u89E3\u6790: ${value}`);
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new ConfigError("serverUrl \u5FC5\u987B\u662F ws:// \u6216 wss:// \u5730\u5740");
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${path === "/gateway" ? path : `${path}/gateway`}`;
}
function decodePairingCode(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new ConfigError("\u914D\u5BF9\u7801\u4E3A\u7A7A");
  }
  const separator = /[?&]code=/.exec(trimmed);
  const prefix = !separator && trimmed.startsWith("code=") ? 5 : 0;
  const candidate = separator ? trimmed.slice(separator.index + separator[0].length) : trimmed.slice(prefix);
  const code = /^[A-Za-z0-9_-]+/.exec(candidate)?.[0];
  if (!code) {
    throw new ConfigError("\u914D\u5BF9\u7801\u91CC\u6CA1\u6709\u53EF\u89E3\u7801\u7684 base64 \u5185\u5BB9");
  }
  let offer;
  try {
    offer = JSON.parse(Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch (error) {
    throw new ConfigError(`\u914D\u5BF9\u7801\u65E0\u6CD5\u89E3\u7801: ${error.message}`);
  }
  if (typeof offer.deviceToken !== "string" || !offer.deviceToken) {
    throw new ConfigError("\u914D\u5BF9\u7801\u7F3A\u5C11 deviceToken");
  }
  if (typeof offer.publicKeyB64 !== "string" || !offer.publicKeyB64) {
    throw new ConfigError("\u914D\u5BF9\u7801\u7F3A\u5C11 publicKeyB64");
  }
  if (offer.scope !== void 0 && offer.scope !== "mobile") {
    throw new ConfigError(`\u914D\u5BF9\u7801 scope \u662F ${offer.scope}\uFF0C\u9700\u8981 mobile`);
  }
  return offer;
}
function loopbackEndpoint(endpoint) {
  try {
    const parsed = new URL(endpoint);
    return `ws://127.0.0.1:${parsed.port}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    throw new ConfigError(`\u914D\u5BF9\u7801 endpoint \u65E0\u6CD5\u89E3\u6790: ${endpoint}`);
  }
}
function readNumber(value) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : void 0;
}
function requireOne(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}: set it in ORCA_WEB_CONFIG or the environment`);
  }
  return value;
}
function readJson2(path) {
  try {
    return JSON.parse(readFileSync2(path, "utf8"));
  } catch (error) {
    throw new ConfigError(`Could not read config ${path}: ${error.message}`);
  }
}
function writeJson(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const temp = `${path}.tmp`;
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}
`, { mode: 384 });
    renameSync(temp, path);
  } catch (error) {
    throw new ConfigError(`Could not write config: ${error.message}`);
  }
}

// apps/gateway/src/local-admin-server.ts
import { createServer } from "node:http";
var BODY_LIMIT = 64 * 1024;
var LocalAdminServer = class {
  server = null;
  options;
  constructor(options) {
    this.options = options;
  }
  start() {
    if (this.server) {
      return;
    }
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        tryJson(response, 500, { ok: false, error: "internal error" });
      });
    });
    this.server.listen(this.options.port, "127.0.0.1", () => {
      console.log(`${(/* @__PURE__ */ new Date()).toISOString()} admin page at http://127.0.0.1:${this.options.port}`);
    });
    this.server.on("error", (error) => {
      console.error(`${(/* @__PURE__ */ new Date()).toISOString()} admin server error: ${error.message}`);
      setTimeout(() => process.exit(3), 500).unref();
    });
  }
  stop() {
    this.server?.close();
    this.server = null;
  }
  async handle(request, response) {
    const path = (request.url ?? "/").split("?")[0];
    if (request.method === "GET" && (path === "/" || path === "/index.html")) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      });
      response.end(ADMIN_PAGE_HTML);
      return;
    }
    if (request.method === "GET" && path === "/api/status") {
      tryJson(response, 200, { ok: true, status: this.options.status() });
      return;
    }
    if (request.method === "POST" && path === "/api/config") {
      await this.handleConfig(request, response);
      return;
    }
    tryJson(response, 404, { ok: false, error: "not found" });
  }
  async handleConfig(request, response) {
    const origin = request.headers.origin;
    const sameOrigin = origin === void 0 || origin === `http://127.0.0.1:${this.options.port}`;
    const fetchSite = request.headers["sec-fetch-site"];
    const isCrossSiteForm = fetchSite !== void 0 && fetchSite !== "same-origin" && fetchSite !== "none";
    if (!sameOrigin || isCrossSiteForm || request.headers["x-orca-web-admin"] !== "1") {
      tryJson(response, 403, { ok: false, error: "\u8DE8\u7AD9\u914D\u7F6E\u8BF7\u6C42\u88AB\u62D2\u7EDD" });
      return;
    }
    const body = await readBody(request);
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      tryJson(response, 400, { ok: false, error: "body \u4E0D\u662F\u5408\u6CD5 JSON" });
      return;
    }
    const updates = {};
    try {
      const serverUrl = asText(input.serverUrl);
      if (serverUrl) {
        updates.serverUrl = normalizeHubUrl(serverUrl.value);
      }
      const gatewayKey = asText(input.gatewayKey);
      if (gatewayKey?.value) {
        updates.gatewayKey = gatewayKey.value;
      }
      const pairingCode = asText(input.pairingCode);
      if (pairingCode?.value) {
        const offer = decodePairingCode(pairingCode.value);
        updates.orca = {
          endpoint: loopbackEndpoint(offer.endpoint),
          deviceToken: offer.deviceToken,
          hostPublicKeyB64: offer.publicKeyB64
        };
      }
    } catch (error) {
      const status = error instanceof ConfigError ? 400 : 500;
      tryJson(response, status, { ok: false, error: error.message });
      return;
    }
    if (!updates.serverUrl && !updates.gatewayKey && !updates.orca) {
      tryJson(response, 400, { ok: false, error: "\u6CA1\u6709\u586B\u5199\u4EFB\u4F55\u8981\u4FEE\u6539\u7684\u5185\u5BB9" });
      return;
    }
    try {
      const message = await this.options.apply(updates);
      tryJson(response, 200, { ok: true, message });
    } catch (error) {
      tryJson(response, 500, { ok: false, error: error.message });
    }
  }
};
function asText(value) {
  return typeof value === "string" ? { value } : null;
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(new Error("body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
function tryJson(response, status, payload) {
  if (response.headersSent) {
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
var ADMIN_PAGE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orca \u7F51\u5173\u7BA1\u7406</title>
<style>
  :root {
    --paper: #faf7f1; --ink: #1c1a17; --muted: #857c6e; --faint: #a89e8e;
    --rule: #e2dacd; --rule-strong: #cfc5b4; --green: #3f6b52; --red: #8f2f22; --accent: #a8492a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.6 -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  main { max-width: 660px; margin: 0 auto; padding: 40px 22px 60px; }
  .kicker { font: 500 10px/1 sans-serif; letter-spacing: 0.24em; text-transform: uppercase; color: var(--faint); }
  h1 { margin: 8px 0 6px; font: 400 30px/1.2 Georgia, 'Songti SC', serif; }
  .dek { margin: 0 0 26px; color: var(--muted); font-size: 13.5px; }
  .card { border: 1px solid var(--rule-strong); background: #fffdf9; padding: 16px 18px; margin-bottom: 18px; }
  .row { display: flex; align-items: baseline; gap: 9px; padding: 5px 0; font-size: 13.5px; flex-wrap: wrap; }
  .row .label { flex: none; width: 92px; color: var(--muted); }
  .row .value { min-width: 0; overflow-wrap: anywhere; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--faint); position: relative; top: -1px; }
  .dot.on { background: var(--green); }
  .dot.off { background: var(--red); }
  .dot.warn { background: #b07d24; }
  .field-label { margin: 0 0 6px; font: 500 10px/1 sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
  input, textarea { width: 100%; border: 0; border-bottom: 1px solid var(--rule-strong); background: none; padding: 8px 0; margin-bottom: 14px; outline: none; font: inherit; }
  input:focus, textarea:focus { border-bottom-color: var(--ink); }
  textarea { font: 12.5px/1.6 ui-monospace, Menlo, Consolas, monospace; resize: vertical; min-height: 84px; }
  button { background: var(--ink); color: var(--paper); border: 0; padding: 10px 18px; font: 500 11px/1 sans-serif; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
  button:disabled { opacity: 0.45; cursor: default; }
  .note { margin: 4px 0 0; font-size: 13px; color: var(--green); min-height: 1.4em; }
  .note.bad { color: var(--red); }
  .hint { margin: 26px 0 0; font-size: 12.5px; color: var(--faint); line-height: 1.75; }
  .hint b { color: var(--muted); font-weight: 500; }
</style>
</head>
<body>
<main>
  <div class="kicker">orca-web \xB7 local admin</div>
  <h1>\u7F51\u5173\u7BA1\u7406</h1>
  <p class="dek">\u8FD9\u53F0\u7535\u8111\u4E0A\u7684 gateway \u5982\u4F55\u8FDE hub\u3001\u5982\u4F55\u8FDE\u684C\u9762 Orca \u2014\u2014 \u90FD\u5728\u8FD9\u4E00\u9875\u6539\uFF0C\u4E0D\u9700\u8981\u518D\u52A8\u6587\u4EF6\u3002</p>

  <section class="card">
    <div class="row"><span class="label">hub</span><span id="hub-dot" class="dot"></span><span id="hub-value" class="value muted">\u8BFB\u72B6\u6001\u4E2D\u2026</span></div>
    <div class="row"><span class="label">orca</span><span id="orca-dot" class="dot"></span><span id="orca-value" class="value muted">\u8BFB\u72B6\u6001\u4E2D\u2026</span></div>
    <div class="row"><span class="label">\u7F51\u5173 id</span><span id="gateway-id" class="value muted"></span></div>
    <div class="row"><span class="label">\u914D\u7F6E\u6587\u4EF6</span><span id="config-path" class="value muted"></span></div>
    <div class="row" id="note-row" hidden><span class="label">\u63D0\u793A</span><span id="config-note" class="value" style="color:#b07d24"></span></div>
  </section>

  <section class="card">
    <p class="field-label">hub \u5730\u5740\u4E0E gateway key</p>
    <input id="server-url" placeholder="wss://\u4F60\u7684\u670D\u52A1\u5668/gateway" autocomplete="off" />
    <input id="gateway-key" type="password" placeholder="gateway key\uFF08\u5DF2\u4FDD\u5B58\u8FC7\uFF0C\u7559\u7A7A\u8868\u793A\u4E0D\u6539\uFF09" autocomplete="new-password" />
    <button id="save-hub">\u4FDD\u5B58\u5E76\u91CD\u8FDE</button>
    <p id="hub-note" class="note"></p>
  </section>

  <section class="card">
    <p class="field-label">\u684C\u9762 Orca \u914D\u5BF9\u7801</p>
    <textarea id="pairing-code" placeholder="orca://pair?code=\u2026\u2026\uFF08\u684C\u9762 Orca \u8BBE\u7F6E\u91CC\u751F\u6210\uFF0C\u76F4\u63A5\u6574\u6BB5\u7C98\u8D34\uFF09"></textarea>
    <button id="apply-pairing">\u5B8C\u6210\u914D\u5BF9</button>
    <p id="pair-note" class="note"></p>
  </section>

  <p class="hint">
    <b>\u6539\u5B8C hub \u5730\u5740 / key\uFF1A</b>\u7F51\u5173\u7ACB\u523B\u65AD\u5F00\u65E7\u8FDE\u63A5\u3001\u7528\u65B0\u914D\u7F6E\u62E8\u53F7\uFF0C\u72B6\u6001\u51E0\u79D2\u5185\u5237\u65B0\u3002<br />
    <b>\u6362\u914D\u5BF9\uFF1A</b>\u5728\u684C\u9762 Orca \u7684 \u8BBE\u7F6E \u2192 \u624B\u673A\u914D\u5BF9 \u751F\u6210\u7801\uFF0C\u7C98\u8D34\u5230\u8FD9\u91CC\u5373\u53EF\uFF1B\u7801\u5C31\u662F\u51ED\u636E\uFF0C\u4E0D\u8981\u53D1\u7ED9\u4E0D\u4FE1\u4EFB\u7684\u6E20\u9053\uFF0C\u7528\u5B8C\u53EF\u8BA9 Orca \u64A4\u9500\u65E7\u8BBE\u5907\u3002<br />
    <b>\u672C\u9875\u53EA\u7ED1 127.0.0.1\uFF1A</b>\u522B\u7684\u673A\u5668\u8FDE\u4E0D\u8FDB\u6765\uFF1B\u914D\u5BF9\u4FE1\u606F\u4E5F\u4E0D\u7ECF\u8FC7 VPS\u3002
  </p>
</main>
<script>
  function setText(id, text) { document.getElementById(id).textContent = text; }
  function render(status) {
    var hub = status.hubConnected;
    var hubDot = document.getElementById('hub-dot');
    hubDot.className = 'dot ' + (hub ? 'on' : 'off');
    setText('hub-value', hub ? '\u5DF2\u8FDE\u63A5' : '\u91CD\u8BD5\u4E2D\u2026');
    var orca = status.orcaState;
    var orcaDot = document.getElementById('orca-dot');
    orcaDot.className = 'dot ' + (orca === 'connected' ? 'on' : orca === 'disconnected' ? 'off' : 'warn');
    var desc = status.orcaDescriptor || {};
    var orcaText = orca;
    if (desc.appVersion) orcaText += ' \xB7 Orca ' + desc.appVersion;
    if (desc.machineName) orcaText += ' \xB7 ' + desc.machineName;
    setText('orca-value', orcaText);
    setText('gateway-id', status.gatewayId);
    setText('config-path', status.configPath || '\uFF08\u672A\u7528 --config\uFF0C\u914D\u7F6E\u65E0\u5904\u843D\u76D8\uFF09');
    var noteRow = document.getElementById('note-row');
    if (status.configNote) { noteRow.hidden = false; setText('config-note', status.configNote); }
    else { noteRow.hidden = true; }
  }
  function refresh() {
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (payload) { render(payload.status); }).catch(function () {
      var hubDot = document.getElementById('hub-dot'); hubDot.className = 'dot off';
      setText('hub-value', '\u7BA1\u7406\u670D\u52A1\u65E0\u54CD\u5E94');
    });
  }
  function postConfig(payload, noteEl, button, done) {
    noteEl.textContent = '\u63D0\u4EA4\u4E2D\u2026'; noteEl.className = 'note'; button.disabled = true;
    fetch('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-orca-web-admin': '1' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (p) { return { httpStatus: r.status, payload: p }; }); }).then(function (r) {
      button.disabled = false;
      noteEl.className = 'note' + (r.payload.ok ? '' : ' bad');
      noteEl.textContent = r.payload.ok ? (r.payload.message || '\u5DF2\u5E94\u7528\u3002') : (r.payload.error || '\u5931\u8D25');
      if (r.payload.ok) { setTimeout(done, 1200); }
    }).catch(function (error) {
      button.disabled = false;
      noteEl.className = 'note bad';
      noteEl.textContent = String(error);
    });
  }
  document.getElementById('save-hub').addEventListener('click', function () {
    var payload = {};
    var url = document.getElementById('server-url').value.trim();
    var key = document.getElementById('gateway-key').value;
    if (url) payload.serverUrl = url;
    if (key) payload.gatewayKey = key;
    if (!payload.serverUrl && !payload.gatewayKey) {
      var n = document.getElementById('hub-note'); n.className = 'note bad'; n.textContent = '\u4E24\u4E2A\u90FD\u6CA1\u586B\u3002';
      return;
    }
    postConfig(payload, document.getElementById('hub-note'), this, function () {
      document.getElementById('gateway-key').value = '';
      refresh();
    });
  });
  document.getElementById('apply-pairing').addEventListener('click', function () {
    var code = document.getElementById('pairing-code').value;
    if (!code.trim()) {
      var n = document.getElementById('pair-note'); n.className = 'note bad'; n.textContent = '\u914D\u5BF9\u7801\u4E3A\u7A7A\u3002';
      return;
    }
    postConfig({ pairingCode: code }, document.getElementById('pair-note'), this, function () {
      document.getElementById('pairing-code').value = '';
      refresh();
    });
  });
  refresh();
  setInterval(refresh, 3000);
</script>
</body>
</html>
`;

// src/shared/link-protocol.ts
var LINK_PROTOCOL_VERSION = 1;

// src/gateway/orca/rpc-client.ts
import { randomUUID } from "node:crypto";

// src/gateway/orca/e2ee-v2-client.ts
var import_tweetnacl = __toESM(require_nacl_fast(), 1);
import { createHash, hkdfSync } from "node:crypto";
var SALT_LABEL = new TextEncoder().encode("orca-mobile-e2ee/v2/salt\0");
var INFO_LABEL = new TextEncoder().encode("orca-mobile-e2ee/v2/session\0");
var TRANSCRIPT_DOMAIN = "orca-mobile-e2ee/v2/transcript";
var PROTOCOL = "orca-mobile-e2ee";
var SESSION_ID_LENGTH = 32;
var NONCE_LENGTH = 24;
var HEADER_LENGTH = SESSION_ID_LENGTH + 2 + 8;
var FRAME_VERSION = 2;
var MAX_COUNTER = (1n << 64n) - 1n;
var OrcaE2eeClient = class {
  hello;
  clientSecretKey;
  clientNonce;
  pinnedHostPublicKey;
  schedule = null;
  inboundCounter = 0n;
  outboundCounter = 0n;
  constructor(options) {
    const keyPair = import_tweetnacl.default.box.keyPair();
    const clientNonce = import_tweetnacl.default.randomBytes(32);
    this.clientSecretKey = keyPair.secretKey;
    this.clientNonce = clientNonce;
    this.pinnedHostPublicKey = decodeHostKey(options.hostPublicKeyB64);
    this.hello = {
      type: "e2ee_hello",
      v: 2,
      clientPublicKeyB64: encodeBase64(keyPair.publicKey),
      clientNonceB64: encodeBase64(clientNonce),
      capabilities: { framing: [2], payloadKinds: ["text", "binary"] },
      context: {
        protocol: PROTOCOL,
        initiator: "mobile",
        responder: "desktop",
        transport: options.transport ?? "direct",
        ...options.relayHostId ? { relayHostId: options.relayHostId } : {}
      }
    };
  }
  helloText() {
    return JSON.stringify(this.hello);
  }
  /** Returns false for a ready that does not continue this hello or pins another host key. */
  acceptReady(text) {
    let ready;
    try {
      ready = JSON.parse(text);
    } catch {
      return false;
    }
    const accepted = this.validateReady(ready);
    if (!accepted) {
      return false;
    }
    const transcript = encodeTranscript({
      hello: this.hello,
      ready,
      clientPublicKey: decodeBase64(this.hello.clientPublicKeyB64),
      hostPublicKey: accepted.hostPublicKey,
      clientNonce: this.clientNonce,
      hostNonce: accepted.hostNonce
    });
    this.schedule = deriveKeySchedule({
      sharedSecret: import_tweetnacl.default.box.before(accepted.hostPublicKey, this.clientSecretKey),
      transcript,
      clientNonce: this.clientNonce,
      hostNonce: accepted.hostNonce
    });
    return true;
  }
  get isReady() {
    return this.schedule !== null;
  }
  get transcriptHashB64() {
    if (!this.schedule) {
      throw new Error("E2EE v2 ready has not been accepted");
    }
    return encodeBase64(this.schedule.transcriptHash);
  }
  /** Token auth is sealed like any payload and names this connection's transcript. */
  authText(deviceToken) {
    return this.sealText(
      JSON.stringify({
        type: "e2ee_auth",
        v: 2,
        transcriptHashB64: this.transcriptHashB64,
        deviceToken
      })
    );
  }
  isAuthenticatedControl(text) {
    const reply = parseJson(text);
    return isRecord(reply) && reply.type === "e2ee_authenticated" && reply.v === 2 && reply.transcriptHashB64 === this.transcriptHashB64;
  }
  sealText(plaintext) {
    const frame = this.seal(new TextEncoder().encode(plaintext), "text");
    return encodeBase64(frame);
  }
  openText(frameB64) {
    const frame = decodeBase64OrNull(frameB64);
    if (!frame) {
      return null;
    }
    const plaintext = this.open(frame, "text");
    return plaintext ? new TextDecoder().decode(plaintext) : null;
  }
  validateReady(ready) {
    if (!isRecord(ready) || ready.type !== "e2ee_ready" || ready.v !== 2) {
      return null;
    }
    if (ready.clientNonceB64 !== this.hello.clientNonceB64) {
      return null;
    }
    const selection = ready.selection;
    if (!isRecord(selection) || selection.framing !== 2 || !Array.isArray(selection.payloadKinds) || selection.payloadKinds.join() !== "text,binary") {
      return null;
    }
    const context = ready.context;
    if (!context || !sameContext(context, this.hello.context)) {
      return null;
    }
    const hostPublicKey = decodeFixedBase64(ready.desktopPublicKeyB64, 32);
    const hostNonce = decodeFixedBase64(ready.desktopNonceB64, 32);
    if (!hostPublicKey || !hostNonce || !equalBytes(hostPublicKey, this.pinnedHostPublicKey)) {
      return null;
    }
    return { hostPublicKey, hostNonce };
  }
  open(frame, kind) {
    if (!this.schedule || frame.length < NONCE_LENGTH + import_tweetnacl.default.secretbox.overheadLength + HEADER_LENGTH) {
      return null;
    }
    const expected = {
      sessionId: this.schedule.sessionId,
      direction: "desktop-to-mobile",
      kind,
      counter: this.inboundCounter
    };
    const nonce = encodeNonce(expected);
    if (!equalBytes(frame.subarray(0, NONCE_LENGTH), nonce)) {
      return null;
    }
    const plaintext = import_tweetnacl.default.secretbox.open(
      frame.subarray(NONCE_LENGTH),
      nonce,
      this.schedule.desktopToMobileKey
    );
    if (!plaintext || !equalBytes(plaintext.subarray(0, HEADER_LENGTH), encodeHeader(expected))) {
      return null;
    }
    this.inboundCounter++;
    return plaintext.slice(HEADER_LENGTH);
  }
  seal(plaintext, kind) {
    if (!this.schedule) {
      throw new Error("E2EE v2 ready has not been accepted");
    }
    const header = {
      sessionId: this.schedule.sessionId,
      direction: "mobile-to-desktop",
      kind,
      counter: this.outboundCounter
    };
    const nonce = encodeNonce(header);
    const body = concatBytes([encodeHeader(header), plaintext]);
    const ciphertext = import_tweetnacl.default.secretbox(body, nonce, this.schedule.mobileToDesktopKey);
    this.outboundCounter++;
    return concatBytes([nonce, ciphertext]);
  }
};
function deriveKeySchedule(args2) {
  const transcriptHash = sha256(args2.transcript);
  const salt = sha256(concatBytes([SALT_LABEL, args2.clientNonce, args2.hostNonce]));
  const info = concatBytes([INFO_LABEL, transcriptHash]);
  const expanded = new Uint8Array(
    hkdfSync("sha256", args2.sharedSecret, salt, info, 96)
  );
  return {
    mobileToDesktopKey: expanded.slice(0, 32),
    desktopToMobileKey: expanded.slice(32, 64),
    sessionId: expanded.slice(64, 96),
    transcriptHash
  };
}
function encodeTranscript(args2) {
  const { hello, ready } = args2;
  const fields = [
    ["domain", utf8(TRANSCRIPT_DOMAIN)],
    ["mobile-to-desktop.type", utf8(hello.type)],
    ["mobile-to-desktop.version", uint32(hello.v)],
    ["mobile-to-desktop.client-public-key", args2.clientPublicKey],
    ["mobile-to-desktop.client-nonce", args2.clientNonce],
    ["mobile-to-desktop.capabilities.framing", encodeNumberList(hello.capabilities.framing)],
    ["mobile-to-desktop.capabilities.payload-kinds", encodeStringList(hello.capabilities.payloadKinds)],
    ["mobile-to-desktop.context.protocol", utf8(hello.context.protocol)],
    ["mobile-to-desktop.context.initiator", utf8(hello.context.initiator)],
    ["mobile-to-desktop.context.responder", utf8(hello.context.responder)],
    ["mobile-to-desktop.context.transport", utf8(hello.context.transport)],
    ["mobile-to-desktop.context.relay-host-id", utf8(hello.context.relayHostId ?? "")],
    ["desktop-to-mobile.type", utf8(ready.type)],
    ["desktop-to-mobile.version", uint32(ready.v)],
    ["desktop-to-mobile.desktop-public-key", args2.hostPublicKey],
    ["desktop-to-mobile.client-nonce-echo", args2.clientNonce],
    ["desktop-to-mobile.desktop-nonce", args2.hostNonce],
    ["desktop-to-mobile.selection.framing", uint32(ready.selection.framing)],
    ["desktop-to-mobile.selection.payload-kinds", encodeStringList(ready.selection.payloadKinds)],
    ["desktop-to-mobile.context.protocol", utf8(ready.context.protocol)],
    ["desktop-to-mobile.context.initiator", utf8(ready.context.initiator)],
    ["desktop-to-mobile.context.responder", utf8(ready.context.responder)],
    ["desktop-to-mobile.context.transport", utf8(ready.context.transport)],
    ["desktop-to-mobile.context.relay-host-id", utf8(ready.context.relayHostId ?? "")]
  ];
  return concatBytes(
    fields.map(
      ([name, value]) => concatBytes([uint32(utf8(name).length), utf8(name), uint32(value.length), value])
    )
  );
}
function encodeHeader(header) {
  const bytes = new Uint8Array(HEADER_LENGTH);
  bytes.set(header.sessionId, 0);
  bytes[SESSION_ID_LENGTH] = header.direction === "mobile-to-desktop" ? 0 : 1;
  bytes[SESSION_ID_LENGTH + 1] = header.kind === "text" ? 0 : 1;
  writeUint64(bytes, SESSION_ID_LENGTH + 2, header.counter);
  return bytes;
}
function encodeNonce(header) {
  const nonce = new Uint8Array(NONCE_LENGTH);
  nonce.set(header.sessionId.subarray(0, 12), 0);
  nonce[12] = FRAME_VERSION;
  nonce[13] = header.direction === "mobile-to-desktop" ? 0 : 1;
  nonce[14] = header.kind === "text" ? 0 : 1;
  nonce[15] = 0;
  writeUint64(nonce, 16, header.counter);
  return nonce;
}
function writeUint64(target, offset, value) {
  if (value < 0n || value > MAX_COUNTER) {
    throw new Error(`Invalid E2EE v2 counter: ${value}`);
  }
  let remaining = value;
  for (let index = 7; index >= 0; index--) {
    target[offset + index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
}
function sameContext(left, right) {
  return left.protocol === right.protocol && left.initiator === right.initiator && left.responder === right.responder && left.transport === right.transport && left.relayHostId === right.relayHostId;
}
function decodeHostKey(value) {
  const key = decodeFixedBase64(value, 32);
  if (!key) {
    throw new Error("Invalid host public key");
  }
  return key;
}
function decodeFixedBase64(value, length) {
  if (typeof value !== "string") {
    return null;
  }
  const bytes = decodeBase64OrNull(value);
  return bytes && bytes.length === length ? bytes : null;
}
function decodeBase64OrNull(value) {
  try {
    const bytes = decodeBase64(value);
    return encodeBase64(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}
function encodeBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}
function decodeBase64(value) {
  return Uint8Array.from(Buffer.from(value, "base64"));
}
function sha256(bytes) {
  return new Uint8Array(createHash("sha256").update(bytes).digest());
}
function encodeNumberList(values) {
  return concatBytes([uint32(values.length), ...values.map(uint32)]);
}
function encodeStringList(values) {
  return concatBytes([
    uint32(values.length),
    ...values.map((value) => {
      const bytes = utf8(value);
      return concatBytes([uint32(bytes.length), bytes]);
    })
  ]);
}
function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}
function utf8(value) {
  return new TextEncoder().encode(value);
}
function concatBytes(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
function equalBytes(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/gateway/orca/client-capabilities.ts
var ORCA_WEB_CLIENT_CAPABILITIES = [
  "agent-session.structured.v1",
  "agent-session.structured.claude.v1",
  "agent-session.structured.registered-agents.v1",
  "agent-session.structured.client-launch-mode.v1",
  "agent-session.options.optional-model.v1",
  "agent-session.pending-send-result.v1",
  "agent-session.turn-item.v1",
  "agent-session.current-requests.v1",
  "agent-session.commands-on-request.v1",
  "agent-session.coherent-model-catalog.v1",
  "agent-session.session-boundary.v1",
  "agent-session.background-task-stop.v1",
  "agent-session.background-task-row-stop.v1",
  "agent-session.background-task-child-views.v1",
  "agentSession.create.message.v1",
  "session-tabs.close-intent.v1",
  "session-tabs.authoritative-inventory.v1"
];

// src/gateway/orca/rpc-client.ts
var OrcaRpcError = class extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.name = "OrcaRpcError";
    this.code = code;
    this.data = data;
  }
};
var OrcaConnectionError = class extends Error {
  stage;
  constructor(stage, message) {
    super(message);
    this.name = "OrcaConnectionError";
    this.stage = stage;
  }
};
var DEFAULT_HANDSHAKE_TIMEOUT_MS = 15e3;
var DEFAULT_REQUEST_TIMEOUT_MS = 3e4;
var OrcaConnection = class _OrcaConnection {
  socket;
  deviceToken;
  handshakeTimeoutMs;
  listeners = /* @__PURE__ */ new Map();
  closeListeners = /* @__PURE__ */ new Set();
  closed = false;
  constructor(socket, options) {
    this.socket = socket;
    this.deviceToken = options.deviceToken;
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS;
  }
  static async connect(options) {
    const socket = new WebSocket(options.endpoint);
    const connection = new _OrcaConnection(socket, options);
    await connection.performHandshake(options);
    try {
      await connection.request("runtime.clientCapabilities.update", {
        clientCapabilities: [...ORCA_WEB_CLIENT_CAPABILITIES]
      });
    } catch (error) {
      connection.close();
      throw error;
    }
    return connection;
  }
  /** Resolves with the first response frame for this request. */
  async request(method, params, options) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const requestId = randomUUID();
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(requestId, onFrame);
        reject(new OrcaRpcError("runtime_timeout", `${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      const onFrame = (envelope) => {
        clearTimeout(timer);
        this.removeListener(requestId, onFrame);
        if (envelope.ok) {
          resolve(envelope.result);
        } else {
          reject(new OrcaRpcError(envelope.error.code, envelope.error.message, envelope.error.data));
        }
      };
      this.addListener(requestId, onFrame);
      this.sendRpc(requestId, method, params);
    });
  }
  /** Every response frame for this id, including streamed and multi-part replies. */
  async subscribe(method, params, onFrame) {
    const requestId = randomUUID();
    const listener = (envelope) => {
      if (envelope.ok) {
        onFrame(envelope.result);
        return;
      }
      onFrame({ type: "error", error: envelope.error });
    };
    this.addListener(requestId, listener);
    this.sendRpc(requestId, method, params);
    return {
      requestId,
      close: () => this.removeListener(requestId, listener)
    };
  }
  onClose(listener) {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }
  close() {
    if (this.closed) {
      return;
    }
    this.socket.close(1e3, "client closing");
  }
  sendRpc(requestId, method, params) {
    if (this.closed || this.socket.readyState !== WebSocket.OPEN) {
      throw new OrcaConnectionError("socket", "Orca socket is not open");
    }
    const request = {
      id: requestId,
      deviceToken: this.deviceToken,
      method,
      ...params === void 0 ? {} : { params }
    };
    this.socket.send(this.e2ee.sealText(JSON.stringify(request)));
  }
  e2ee;
  async performHandshake(options) {
    const e2ee = new OrcaE2eeClient({
      hostPublicKeyB64: options.hostPublicKeyB64,
      transport: options.transport,
      relayHostId: options.relayHostId
    });
    this.e2ee = e2ee;
    await new Promise((resolve, reject) => {
      let stage = "connect";
      let settled = false;
      const timer = setTimeout(() => {
        fail(new OrcaConnectionError(stage, `Handshake timed out at stage ${stage}`));
      }, this.handshakeTimeoutMs);
      const cleanup = () => {
        this.socket.removeEventListener("message", onMessage);
        this.socket.removeEventListener("error", onError);
        this.socket.removeEventListener("close", onClose);
        this.socket.removeEventListener("open", onOpen);
      };
      const fail = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        cleanup();
        this.socket.close();
        reject(error);
      };
      const succeed = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve();
      };
      const onMessage = (event) => {
        if (settled) {
          return;
        }
        if (typeof event.data !== "string") {
          fail(new OrcaConnectionError(stage, "Orca sent a binary frame during handshake"));
          return;
        }
        const text = event.data;
        if (stage === "connect") {
          stage = "handshake";
          if (!e2ee.acceptReady(text)) {
            fail(
              new OrcaConnectionError(
                "handshake",
                "Orca returned an e2ee_ready this client does not accept (host key or transcript mismatch)"
              )
            );
            return;
          }
          this.socket.send(e2ee.authText(this.deviceToken));
          stage = "auth";
          return;
        }
        if (stage === "auth") {
          const plaintext = e2ee.openText(text);
          if (plaintext === null) {
            fail(new OrcaConnectionError("auth", "Orca auth reply could not be decrypted"));
            return;
          }
          if (!e2ee.isAuthenticatedControl(plaintext)) {
            fail(
              new OrcaConnectionError(
                "auth",
                `Orca rejected the device token: ${describeAuthReply(plaintext)}`
              )
            );
            return;
          }
          this.installSocketHandlers();
          succeed();
        }
      };
      const onError = () => {
        fail(new OrcaConnectionError(stage, `Could not reach Orca at ${options.endpoint}`));
      };
      const onClose = (event) => {
        fail(
          new OrcaConnectionError(
            stage,
            `Orca closed the socket during ${stage} (code ${event.code}${event.reason ? `: ${event.reason}` : ""})`
          )
        );
      };
      const onOpen = () => this.socket.send(e2ee.helloText());
      this.socket.addEventListener("message", onMessage);
      this.socket.addEventListener("error", onError);
      this.socket.addEventListener("close", onClose);
      this.socket.addEventListener("open", onOpen);
    });
  }
  installSocketHandlers() {
    this.socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      const plaintext = this.e2ee.openText(event.data);
      if (plaintext === null) {
        this.failAll(new OrcaConnectionError("socket", "Orca sent an undecryptable frame"));
        this.socket.close();
        return;
      }
      let frame;
      try {
        frame = JSON.parse(plaintext);
      } catch {
        this.failAll(new OrcaConnectionError("socket", "Orca sent a non-JSON frame"));
        this.socket.close();
        return;
      }
      if (isKeepalive(frame)) {
        return;
      }
      if (!isRecord2(frame) || typeof frame.id !== "string") {
        return;
      }
      const listeners = this.listeners.get(frame.id);
      if (!listeners) {
        return;
      }
      const envelope = frame;
      for (const listener of [...listeners]) {
        listener(envelope);
      }
    });
    this.socket.addEventListener("close", (event) => {
      this.closed = true;
      const error = event.code === 1e3 ? null : new OrcaConnectionError(
        "socket",
        `Orca closed the connection (code ${event.code}${event.reason ? `: ${event.reason}` : ""})`
      );
      this.failAll(error);
      for (const listener of [...this.closeListeners]) {
        listener(error);
      }
      this.closeListeners = /* @__PURE__ */ new Set();
    });
  }
  failAll(error) {
    this.closed = true;
    for (const [id, listeners] of this.listeners) {
      for (const listener of [...listeners]) {
        listener({ id, ok: false, error: { code: "remote_runtime_unavailable", message: error?.message ?? "closed" } });
      }
    }
    this.listeners.clear();
  }
  addListener(id, listener) {
    const set = this.listeners.get(id) ?? /* @__PURE__ */ new Set();
    set.add(listener);
    this.listeners.set(id, set);
  }
  removeListener(id, listener) {
    const set = this.listeners.get(id);
    if (!set) {
      return;
    }
    set.delete(listener);
    if (set.size === 0) {
      this.listeners.delete(id);
    }
  }
};
function isKeepalive(frame) {
  return isRecord2(frame) && frame._keepalive === true;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function describeAuthReply(plaintext) {
  try {
    const reply = JSON.parse(plaintext);
    const error = isRecord2(reply.error) ? reply.error : null;
    return [reply.type, error?.code, error?.message].filter(Boolean).join(" ") || plaintext;
  } catch {
    return plaintext.slice(0, 200);
  }
}

// apps/gateway/src/orca-bridge.ts
var RETRY_BASE_MS = 500;
var RETRY_MAX_MS = 3e4;
var OrcaBridge = class {
  connection = null;
  state = "connecting";
  descriptor = {};
  subscriptions = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  stopped = false;
  loop = null;
  options;
  constructor(options) {
    this.options = options;
  }
  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  getState() {
    return this.state;
  }
  getDescriptor() {
    return this.descriptor;
  }
  start() {
    if (!this.loop) {
      this.loop = this.run();
    }
  }
  async stop() {
    this.stopped = true;
    this.closeSubscriptions();
    this.connection?.close();
    this.connection = null;
    await this.loop?.catch(() => {
    });
  }
  async request(method, params, timeoutMs) {
    const connection = this.connection;
    if (!connection) {
      throw new BridgeError("remote_runtime_unavailable", "Desktop Orca is not connected");
    }
    return await connection.request(method, params, {
      ...timeoutMs === void 0 ? {} : { timeoutMs }
    });
  }
  subscribe(id, method, params) {
    const existing = this.subscriptions.get(id);
    existing?.handle?.close();
    const subscription = { method, params, handle: null };
    this.subscriptions.set(id, subscription);
    void this.openSubscription(id, subscription);
  }
  unsubscribe(id) {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      return;
    }
    subscription.handle?.close();
    this.subscriptions.delete(id);
    const sessionId = subscription.params?.sessionId;
    if (subscription.method === "agentSession.subscribe" && typeof sessionId === "string") {
      void this.connection?.request("agentSession.unsubscribe", { sessionId }).catch(() => {
      });
    }
  }
  unsubscribeAll() {
    this.closeSubscriptions();
    this.subscriptions.clear();
  }
  async openSubscription(id, subscription) {
    const connection = this.connection;
    if (!connection) {
      return;
    }
    try {
      const handle = await connection.subscribe(subscription.method, subscription.params, (frame) => {
        if (this.subscriptions.get(id) !== subscription) {
          return;
        }
        if (isStreamError(frame)) {
          this.emit({ kind: "stream-error", id, error: toLinkError(frame.error) });
          return;
        }
        this.emit({ kind: "stream-frame", id, result: frame });
      });
      if (this.subscriptions.get(id) !== subscription) {
        handle.close();
        return;
      }
      subscription.handle = handle;
    } catch (error) {
      this.emit({ kind: "stream-error", id, error: toLinkError(error) });
    }
  }
  async run() {
    let attempt = 0;
    while (!this.stopped) {
      this.setState("connecting");
      try {
        const connection = await OrcaConnection.connect(this.options);
        if (this.stopped) {
          connection.close();
          return;
        }
        this.connection = connection;
        attempt = 0;
        this.setState("connected");
        const closed = new Promise((resolve) => {
          connection.onClose((error) => {
            if (this.connection === connection) {
              this.connection = null;
              this.closeSubscriptions();
              this.setState("disconnected", error?.message);
            }
            resolve();
          });
        });
        try {
          await this.readDescriptor(connection);
          await this.replaySubscriptions();
        } catch {
          connection.close();
        }
        await closed;
      } catch (error) {
        if (this.stopped) {
          return;
        }
        this.connection = null;
        this.setState("disconnected", describeError(error));
      }
      if (this.stopped) {
        return;
      }
      await delay(backoffMs(attempt++));
    }
  }
  async readDescriptor(connection) {
    try {
      const status = await connection.request("status.get");
      this.descriptor = {
        ...status.appVersion ? { appVersion: status.appVersion } : {},
        ...status.runtimeProtocolVersion !== void 0 ? { protocolVersion: status.runtimeProtocolVersion } : {},
        ...status.hostPlatform ? { hostPlatform: status.hostPlatform } : {},
        ...status.machineName ? { machineName: status.machineName } : {}
      };
      this.emit({ kind: "orca", descriptor: this.descriptor });
    } catch {
    }
  }
  async replaySubscriptions() {
    for (const [id, subscription] of [...this.subscriptions]) {
      this.emit({ kind: "stream-reset", id });
      await this.openSubscription(id, subscription);
    }
  }
  closeSubscriptions() {
    for (const subscription of this.subscriptions.values()) {
      subscription.handle?.close();
      subscription.handle = null;
    }
  }
  setState(state, message) {
    if (this.state === state && !message) {
      return;
    }
    this.state = state;
    this.emit({ kind: "state", state, ...message ? { message } : {} });
  }
  emit(event) {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
};
var BridgeError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
  }
};
function backoffMs(attempt) {
  const exponential = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
  return Math.round(exponential * (0.8 + Math.random() * 0.4));
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function describeError(error) {
  if (error instanceof OrcaConnectionError || error instanceof OrcaRpcError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
function isStreamError(value) {
  return typeof value === "object" && value !== null && value.type === "error" && typeof value.error === "object";
}
function toLinkError(error) {
  if (error instanceof BridgeError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof OrcaRpcError) {
    return {
      code: error.code,
      message: error.message,
      ...error.data === void 0 ? {} : { data: error.data }
    };
  }
  if (typeof error === "object" && error !== null) {
    const record = error;
    if (typeof record.code === "string" && typeof record.message === "string") {
      return {
        code: record.code,
        message: record.message,
        ...record.data === void 0 ? {} : { data: record.data }
      };
    }
  }
  return {
    code: "remote_runtime_unavailable",
    message: error instanceof Error ? error.message : String(error)
  };
}

// apps/gateway/src/hub-link.ts
var RETRY_BASE_MS2 = 500;
var RETRY_MAX_MS2 = 3e4;
var PING_INTERVAL_MS = 25e3;
var SILENCE_TIMEOUT_MS = 75e3;
var HubLink = class {
  socket = null;
  stopped = false;
  attempt = 0;
  pingTimer = null;
  lastFrameAt = 0;
  unsubscribeBridge;
  options;
  constructor(options) {
    this.options = options;
    this.unsubscribeBridge = options.bridge.onEvent((event) => this.forward(event));
  }
  start() {
    void this.run();
  }
  isConnected() {
    return this.socket !== null;
  }
  stop() {
    this.stopped = true;
    this.stopPing();
    this.unsubscribeBridge();
    this.socket?.close(1e3, "gateway stopping");
    this.socket = null;
  }
  async run() {
    while (!this.stopped) {
      await this.connectOnce();
      if (this.stopped) {
        return;
      }
      await delay2(backoffMs2(this.attempt++));
    }
  }
  async connectOnce() {
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      socket.addEventListener("open", () => {
        this.attempt = 0;
        this.options.log(`hub connected: ${this.options.url}`);
        this.send({
          type: "hello",
          v: LINK_PROTOCOL_VERSION,
          key: this.options.key,
          gatewayId: this.options.gatewayId,
          orcaState: this.options.bridge.getState(),
          ...Object.keys(this.options.bridge.getDescriptor()).length ? { orca: this.options.bridge.getDescriptor() } : {}
        });
        this.lastFrameAt = Date.now();
        this.startPing();
      });
      socket.addEventListener("message", (event) => {
        this.lastFrameAt = Date.now();
        if (typeof event.data !== "string") {
          return;
        }
        let frame;
        try {
          frame = JSON.parse(event.data);
        } catch {
          return;
        }
        if (isHubFrame(frame)) {
          this.handleFrame(frame);
        }
      });
      socket.addEventListener("error", () => finish());
      socket.addEventListener("close", (event) => {
        this.stopPing();
        if (this.socket === socket) {
          this.socket = null;
        }
        this.options.bridge.unsubscribeAll();
        if (!this.stopped) {
          this.options.log(`hub disconnected (code ${event.code})`);
        }
        finish();
      });
    });
  }
  handleFrame(frame) {
    switch (frame.type) {
      case "welcome":
        this.options.log(`hub accepted gateway ${frame.gatewayId}`);
        return;
      case "reject":
        this.options.log(`hub rejected the gateway: ${frame.code} ${frame.message}`);
        this.socket?.close(4003, "rejected");
        return;
      case "ping":
        this.send({ type: "pong" });
        return;
      case "pong":
        return;
      case "request":
        void this.handleRequest(frame.id, frame.method, frame.params, frame.timeoutMs);
        return;
      case "subscribe":
        this.options.bridge.subscribe(frame.id, frame.method, frame.params);
        return;
      case "unsubscribe":
        this.options.bridge.unsubscribe(frame.id);
        return;
    }
  }
  async handleRequest(id, method, params, timeoutMs) {
    try {
      const result = await this.options.bridge.request(method, params, timeoutMs);
      this.send({ type: "request-result", id, ok: true, result });
    } catch (error) {
      this.send({ type: "request-result", id, ok: false, error: toLinkError(error) });
    }
  }
  forward(event) {
    switch (event.kind) {
      case "state":
        this.send({
          type: "orca-state",
          state: event.state,
          ...event.message ? { message: event.message } : {}
        });
        return;
      case "orca":
        return;
      case "stream-frame":
        this.send({ type: "stream-frame", id: event.id, result: event.result });
        return;
      case "stream-error":
        this.send({ type: "stream-error", id: event.id, error: event.error });
        return;
      case "stream-reset":
        this.send({ type: "stream-reset", id: event.id });
        return;
    }
  }
  send(frame) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(frame));
  }
  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastFrameAt > SILENCE_TIMEOUT_MS) {
        this.socket?.close(4004, "hub silent");
        return;
      }
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
};
function isHubFrame(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string";
}
function backoffMs2(attempt) {
  const exponential = Math.min(RETRY_MAX_MS2, RETRY_BASE_MS2 * 2 ** Math.min(attempt, 10));
  return Math.round(exponential * (0.8 + Math.random() * 0.4));
}
function delay2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// apps/gateway/src/main.ts
var args = parseArgs(process.argv.slice(2));
var config = loadConfig({ configPath: args.config, localOrca: args.localOrca });
log(`orca-web gateway starting`);
log(describeConfig(config));
var runtime = createRuntime(config);
runtime.bridge.start();
runtime.hub.start();
var admin = new LocalAdminServer({
  port: config.adminPort,
  status: () => ({
    gatewayId: config.gatewayId,
    configPath: config.configPath,
    pairedVia: config.pairedVia,
    hubUrl: config.serverUrl,
    hubConnected: runtime.hub.isConnected(),
    orcaState: runtime.bridge.getState(),
    orcaDescriptor: runtime.bridge.getDescriptor(),
    configNote: describeConfigSource(config)
  }),
  // Validation errors must not kill the process; a swap failure is a broken state, so the
  // process exits and the restart loop brings it up on the already-persisted config.
  apply: async (updates) => {
    const next = applyConfigUpdate(config, updates);
    try {
      await swapRuntime(next);
    } catch (error) {
      log(`swap failed, restarting to recover: ${error.message}`);
      setTimeout(() => process.exit(3), 500).unref();
      throw error;
    }
    config = next;
    log(describeConfig(config));
    return "\u5DF2\u5199\u5165\u65B0\u914D\u7F6E\uFF0C\u7F51\u5173\u6B63\u5728\u7528\u65B0\u914D\u7F6E\u91CD\u8FDE\u3002";
  }
});
admin.start();
var shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    log(`${signal}: shutting down`);
    admin.stop();
    runtime.hub.stop();
    void runtime.bridge.stop().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 3e3).unref();
  });
}
function createRuntime(next) {
  const bridge = new OrcaBridge(next.orca);
  bridge.onEvent((event) => {
    if (event.kind === "state") {
      log(`orca ${event.state}${event.message ? `: ${event.message}` : ""}`);
    }
  });
  return {
    bridge,
    hub: new HubLink({
      url: next.serverUrl,
      key: next.gatewayKey,
      gatewayId: next.gatewayId,
      bridge,
      log
    })
  };
}
async function swapRuntime(next) {
  const replacement = createRuntime(next);
  runtime.hub.stop();
  await Promise.race([
    runtime.bridge.stop(),
    new Promise((resolve) => setTimeout(resolve, 5e3).unref())
  ]);
  runtime = replacement;
  runtime.bridge.start();
  runtime.hub.start();
}
function parseArgs(argv) {
  const parsed = { localOrca: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--config") {
      parsed.config = argv[++index];
      if (!parsed.config) {
        throw new Error("--config needs a path");
      }
    } else if (arg === "--local-orca") {
      parsed.localOrca = true;
    }
  }
  return parsed;
}
function log(message) {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} ${message}`);
}
