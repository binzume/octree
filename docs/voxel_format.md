# Voxel data format

## File format

File header(16 bytes) + Schema(json) + Data(binary).

| Name    | Size     | Description |
| ------- | -------- | ----------- |
| magic   |  4 bytes | "VOXF" |
| version | uint32 | 1 |
| size    | uint32     | File size |
| reserved |  uint32 | 0 |
| schema | - | Schema |
| data   | - | Tree data |

- little endian


## Schema(json)

| Name    | Size       | Description |
| ------- | ---------- | ----------- |
| size    | uint32     | schemaSize |
| format  |  4 bytes   | "JSON"      |
| json    | schemaSize | json data: "{...}" |

### Example schema

```js
{
 location: [level,x,y,z], // optional
 max_child_count: 8, // optional, default:8
 max_depth: 10,  // optional
 data_encoding: "compact", // compact | json
 node_desc_size: 4,
 node_data_schema: [],
 node_count: 123,
 leaf_data_schema: ["float", "float", "float"],
 leaf_count: 1234,
 external_refs: ["URI"],
}
```

## Tree Data(compact)

| Name    | Size       | Description |
| ------- | ---------- | ----------- |
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
| childTypes | 16 bits | 0: empty, 1: node, 2: leaf, 3: undefined(for patch data) |

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
