// @ts-check
'use strict';

class OctreeNode {
    /**
     * @param {number} depth 
     * @param {any} value 
     */
    constructor(depth, value) {
        this.value = value;
        /** @type {OctreeNode[]} */
        this.children = null;
        this.depth = depth;
    }

    get(x, y, z) {
        if (this.children === null) return this.value;
        let d = this.depth - 1;
        let n = ((x >> d) & 1) + ((y >> d) & 1) * 2 + ((z >> d) & 1) * 4;
        return this.children[n].get(x, y, z);
    }

    set(x, y, z, v) {
        let d = this.depth - 1;
        if (d < 0) {
            this.value = v;
            return true; // changed.
        }
        if (this.children === null) {
            if (this.value == v) return false;
            this._makeChildren();
        }

        let n = ((x >> d) & 1) + ((y >> d) & 1) * 2 + ((z >> d) & 1) * 4;
        if (this.children[n].set(x, y, z, v)) {
            this._compact();
            return true; // changed.
        }
        return false;
    }

    _makeChildren() {
        let c = this.children = new Array(8);
        for (let i = 0; i < 8; i++) {
            c[i] = new OctreeNode(this.depth - 1, this.value);
        }
    }

    _compact(v) {
        for (let i = 0; i < 8; i++) {
            // TODO canMerge(this.children[i].value, v)
            if (this.children[i].children !== null || this.children[i].value != v) return;
        }
        this.value = v;
        this.children = null;
    }

    toArray() {
        return this.children === null ? this.value : this.children.map(n => n.toArray());
    }

    rotate90(axis) {
        // ax : x:0 y:1 z:2
        if (this.children === null) return;
        let d = 1 << axis;
        let dd = [[0, 2, 6, 4], [0, 1, 5, 4], [0, 1, 3, 2]][axis];
        for (let i = 0; i < 2; i++) {
            let t1 = this.children[i * d];
            this.children[i * d + dd[0]] = this.children[i * d + dd[1]];
            this.children[i * d + dd[1]] = this.children[i * d + dd[2]];
            this.children[i * d + dd[2]] = this.children[i * d + dd[3]];
            this.children[i * d + dd[3]] = t1;
        }
        for (let i = 0; i < 8; i++) {
            this.children[i].rotate90(axis);
        }
    }

    applyFunc(f, x, y, z, v) {
        if (this.children === null && this.value == v) {
            return false;
        }
        var r = f(x, y, z, 1 << this.depth);
        if (r == 1) { // all
            this.value = v;
            this.children = null;
            return true;
        } else if (r == 2 && this.depth > 0) { // partial
            if (this.children === null) {
                this._makeChildren();
            }
            var sz = 1 << (this.depth - 1);
            var cf = 0;
            for (var i = 0; i < 8; i++) {
                cf |= this.children[i].applyFunc(f, x + sz * (i & 1), y + sz * ((i >> 1) & 1), z + sz * ((i >> 2) & 1), v);
            }
            if (!cf) return false;
            this._compact(v);
            return true;
        }
        return false;
    }

    slice(buf, p, stride, d, ax) {
        var size = 1 << this.depth;
        if (this.children === null) {
            for (var j = 0; j < size; j++) {
                for (var i = 0; i < size; i++) {
                    buf[p + i] = this.value;
                }
                p += stride;
            }
            return;
        }
        size = size >> 1;
        var tree = this;
        var o = ((d >> (tree.depth - 1)) & 1) << ax;
        if (ax == 0) {
            for (var i = 0; i < 4; i++) {
                tree.children[o].slice(buf, p + size * (i & 1) + stride * size * ((i >> 1) & 1), stride, d, ax);
                o += 2;
            }
        } else if (ax == 1) {
            for (var i = 0; i < 4; i++) {
                tree.children[(i & 2) + o].slice(buf, p + size * ((i >> 1) & 1) + stride * size * (i & 1), stride, d, ax);
                o += 1;
            }
        } else {
            for (var i = 0; i < 4; i++) {
                tree.children[o].slice(buf, p + size * (i & 1) + stride * size * ((i >> 1) & 1), stride, d, ax);
                o += 1;
            }
        }
    }

