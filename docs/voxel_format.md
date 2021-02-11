# Voxel data format[DRAFT]

Compact & JavaScript friendly voxel format.

- glTF like

## File format

File header(16 bytes) + Schema(json) + Data(binary).

| Name    | Size     | Description |
| ------- | -------- | ----------- |
| magic   |  4 bytes | "VOXF"    |
| version | uint32   | 1         |
| size    | uint32   | File size |
| schema  | -        | Schema    |
| data    | -        | Tree data |

- uint32: little endian


## Schema(json)

| Name    | Size       | Description |
| ------- | ---------- | ----------- |
| size    | uint32     | schemaSize |
| format  |  4 bytes   | "JSON"      |
| json    | schemaSize | json data: "{...}" |

### Example schema

```js
{
  maxDepth: 10,  // optional
  buffers: [
      {byteLength: 4096, uri:""}
  ],
  accessors: [
    {buffer:0, byteOffset: 0, componentType:"ui32", count: 128, type: "SCALAR", name: "nodeDesc" },
    {buffer:0, byteOffset: 512, componentType:"f32", count: 1234, type: "VEC3", name: "nodeData1" },
  ],
  primitives: [
      {}, // empty
      {attributes:{"COLOR": 1}},  // accessors[1]
  ],
  trees: [{
    location: {}, // optional
    branchingFactor: 8, // 8:octree
    nodeDesc: {type:0, accessor:0}, // Array of NodeDesc
    primitive: 0, // no data
    leafNodePrimitive: 1, // optional
  }],
  externalRefs: ["URI"] // optional
}
```

## Tree Data(compact)

| Name    | Size       | Description |
| ------- | ---------- | ----------- |
| size    | uint32     | schemaSize |
| format  |  4 bytes   | "BIN"      |
| nodes         | nodeDescSize * nodeCount | Array of NodeDesc |
| nodeDataArray | sizeof(node_data) * nodeCount | Array of NodeData |
| leafDataArray | sizeof(leaf_data) * leafCount | Array of LeafData |

### NodeDesc

octree: 4 bytes / node

Nomal node:

| Name    | Size       | Description |
| ------- | ---------- | ----------- |
| nodeType   | uint8 | 1: normal node |
| dataType   | uint8 | 0: reserved |
| childTypes | 16 bits | 0: empty, 1: node, 2: leafNode, 3: undefined(for patch data) |

```
Node[0] type:1
[1, 1, 1, 2, 0, 2]
 |  |  |  |     |
 |  |  |  |     +Node[2]
 |  |  |  Node[1]
 |  |  Leaf[2]
 |  Leaf[1]
 Leaf[0]

Node[1] type:1
[0, 0, 1, 2, 1, 2]
       |  |  |
       |  |  +Leaf[4]
       |  Node[3]
       Leaf[3]
```


Fill:

- nodeType: 2: fill node data
- childType: 8 bits
- level: 16 bits

maxChildCount ** level * nodeDataSize

External reference:

- nodeType: 4
- ref_id: 24 bits

nodeType:
- 0: Empty (internal use)
- 1: Normal
- 2: Fill
- 3: Fill_2
- 4: Ref
