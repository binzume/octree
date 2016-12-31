"use strict";

function OctreeNode(depth, value) {
	this.value = value;
	this.children = null;
	this.depth = depth;
	this.size = 1 << depth;
}

OctreeNode.prototype.makeChildren = function () {
	if (this.children != null) return;
	var c = new Array(8);
	this.children = c;
	for (var i = 0; i < 8; i++) {
		c[i] = new OctreeNode(this.depth - 1, this.value);
	}
	return this;
}

OctreeNode.prototype.get = function (x, y, z) {
	if (this.children == null) return this.value;
	var d = this.depth - 1;
	var n = ((x >> d) & 1) + ((y >> d) & 1) * 2 + ((z >> d) & 1) * 4;
	return this.children[n].get(x, y, z);
}

OctreeNode.prototype.set = function (x, y, z, v) {
	var d = this.depth - 1;
	if (d < 0) {
		this.value = v;
		return true; // changed.
	}
	if (this.children == null) {
		if (this.value == v) return false;
		this.makeChildren();
	}

	var n = ((x >> d) & 1) + ((y >> d) & 1) * 2 + ((z >> d) & 1) * 4;
	if (!this.children[n].set(x, y, z, v)) return false;
	for (var i = 0; i < 8; i++) {
		if (this.children[i].children != null || this.children[i].value != v) return false;
	}
	this.value = v;
	this.children = null;
	return true; // changed.
}

OctreeNode.prototype.toArray = function () {
	if (this.children == null) return this.value;
	var v = [];
	for (var i = 0; i < 8; i++) {
		v.push(this.children[i].toArray());
	}
	return v;
}

OctreeNode.prototype.rotate = function (ax) {
	// ax : X:0 y:1 z:2
	if (this.children == null) return;
	var d = 1 << ax;
	var dd = [[0, 2, 6, 4], [0, 1, 5, 4], [0, 1, 3, 2]][ax];
	for (var i = 0; i < 2; i++) {
		var t1 = this.children[i * d];
		this.children[i * d + dd[0]] = this.children[i * d + dd[1]];
		this.children[i * d + dd[1]] = this.children[i * d + dd[2]];
		this.children[i * d + dd[2]] = this.children[i * d + dd[3]];
		this.children[i * d + dd[3]] = t1;
	}
	for (var i = 0; i < 8; i++) {
		this.children[i].rotate(ax);
	}
}

OctreeNode.prototype.applyFunc = function (f, x, y, z, v) {
	if (this.children == null && this.value == v) {
		return false;
	}
	var r = f(x, y, z, 1 << this.depth);
	if (r == 1) { // all
		this.value = v;
		this.children = null;
		return true;
	} else if (r == 2 && this.depth > 0) { // partial
		this.makeChildren();
		var sz = 1 << (this.depth - 1);
		var cf = false;
		for (var i = 0; i < 8; i++) {
			cf |= this.children[i].applyFunc(f, x + sz * (i & 1), y + sz * ((i >> 1) & 1), z + sz * ((i >> 2) & 1), v);
		}
		if (!cf) return false;
		for (var i = 0; i < 8; i++) {
			if (this.children[i].children != null || this.children[i].value != v) return true;
		}
		this.value = v;
		this.children = null;
		return true;
	}
	return false;
}