    slice2(buf, p, stride, x, y, z, n, ax) {
        if (n == this.depth) {
            return this.slice(buf, p, stride, [x, y, z][ax], ax);
        }
        if (this.children === null) {
            var size = 1 << n;
            for (var j = 0; j < size; j++) {
                for (var i = 0; i < size; i++) {
                    buf[p + i] = this.value;
                }
                p += stride;
            }
            return;
        }
        var d = this.depth - 1;
        var i = ((x >> d) & 1) + ((y >> d) & 1) * 2 + ((z >> d) & 1) * 4;
        return this.children[i].slice2(buf, p, stride, x, y, z, n, ax);
    }
}

class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }
    set(x, y, z) {
        this.x = x; this.y = y; this.z = z;
        return this;
    }
    copy(v) {
        this.x = v.x; this.y = v.y; this.z = v.z;
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    normalize() {
        let len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
        return this;
    }
}


class Voxel {
    constructor(depth, subMeshLevel) {
        this.tree = new OctreeNode(depth, 0);
        /** @type {Record<number, any[]>} */
        this.meshMap = {};
        /** @type {Record<number, [number, number, number, number, OctreeNode]>} */
        this.pendingMeshMap = {};
        /**@type {number} */
        this.subMeshLevel = subMeshLevel || 5;
        this._smoothParams = [-0.44, -0.335, -0.25, -0.11, 0.0, 0.11, 0.25, 0.33, 0.44];
    }

    clear() {
        this.clearMesh();
        this.tree = new OctreeNode(this.tree.depth, 0);
    }

    size() {
        return 1 << this.tree.depth;
    }

    applyFunc(f, v) {
        let ret = this.tree.applyFunc(f, 0, 0, 0, v);
        if (ret) {
            // invalidate cache.
            let d = this.subMeshLevel;
            let sz = 1 << d;
            let k = this.tree.depth - d;
            let n = 1 << (this.tree.depth - d);
            for (let key of Object.keys(this.meshMap)) {
                let x = key % n, y = (key >> k) % n, z = (key >> (k * 2)) % n;
                if (f(x * sz - 1, y * sz - 1, z * sz - 1, sz + 2) != 0) {
                    for (let mesh of this.meshMap[key]) {
                        this.meshDispose(mesh);
                    }
                    delete this.meshMap[key];
                }
            }
            for (let key of Object.keys(this.pendingMeshMap)) {
                let x = key % n, y = (key >> k) % n, z = (key >> (k * 2)) % n;
                if (f(x * sz - 1, y * sz - 1, z * sz - 1, sz + 2) != 0) {
                    delete this.pendingMeshMap[key];
                }
            }
        }
        return ret;
    }

    sphere(cx, cy, cz, r, v) {
        var rr = r * r;
        return this.applyFunc(function (x, y, z, sz) {
            let dx = Math.max(x, Math.min(cx, x + sz)) - cx;
            let dy = Math.max(y, Math.min(cy, y + sz)) - cy;
            let dz = Math.max(z, Math.min(cz, z + sz)) - cz;
            let dmin = dx * dx + dy * dy + dz * dz;
            if (dmin >= rr) {
                return 0;
            }
            if (sz == 1) {
                return 1;
            }
            let n = 0;
            for (let i = 0; i < 8; i++) {
                let px = x - cx + (sz * (i & 1));
                let py = y - cy + (sz * ((i >> 1) & 1));
                let pz = z - cz + (sz * ((i >> 2) & 1));
                if (px * px + py * py + pz * pz < rr) {
                    n++;
                }
            }
            return n == 8 ? 1 : 2;
        }, v);
    }

    box(x1, y1, z1, w, h, d, v) {
        var x2 = x1 + w;
        var y2 = y1 + h;
        var z2 = z1 + d;
        return this.applyFunc(function (x, y, z, sz) {
            if (x >= x1 && x + sz <= x2 && y >= y1 && y + sz <= y2 && z >= z1 && z + sz <= z2) {
                return 1; // in
            }
            if (x + sz >= x1 && x <= x2 && y + sz >= y1 && y <= y2 && z + sz >= z1 && z <= z2) {
                return 2; // partial
            }
            return 0; // out
        }, v);
    }

    cube(cx, cy, cz, size, v) {
        var x1 = cx - size / 2;
        var y1 = cy - size / 2;
        var z1 = cz - size / 2;
        return this.box(x1, y1, z1, size, size, size, v);
    }

