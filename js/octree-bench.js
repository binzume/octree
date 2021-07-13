const Benchmark = require('benchmark')
const { OctreeNode, Voxel } = require('./octree.js')

let suite = new Benchmark.Suite;

let size = 9;
let sharedVoxel = new Voxel(size, 5);
let sz = sharedVoxel.size() / 2;
sharedVoxel.sphere(sz / 2, sz / 2, sz / 2, sz / 2, 1);
sharedVoxel.makeMesh();

console.log(Object.keys(sharedVoxel.meshMap).length);
console.log(sharedVoxel.getMeshes().length);


suite
    .add('VOXEL:mesh', () => {
        sharedVoxel.clearMesh();
        sharedVoxel.makeMesh();
        sharedVoxel.genMesh(-1);
    })
    .add('VOXEL:mesh cached', () => {
        sharedVoxel.makeMesh();
        sharedVoxel.genMesh(-1);
    })
    .add('VOXEL:sphere', () => {
        let voxel = new Voxel(size);
        let sz = voxel.size();
        let r = 10;
        voxel.sphere(sz / 2, sz / 2, sz / 2, r, 1);
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ 'async': true });
