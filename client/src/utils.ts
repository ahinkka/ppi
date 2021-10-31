import * as L from 'partial.lenses'

export function httpGetPromise(url: string, binary: boolean) {
  return new Promise(function(resolve, reject) {
    let req = new XMLHttpRequest();
    req.open('GET', url);
    if (binary) {
      req.responseType = 'arraybuffer';
    }
    req.onload = function() {
      if (req.status === 200) {
        resolve(req.response);
      } else {
        reject(new Error(req.statusText));
      }
    };

    req.onerror = function() {
      reject(new Error('Network error'));
    };

    req.send();
  });
}

export function objectEquals(x, y) {
  if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
  // after this just checking type of one would be enough
  if (x.constructor !== y.constructor) { return false; }
  // if they are functions, they should exactly refer to same one (because of closures)
  if (x instanceof Function) { return x === y; }
  // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
  if (x instanceof RegExp) { return x === y; }
  if (x === y || x.valueOf() === y.valueOf()) { return true; }
  if (Array.isArray(x) && x.length !== y.length) { return false; }

  // if they are dates, they must had equal valueOf
  if (x instanceof Date) { return false; }

  // if they are strictly equal, they both need to be object at least
  if (!(x instanceof Object)) { return false; }
  if (!(y instanceof Object)) { return false; }

  // recursive object equality check
  var p = Object.keys(x);
  return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
        p.every(function (i) { return objectEquals(x[i], y[i]); });
}

export function twoDtoUint8Array(input: number[][]): [number, number, Uint8Array] {
  let dim1 = input.length
  let dim2 = input[0].length

  let buffer = new ArrayBuffer(dim1 * dim2)
  let view = new Uint8Array(buffer)
  for (let i=0; i < dim1; i++) {
    for (let j=0; j < dim2; j++) {
      let viewIndex = i * dim2 + j
      view[viewIndex] = input[i][j]
    }
  }

  return [dim1, dim2, view]
}

export const lensesToProps = (lenses) =>
  (state) => lenses.reduce((acc, lens) => L.set(lens, L.get(lens, state), acc), {})