    slice(h, ax, a, p, stride) {
        var tree = this.tree;
        var size = 1 << tree.depth;
        if (h >= size || h < 0) {
            for (var j = 0; j < size; j++) {
                for (var i = 0; i < size; i++) {
                    a[p + i] = 0;
                }
                p += stride;
            }
            return a;
        }
        tree.slice(a, p, stride, h, ax);
        return a;
    }

    slice2(x, y, z, n, ax, buf, p, stride, subTree) {
        let tree = this.tree;
        let sz = 1 << tree.depth;
        let size = 1 << n;
        if (!buf) {
            buf = new Array((size + 2) * (size + 2));
            p = 0;
            stride = size + 2;
        }
        for (var i = 0; i <= size + 1; i++) {
            if (ax == 0) {
                buf[p + i] = this.get(x, y + i - 1, z - 1);
                buf[p + i + stride * (size + 1)] = this.get(x, y + i - 1, z + size);
                buf[p + i * stride] = this.get(x, y - 1, z + i - 1);
                buf[p + i * stride + size + 1] = this.get(x, y + size, z + i - 1);
            } else if (ax == 1) {
                buf[p + i] = this.get(x - 1, y, z + i - 1);
                buf[p + i + stride * (size + 1)] = this.get(x + size, y, z + i - 1);
                buf[p + i * stride] = this.get(x + i - 1, y, z - 1);
                buf[p + i * stride + size + 1] = this.get(x + i - 1, y, z + size);
            } else if (ax == 2) {
                buf[p + i] = this.get(x + i - 1, y - 1, z);
                buf[p + i + stride * (size + 1)] = this.get(x + i - 1, y + size, z);
                buf[p + i * stride] = this.get(x - 1, y + i - 1, z);
                buf[p + i * stride + size + 1] = this.get(x + size, y + i - 1, z);
            }
        }
        if (subTree) {
            subTree.slice(buf, p + stride + 1, stride, [x, y, z][ax], ax);
            return buf;
        }

        if (x >= sz || x < 0 || y >= sz || y < 0 || z >= sz || z < 0) {
            p += stride + 1
            for (var j = 0; j < size; j++) {
                for (var i = 0; i < size; i++) {
                    buf[p + i] = 0;
                }
                p += stride;
            }
            return buf;
        }

        tree.slice2(buf, p + stride + 1, stride, x, y, z, n, ax);
        return buf;
    }

    _adjust_vart(v, a, b, p, stride, ax) {
        let ee = this._smoothParams;
        let n1, n2;
        let ff = [
            (a[p - stride - 1] > 0) | 0, (a[p - stride] > 0) | 0,
            (a[p - 1] > 0) | 0, (a[p] > 0) | 0,
            (b[p - stride - 1] > 0) | 0, (b[p - stride] > 0) | 0,
            (b[p - 1] > 0) | 0, (b[p] > 0) | 0
        ];

        // z
        n1 = ff[0] + ff[1] + ff[2] + ff[3];
        n2 = ff[4] + ff[5] + ff[6] + ff[7];
        if (n1 > n2) {
            v[0] += ee[n1 + n2];
        } else if (n1 < n2) {
            v[0] -= ee[n1 + n2];
        }

        // x
        n1 = ff[0] + ff[2] + ff[4] + ff[6];
        n2 = ff[1] + ff[3] + ff[5] + ff[7];
        if (n1 > n2) {
            v[1] += ee[n1 + n2];
        } else if (n1 < n2) {
            v[1] -= ee[n1 + n2];
        }

        // y
        n1 = ff[0] + ff[1] + ff[4] + ff[5];
        n2 = ff[2] + ff[3] + ff[6] + ff[7];
        if (n1 > n2) {
            v[2] += ee[n1 + n2];
        } else if (n1 < n2) {
            v[2] -= ee[n1 + n2];
        }

        if (ax == 0) {
            return v;
        } else if (ax == 1) {
            return [v[2], v[0], v[1]];
        } else {
            return [v[1], v[2], v[0]];
        }
    }

