
#include <vector>
#include "octree.h"


typedef long ValueType;


class GLOctree : public Octree<ValueType>{
    float element_size;
    int vart_num;
    
    std::vector<float> vart_array;
    std::vector<float> norm_array;

public:
    GLOctree(int d = 5, int v=0) : Octree(d,v) {
        element_size = 2.0f/esize;
    }

    void getPos(int* pos,float x,float y,float z) {
        pos[0] = (int)(x/element_size)+esize/2;
        pos[1] = (int)(y/element_size)+esize/2;
        pos[2] = (int)(z/element_size)+esize/2;
    }


    void adjust_vart(float *p, int x,int y, int z,int* ff, int offset){

        //int n = x+(offset%3) + (y+(offset/3)%3)*1024 + (z+(offset/9))*1024*1024;
        
        float e = element_size*0.11f;
        float ee[] ={-0.44f,-0.335f,-0.25f,-0.11f,0,0.11f,0.25f,0.33f,0.44f};
        int a,b;
        short d[] = {0,1,3,4, 9,10,12,13};
        for (int i=0;i<8;i++) {
            int dd = offset+d[i];
            if(ff[dd] <0) {
                ff[dd] = getValue(x+(dd%3), y+(dd/3)%3, z+(dd/9)%3)>0?1:0;
            }
        }
        
        p[0] = (x+(offset%3))*element_size+element_size*0.5f;
        p[1] = (y+(offset/3)%3)*element_size+element_size*0.5f;
        p[2] = (z+(offset/9))*element_size+element_size*0.5f;
        
        // x
        a=ff[offset+0] + ff[offset+3] + ff[offset+9] + ff[offset+12];
        b=ff[offset+1] + ff[offset+4] + ff[offset+10] + ff[offset+13];
        if (a>b) {
            p[0]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[0]-=ee[a+b]*element_size;
        }

        // y
        a=ff[offset+0] + ff[offset+1] + ff[offset+9] + ff[offset+10];
        b=ff[offset+3] + ff[offset+4] + ff[offset+12] + ff[offset+13];
        if (a>b) {
            p[1]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[1]-=ee[a+b]*element_size;
        }

        // z
        a=ff[offset+0] + ff[offset+1] + ff[offset+3] + ff[offset+4];
        b=ff[offset+9] + ff[offset+10] + ff[offset+12] + ff[offset+13];
        if (a>b) {
            p[2]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[2]-=ee[a+b]*element_size;
        }


    }




    void adjust_vart2(float *p, int x,int y, int z,int* ff, int offset){

        //int n = x+(offset%3) + (y+(offset/3)%3)*1024 + (z+(offset/9))*1024*1024;
        
        float e = element_size*0.11f;
        float ee[] ={-0.44f,-0.335f,-0.25f,-0.11f,0,0.11f,0.25f,0.33f,0.44f};
        int a,b;
        short d[] = {0,1,3,4, 9,10,12,13};

        
        p[0] = (x+(offset%3))*element_size+element_size*0.5f;
        p[1] = (y+(offset/3)%3)*element_size+element_size*0.5f;
        p[2] = (z+(offset/9))*element_size+element_size*0.5f;
        
        // x
        a=ff[offset+0] + ff[offset+3] + ff[offset+9] + ff[offset+12];
        b=ff[offset+1] + ff[offset+4] + ff[offset+10] + ff[offset+13];
        if (a>b) {
            p[0]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[0]-=ee[a+b]*element_size;
        }

        // y
        a=ff[offset+0] + ff[offset+1] + ff[offset+9] + ff[offset+10];
        b=ff[offset+3] + ff[offset+4] + ff[offset+12] + ff[offset+13];
        if (a>b) {
            p[1]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[1]-=ee[a+b]*element_size;
        }

        // z
        a=ff[offset+0] + ff[offset+1] + ff[offset+3] + ff[offset+4];
        b=ff[offset+9] + ff[offset+10] + ff[offset+12] + ff[offset+13];
        if (a>b) {
            p[2]+=ee[a+b]*element_size;
        } else if(a<b) {
            p[2]-=ee[a+b]*element_size;
        }


    }
    
    void norm(float *c,float* p1, float* p2,float* p3){
        c[0] = (p1[1]-p2[1])*(p3[2]-p2[2]) - (p1[2]-p2[2])*(p3[1]-p2[1]);
        c[1] = (p1[2]-p2[2])*(p3[0]-p2[0]) - (p1[0]-p2[0])*(p3[2]-p2[2]);
        c[2] = (p1[0]-p2[0])*(p3[1]-p2[1]) - (p1[1]-p2[1])*(p3[0]-p2[0]);
        float l = (float)sqrt(c[0]*c[0]+c[1]*c[1]+c[2]*c[2]);
        c[0]/=l;
        c[1]/=l;
        c[2]/=l;
    }

