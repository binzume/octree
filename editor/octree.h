#ifndef _OCTREE_H
#define _OCTREE_H

#include <vector>
#include "octree_node.h"

template<typename V>
class Octree{
protected:
    OctreeNode<V> element;
    const int depth;
    int esize;
    
public:
    Octree(int d = 5, V v = V()) : depth(d), esize( 1 << d ) {
        element.value = v;
    }

    int size(){
        return esize;
    }

    void setValue(long x, long y, long z, V v){
    	int size = 1 << depth;
        if (x<0 || x>=size || y<0 || y>=size || z<0 || z>=size) return;

        element.setValue(x << (MAX_DEPTH - depth) , y << (MAX_DEPTH - depth), z << (MAX_DEPTH - depth), depth, v);
    }

    V getValue(long x, long y, long z) {
    	int size = 1 << depth;
        if (x<0 || x>=size || y<0 || y>=size || z<0 || z>=size) return -1;

        return element.getValue(x << (MAX_DEPTH - depth) , y << (MAX_DEPTH - depth), z << (MAX_DEPTH - depth), depth);
    }

	void rotate_z(){
		element.rotate_z();
	}


    void scrapeSphere(int x,int y,int z,int r) {
        int xx,yy,zz;
        for (zz=0;zz<r;zz++) {
            for (yy=0;yy<r;yy++) {
                for (xx=0;xx<r;xx++) {
                    if (xx*xx+yy*yy+zz*zz<r*r) {
                        setValue(x+xx,y+yy,z+zz,0);
                        setValue(x-xx,y+yy,z+zz,0);
                        setValue(x+xx,y-yy,z+zz,0);
                        setValue(x-xx,y-yy,z+zz,0);
                        setValue(x+xx,y+yy,z-zz,0);
                        setValue(x-xx,y+yy,z-zz,0);
                        setValue(x+xx,y-yy,z-zz,0);
                        setValue(x-xx,y-yy,z-zz,0);
                    }
                }
            }
        }
    }

    void serialize(std::vector<char> &buf) {
        buf.clear();
        buf.push_back(esize);
        element.serialize(buf);
    }

    void unserialize(const std::vector<char> &buf) {
        int p=0;
        esize = buf[0];
        p++;
        element.unserialize(buf,p);
    }

    void get_slicez(V slice[],int p){
    	int sz=size();
	    for (int x=0;x<sz;x++) {
	        for (int y=0;y<sz;y++) {
	            slice[x+y*sz] = getValue(x,y,p);
	        }
	    }
    }


    void get_slicex(V slice[],int p){
    	int sz=size();
	    for (int x=0;x<sz;x++) {
	        for (int y=0;y<sz;y++) {
	            slice[x+y*sz] = getValue(p,x,y);
	        }
	    }
    }

    void get_slicey(V slice[],int p){
    	int sz=size();
	    for (int x=0;x<sz;x++) {
	        for (int y=0;y<sz;y++) {
	            slice[x+y*sz] = getValue(y,p,x);
	        }
	    }
    }

};

#endif