    get(x, y, z) {
        var size = this.size();
        if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
            return 0;
        }
        return this.tree.get(x, y, z);
    }

    makeMesh() {
        this.pendingMeshMap = {};
        this._makeMeshInternal(0, 0, 0, this.tree.depth - this.subMeshLevel, this.tree, 0);
    }

    _makeMeshInternal(x, y, z, dd, tree, mask) {
        // mask: (MSB) 0, +z, +y, +x, 0, -z, -y , -x  (LSB)
        if (dd == 0) {
            let n = 1 << (this.tree.depth - this.subMeshLevel);
            let t = x + n * y + n * n * z;
            if (this.meshMap[t] === undefined) {
                let sz = 1 << this.subMeshLevel;
                // this.meshMap[t] = this.makeSubMesh(x * sz, y * sz, z * sz, mask, tree);
                this.pendingMeshMap[t] = [x * sz, y * sz, z * sz, mask, tree];
            }
            return;
        }
        let sz = 1 << (dd - 1);
        for (let i = 0; i < 8; i++) {
            let child = tree && tree.children && tree.children[i];
            let m = mask;
            if (child === null) {
                m &= (i << 4) | (7 ^ i);
            } else {
                m |= ((7 ^ i) << 4) | i;
            }
            if (m) {
                this._makeMeshInternal(x + sz * (i & 1), y + sz * ((i >> 1) & 1), z + sz * ((i >> 2) & 1), dd - 1, child, m);
            }
        }
    }

    makeSubMesh(x, y, z, mask, subTree) {
        let mesh = { vertices: [], materials: [], triangles: [] };
        let meshes = [mesh];
        let w = 1;
        let vs = 0;
        let depth = this.subMeshLevel;
        let size = 1 << depth;
        let stride = size + 2;
        let a = new Array(stride * stride);
        let b = new Array(stride * stride);
        let v1 = new Vector3(), v2 = new Vector3(), v1c = new Vector3(), v2c = new Vector3();

        let shellOnly = subTree === null || subTree.children === null;

        let m = mask | (mask >> 4);
        for (var ax = 0; ax < 3; ax++) {
            let st = 0, en = size;
            if (shellOnly) {
                if ((m & (1 << ax)) == 0) {
                    continue;
                }
                if ((mask & (1 << ax)) == 0) {
                    st++;
                }
                if ((mask & (1 << (ax + 4))) == 0) {
                    en--;
                }
            }

            if (ax == 0) {
                this.slice2(x + st - 1, y, z, depth, ax, a, 0, stride, null);
            } else if (ax == 1) {
                this.slice2(x, y + st - 1, z, depth, ax, a, 0, stride, null);
            } else if (ax == 2) {
                this.slice2(x, y, z + st - 1, depth, ax, a, 0, stride, null);
            }
            for (var k = st; k <= en; k++) {
                var p = stride + 1;
                if (shellOnly && k != 0 && k < size - 1) {
                    continue;
                }
                if (ax == 0) {
                    this.slice2(x + k, y, z, depth, ax, b, 0, stride, k != size ? subTree : null);
                } else if (ax == 1) {
                    this.slice2(x, y + k, z, depth, ax, b, 0, stride, k != size ? subTree : null);
                } else if (ax == 2) {
                    this.slice2(x, y, z + k, depth, ax, b, 0, stride, k != size ? subTree : null);
                }
                if (shellOnly && k != 0 && k != size) {
                    var t = a; a = b; b = t;
                    continue;
                }

                for (var j = 0; j < size; j++) {
                    var l = 0;
                    for (var i = 0; i < size; i++) {
                        var pp = p + i;
                        var f = (a[pp] == 0 || b[pp] == 0) ? b[pp] - a[pp] : 0;
                        if (f == 0) {
                            l = 0;
                            continue;
                        }

                        var p1 = l == f ? mesh.vertices[vs - 3] : this._adjust_vart([k, i, j], a, b, pp, stride, ax);
                        var p2 = this._adjust_vart([k, i + w, j], a, b, pp + 1, stride, ax);
                        var p3 = l == f ? mesh.vertices[vs - 1] : this._adjust_vart([k, i, j + w], a, b, pp + stride, stride, ax);
                        var p4 = this._adjust_vart([k, i + w, j + w], a, b, pp + stride + 1, stride, ax);
                        v1c.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]).normalize();
                        v2c.set(p4[0] - p3[0], p4[1] - p3[1], p4[2] - p3[2]).normalize();

                        if (l == f && v1c.dot(v1) > 0.99 && v2c.dot(v2) > 0.99) {
                            mesh.vertices[vs - 1] = p4;
                            mesh.vertices[vs - 3] = p2;
                        } else {
                            v1.copy(v1c);
                            v2.copy(v2c);
                            l = f;
                            //if (vs > 65532) {
                            //    // webgl 1 without extension.
                            //    l = 0;
                            //    vs = 0;
                            //    mesh = mesh = { vertices: [], materials: [], triangles: [] };
                            //    meshes.push(mesh);
                            //}
                            mesh.vertices.push(p1, p2, p3, p4);
                            if (f > 0) {
                                mesh.triangles.push([vs + 0, vs + 2, vs + 1], [vs + 2, vs + 3, vs + 1]);
                                mesh.materials.push(f, f, f, f);
                            } else {
                                mesh.triangles.push([vs + 0, vs + 1, vs + 2], [vs + 2, vs + 1, vs + 3]);
                                mesh.materials.push(-f, -f, -f, -f);
                            }
                            vs += 4;
                        }
                    }
                    p += stride;
                }
                var t = a; a = b; b = t;
            }
        }

        if (vs == 0) meshes.pop();
        return meshes.map(attrs => this.meshCreate(attrs, [x, y, z]));
    }

    getMeshes() {
        this.genMesh(-1);
        return [].concat(...Object.values(this.meshMap));
    }

    clearMesh() {
        for (let meshes of Object.values(this.meshMap)) {
            for (let mesh of meshes) {
                this.meshDispose(mesh);
            }
        }
        this.meshMap = {};
        this.pendingMeshMap = {};
    }

    /**
     * TODO: timeslice
     * @param {number} n
     */
    genMesh(n) {
        for (let [key, params] of Object.entries(this.pendingMeshMap)) {
            if (n >= 0 && --n < 0) {
                break;
            }
            delete this.pendingMeshMap[key];
            this.meshMap[key] = this.makeSubMesh.apply(this, params);
        }
    }

    meshCreate(attrs, origin) {
        return attrs;
    }

    meshDispose(mesh) {
    }

    dispose() {
        this.clearMesh();
    }
}