    void make_vartex(OctreeNode<ValueType> &elem,int x,int y,int z, int sz) {
        if (elem.hasChild()) {
            int half = sz>>1;
            for (int i=0;i<8;i++) {
                int dx=0,dy=0,dz=0;
                if ((i&1) != 0) dx = half;
                if ((i&2) != 0) dy = half;
                if ((i&4) != 0) dz = half;
                make_vartex(elem.child[i],x+dx,y+dy,z+dz,half);
            }
            return;
        }
        if (elem.value==0) return;

        float sq_vart[4][3];
        int ff[27];
        int vn[] = {0,1,2,3,2,1};
        int offset_array[][4] = {
                {0,1,3,4},
                {0,3,1,4},
                {0,3,9,12},
                {0,9,3,12},
                {0,9,1,10},
                {0,1,9,10},
        };

        for (int j=0;j<sz;j++) {
            for (int i=0;i<sz;i++) {
//                if (vart_num>149000) continue;
                // z+
                if (getValue(x+i, y+j, z+sz) <=0) {
                    //Log.d("Octree","draw "+x+","+y+","+z+" "+(x+i)+","+(y+j)+","+(z+sz));

                    int *offset = offset_array[0];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k], x+i-1,y+j-1,z+sz-1,ff,offset[k]);
                    }

                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }

                // z-
                if (getValue(x+i, y+j, z-1) <=0) {

                    int *offset = offset_array[1];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k], x+i-1,y+j-1,z-1,ff,offset[k]);
                    }

                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }
            
                // x+
                if (getValue(x+sz, y+i, z+j) <=0) {

                    int *offset = offset_array[2];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k], x+sz-1,y+i-1,z+j-1,ff,offset[k]);
                    }

                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }

                // x-
                if (getValue(x-1, y+i, z+j) <=0) {

                    int* offset = offset_array[3];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k], x-1,y+i-1,z+j-1,ff,offset[k]);
                    }

                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }
            
            
                // y+
                if (getValue(x+j, y+sz, z+i) <=0) {
                    //Log.d("Octree","draw "+x+","+y+","+z+" "+(x+i)+","+(y+j)+","+(z+sz));

                    int* offset = offset_array[4];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k], x+j-1,y+sz-1,z+i-1,ff,offset[k]);
                    }
                    
                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }

                // y-
                if (getValue(x+i, y-1, z+j) <=0) {

                    int* offset = offset_array[5];
                    for (int k=0;k<27;k++) {
                        ff[k]=-1;
                    }
                    for (int k=0;k<4;k++) {
                        adjust_vart(sq_vart[k],x+i-1,y-1,z+j-1,ff,offset[k]);
                    }

                    float n[3];
                    norm(n,sq_vart[2],sq_vart[1],sq_vart[0]);
                    for (int k=0;k<6;k++) {
                        vart_array.push_back(sq_vart[vn[k]][0]);
                        vart_array.push_back(sq_vart[vn[k]][1]);
                        vart_array.push_back(sq_vart[vn[k]][2]);
                        norm_array.push_back(n[0]);
                        norm_array.push_back(n[1]);
                        norm_array.push_back(n[2]);
                        vart_num++;
                    }
                }

            }
        }
        
    }

    long make_vartex(){
        vart_num = 0;
        vart_array.clear();
        norm_array.clear();
        make_vartex(element,0,0,0,esize);

        std::cout << "debug v:"<< vart_num << std::endl;

        return vart_num;
    }


    long make_vartex2(){
        vart_num = 0;
        vart_array.clear();
        norm_array.clear();
		int sz = esize;
		ValueType *a = new ValueType[sz*sz*2];
		
		for(int i=0;i<sz*sz*2;i++) a[i]=0;

		for (int n=0;n<sz;n++) {
			ValueType *slice0 = a+(n&1)*sz*sz;
			ValueType *slice1 = a+((n+1)&1)*sz*sz;
			get_slicex(slice1,n);
			for (int i=0;i<sz;i++) {
				for (int j=0;j<sz;j++) {
					
				}
			}
		}


		delete [] a;

        return vart_num;
    }




    void draw(){
        
        //頂点バッファ設定
        glEnableClientState(GL_VERTEX_ARRAY);
        glVertexPointer(3, GL_FLOAT, 0, &(vart_array[0]));

        //法線配列の指定
        glEnableClientState(GL_NORMAL_ARRAY);
        glNormalPointer(GL_FLOAT,0,&(norm_array[0]));
        
        //描画
        glPushMatrix();
            glTranslatef(-element_size*esize/2, -element_size*esize/2, -element_size*esize/2);
            glDrawArrays(GL_TRIANGLES, 0, vart_num);
        glPopMatrix();

        glDisableClientState(GL_VERTEX_ARRAY);
        glDisableClientState(GL_NORMAL_ARRAY);

    }


};
