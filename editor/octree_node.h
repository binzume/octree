#ifndef _OCTREE_NODE_H
#define _OCTREE_NODE_H

#define _OCTREE_NODE_PARENT_REF 0

static const int MAX_DEPTH = 32;
static const long DEPTH_MASK = 1 << (MAX_DEPTH - 1);


// Octree
template <typename VTYPE>
class OctreeNode {
public:
    VTYPE value;
    OctreeNode *child;
#if _OCTREE_NODE_PARENT_REF != 0
    OctreeNode *parent;
#endif

    OctreeNode(VTYPE v) :  value(v), child(NULL){}
    OctreeNode() : child(NULL) {}
    ~OctreeNode() {
        if (child) delete [] child;
    }

    void makeChildNodes(){
        child = new OctreeNode[8];
        for (int i=0;i<8;i++) {
            child[i].value = value;
#if _OCTREE_NODE_PARENT_REF != 0
            parent = this;
#endif
        }
    }
    
    inline const VTYPE& getValue() const {
        return value;
    }

    inline bool hasChild() const {
        return child != NULL;
    }
    

    inline VTYPE getValue(long x,long y,long z, long depth) const{
        if (child == NULL || depth == 0) return value;
        int i=0;
        if (x&DEPTH_MASK) {i|=1;}
        if (y&DEPTH_MASK) {i|=2;}
        if (z&DEPTH_MASK) {i|=4;}
        
        return child[i].getValue(x<<1, y<<1, z<<1, depth-1);
    }

    inline const OctreeNode& getNode(long x,long y,long z, long depth) const{
        if (child == NULL || depth == 0) return *this;
        int i=0;
        if (x&DEPTH_MASK) {i|=1;}
        if (y&DEPTH_MASK) {i|=2;}
        if (z&DEPTH_MASK) {i|=4;}
        
        return child[i].getNode(x<<1, y<<1, z<<1, depth-1);
    }

    void setValue(long x,long y,long z, long depth, VTYPE v){
        if (depth == 0) {
            value = v;
            return;
        }
        if (child == NULL) {
            if (value == v) return;
            makeChildNodes();
        }

        int i=0;
        if (x&DEPTH_MASK) {i|=1;}
        if (y&DEPTH_MASK) {i|=2;}
        if (z&DEPTH_MASK) {i|=4;}

        child[i].setValue(x<<1, y<<1, z<<1, depth-1, v);

        for (i=0;i<8;i++) {
            if (child[i].child!=NULL || child[i].value != v) return;
        }
        delete [] child;
        child = NULL;
        value = v;
        //Log.d("Octree","marge! "+x+","+y+","+z+" v:"+v+" s:"+size);
    }
    

    void serialize(std::vector<char> &buf) const {
        if (child == NULL) {
            buf.push_back(0);
            buf.push_back(value);
        } else {
            buf.push_back(1);
            for (int i=0;i<8;i++) {
                child[i].serialize(buf);
            }
        }
    }
    void unserialize(const std::vector<char> &buf,int &p) {
        delete [] child;
        child = NULL;
        if (buf[p]==0) {
            p++;
            value=buf[p++];
        } else {
            p++;
            makeChildNodes();
            for (int i=0;i<8;i++) {
                child[i].unserialize(buf,p);
            }
        }
    }
    
    void rotate_z(){
    	if (child==NULL) return;
		for (int i=0;i<2;i++) {
			OctreeNode t1 = child[i*4];
			child[i*4]=child[i*4+1];
			child[i*4+1]=child[i*4+3];
			child[i*4+3]=child[i*4+2];
			child[i*4+2]=t1;
			t1.child=NULL;
		}

        for (int i=0;i<8;i++) {
            child[i].rotate_z();
        }
    }

};

#endif