class VoxelWrapper {
    /**
     * @param {MessagePort} port 
     */
    constructor(port) {
        /** @type {Voxel} */
        this.voxel = null;
        this.port = port;
        port.addEventListener = port.addEventListener || port.addListener;
        port.addEventListener('message', this.onMessage);
    }
    onMessage(ev) {
        let message = ev.data;
        console.log("msg %o", message);
        if (message.action == 'init') {
            this.voxel = new Voxel(message.data[0], message.data[1]);
        } else if (message.action == 'call') {
            this.voxel[message.func].sphere.apply(this.voxel, message.data);
        }
        if (message.rid) {
            this.port.postMessage({ action: 'ack', rid: message.rid })
        }
    }
}


class VoxelProxy {
    /**
     * @param {MessagePort} port 
     */
    constructor(port) {
        this.port = port;
        port.addEventListener = port.addEventListener || port.addListener;
        port.addEventListener('message', this.onMessage);
    }
    init(level, meshLevel) {
        this.port.postMessage({ action: 'init', data: [level, meshLevel] });
    }
    onMessage(ev) {
        console.log("msg %o", ev.data);
    }

    sphere(cx, cy, cz, r, v) {
        this.port.postMessage({ action: 'call', func: 'sphere', data: [cx, cy, cz, r, v] });
    }


    box(x1, y1, z1, w, h, d, v) {
        this.port.postMessage({ action: 'call', func: 'box', data: [x1, y1, z1, w, h, d, v] });
    }

    cube(cx, cy, cz, size, v) {
        var x1 = cx - size / 2;
        var y1 = cy - size / 2;
        var z1 = cz - size / 2;
        return this.box(x1, y1, z1, size, size, size, v);
    }

    dispose() {
        this.port.close();
    }
}


function workerMain_NodeJs() {
    const { parentPort } = require('worker_threads');
    console.log("worker: start");
    new VoxelWrapper(parentPort);
}

function workerBlob() {
    let main = workerMain_NodeJs;
    return [
        OctreeNode,
        Voxel,
        VoxelProxy,
        Vector3,
        '(' + main.toString() + ')();'
    ].map(o => o.toString()).join(' ');
}


// TODO
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OctreeNode, Voxel, VoxelProxy, workerBlob };
    const { parentPort } = require('worker_threads');
    if (parentPort) {
        console.log("worker: start");
        new VoxelWrapper(parentPort);
    }
}