OctreeNode.prototype.slice = function (buf, p, stride, d, ax) {
	var size = 1 << this.depth;
	if (this.children == null) {
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

OctreeNode.prototype.slice2 = function (buf, p, stride, x, y, z, n, ax) {
	if (n == this.depth) {
		this.slice(buf, p, stride, [x, y, z][ax], ax);
		return;
	}
	if (this.children == null) {
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

function Voxel(depth) {
	this.scale = 1.0 / (1 << depth);
	this.tree = new OctreeNode(depth, 0);
	this.colors = [[], [0.2, 0.2, 0.2, 1], [1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]];
	this.meshCashe = [];
}

Voxel.prototype.clear = function () {
	this.tree = new OctreeNode(this.tree.depth, 0);
	this.meshCashe = [];
}

Voxel.prototype.size = function () {
	return 1 << this.tree.depth;
}

Voxel.prototype.applyFunc = function (f, v) {
	var ret = this.tree.applyFunc(f, 0, 0, 0, v);
	if (ret) {
		// invalidate cache.
		var d = 5;
		var n = 1 << (this.tree.depth - d);
		for (var z = 0; z < n; z++) {
			for (var y = 0; y < n; y++) {
				for (var x = 0; x < n; x++) {
					var t = x + n * y + n * n * z;
					if (f(x * (1 << d) - 1, y * (1 << d) - 1, z * (1 << d) - 1, (1 << d) + 2) != 0) {
						this.meshCashe[t] = null;
					}
				}
			}
		}
	}
	return ret;
}

Voxel.prototype.sphere = function (cx, cy, cz, r, v) {
	var rr = r * r;
	return this.applyFunc(function (x, y, z, sz) {
		var dx = Math.max(x, Math.min(cx, x + sz)) - cx;
		var dy = Math.max(y, Math.min(cy, y + sz)) - cy;
		var dz = Math.max(z, Math.min(cz, z + sz)) - cz;
		var dmin = dx * dx + dy * dy + dz * dz;
		if (dmin >= rr) {
			return 0;
		}
		if (sz == 1) {
			return 1;
		}
		var n = 0;
		for (var i = 0; i < 8; i++) {
			var px = x - cx + (sz * (i & 1));
			var py = y - cy + (sz * ((i >> 1) & 1));
			var pz = z - cz + (sz * ((i >> 2) & 1));
			if (px * px + py * py + pz * pz < rr) {
				n++;
			}
		}
		return n == 8 ? 1 : 2;
	}, v);
}

Voxel.prototype.box = function (x1, y1, z1, w, h, d, v) {
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

Voxel.prototype.cube = function (cx, cy, cz, size, v) {
	var x1 = cx - size / 2;
	var y1 = cy - size / 2;
	var z1 = cz - size / 2;
	return this.box(x1, y1, z1, size, size, size, v);
}

Voxel.prototype.slice = function (h, ax, a, p, stride) {
	//if (!a) a = new Array(size*size);
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

Voxel.prototype.slice2 = function (x, y, z, n, ax, buf, p, stride) {
	var tree = this.tree;
	var sz = 1 << tree.depth;
	var size = 1 << n;
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

Voxel.prototype._adjust_vart = function (v, a, b, p, stride, ax) {
	var ee = [-0.44, -0.335, -0.25, -0.11, 0.0, 0.11, 0.25, 0.33, 0.44];

	var n1, n2;
	var ff = [
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

	var scale = this.scale;
	if (ax == 0) {
		return [v[0] * scale, v[1] * scale, v[2] * scale];
	} else if (ax == 1) {
		return [v[2] * scale, v[0] * scale, v[1] * scale];
	} else {
		return [v[1] * scale, v[2] * scale, v[0] * scale];
	}
}

Voxel.prototype.get = function (x, y, z) {
	var size = this.size();
	if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
		return 0;
	}
	return this.tree.get(x, y, z);
}

Voxel.prototype.makeMesh = function () {
	var d = 5;
	var n = 1 << (this.tree.depth - d);
	var meshes = [];
	for (var z = 0; z < n; z++) {
		for (var y = 0; y < n; y++) {
			for (var x = 0; x < n; x++) {
				var t = x + n * y + n * n * z;
				if (this.meshCashe[t] == null) {
					this.meshCashe[t] = this.makeSubMesh(x * (1 << d), y * (1 << d), z * (1 << d), d);
				}
				meshes = meshes.concat(this.meshCashe[t]);
			}
		}
	}
	return meshes;
}

Voxel.prototype.makeSubMesh = function (x, y, z, depth) {
	var colors = this.colors;
	var meshOpt = { colors: true };
	var mesh = new GL.Mesh(meshOpt);
	var meshes = [mesh];
	var w = 1;
	var vs = 0;
	var size = 1 << depth;
	var stride = size + 2;
	var a = new Int32Array(stride * stride);
	var b = new Int32Array(stride * stride);
	for (var ax = 0; ax < 3; ax++) {
		if (ax == 0) {
			this.slice2(x - 1, y, z, depth, ax, a, 0, stride);
		} else if (ax == 1) {
			this.slice2(x, y - 1, z, depth, ax, a, 0, stride);
		} else if (ax == 2) {
			this.slice2(x, y, z - 1, depth, ax, a, 0, stride);
		}
		for (var k = 0; k <= size; k++) {
			var p = stride + 1;
			// b = this.slice(k, ax, b, p, stride);
			if (ax == 0) {
				b = this.slice2(x + k, y, z, depth, ax, b, 0, stride);
			} else if (ax == 1) {
				b = this.slice2(x, y + k, z, depth, ax, b, 0, stride);
			} else if (ax == 2) {
				b = this.slice2(x, y, z + k, depth, ax, b, 0, stride);
			}
			for (var j = 0; j < size; j++) {
				var v1, v2;
				var l = 0;
				for (var i = 0; i < size; i++) {
					var f = 0;
					if (a[p + i] == 0 || b[p + i] == 0) {
						f = b[p + i] - a[p + i];
					}
					if (f != 0) {
						var pp = p + i;
						var p1 = l == f ? mesh.vertices[vs - 3].slice(0) : this._adjust_vart([k, i, j], a, b, pp, stride, ax);
						var p2 = this._adjust_vart([k, i + w, j], a, b, pp + 1, stride, ax);
						var p3 = l == f ? mesh.vertices[vs - 1].slice(0) : this._adjust_vart([k, i, j + w], a, b, pp + stride, stride, ax);
						var p4 = this._adjust_vart([k, i + w, j + w], a, b, pp + stride + 1, stride, ax);
						var v1c = new GL.Vector(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]).unit();
						var v2c = new GL.Vector(p4[0] - p3[0], p4[1] - p3[1], p4[2] - p3[2]).unit();
						if (l == f && v1c.dot(v1) > 0.99 && v2c.dot(v2) > 0.99) {
							mesh.vertices[vs - 1] = p4;
							mesh.vertices[vs - 3] = p2;
						} else {
							v1 = v1c;
							v2 = v2c;
							l = f;
							if (vs > 65532) {
								// webgl without extension.
								l = 0;
								vs = 0;
								mesh = new GL.Mesh(meshOpt);
								meshes.push(mesh);
							}
							mesh.vertices.push(p1, p2, p3, p4);
							var color;
							if (f > 0) {
								mesh.triangles.push([vs + 0, vs + 2, vs + 1], [vs + 2, vs + 3, vs + 1]);
								color = colors[f];
							} else {
								mesh.triangles.push([vs + 0, vs + 1, vs + 2], [vs + 2, vs + 1, vs + 3]);
								color = colors[-f];
							}
							mesh.colors.push(color, color, color, color);
							vs += 4;
						}
					} else {
						l = 0;
					}
				}
				p += stride;
			}
			var t = a; a = b; b = t;
		}
	}

	if (vs == 0) meshes.pop();
	for (var i = 0; i < meshes.length; i++) {
		for (var v = 0; v < meshes[i].vertices.length; v++) {
			meshes[i].vertices[v][0] += x * this.scale;
			meshes[i].vertices[v][1] += y * this.scale;
			meshes[i].vertices[v][2] += z * this.scale;
		}
		meshes[i].computeNormals();
		meshes[i].compile();
		console.log("sz:" + size + " vs:" + meshes[i].vertices.length);
	}
	return meshes;
}

