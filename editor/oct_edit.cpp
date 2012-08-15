/**
 *  octree editor
 *
 * @author binzume ( http://www.binzume.net/ )
 */


#include <iostream>
#include <vector>
#include "../cppfl/all.h"
#define NOGLUT
#include "../cppfl/opengl.h"
#include <math.h>
#define PI 3.14159265358979

#include "gloctree.h"

using namespace std;

static const int TREE_DEPTH = 5;
static const long OBJ_SIZE = 1 << TREE_DEPTH;


// ‰ñ“]—p
double rot=0 , x_rot=0;
int kf=1;
GLOctree octree(TREE_DEPTH,1);
int z=0;
int fg_color = 1;

Form form("ToFu Editor",800,600);
DIBitmap bmp1(32*8,32*8);
vector<int> tmpbuf;
int draw_mode = 0;


void OnDraw()
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glLoadIdentity();
    glRotated(90.0, 1.0, 0.0, 0.0); // ‰ñ‚·

    glRotated(x_rot, 1.0, 0.0, 0.0); // ‰ñ‚·

    glRotated(rot, 0.0, 0.0, 1.0); // ‰ñ‚·
    octree.draw();

}

bool change_depth(int zz)
{
	z=zz;
    bmp1.clear(Color::white);
    DCPen *p = bmp1.dcpen();
    for (int x=0;x<octree.size();x++) {
        for (int y=0;y<octree.size();y++) {
            int v = octree.getValue(x,y,z);
            if (v>0) {
                p->color(Color::silver);
            } else {
                p->color(Color::black);
            }
            p->boxf(x*8,y*8,7,7);
        }
    }

    p->release();
    form.update();
    return true;
}



int rot_changed(Event &e)
{
    //cout << "pos(): " << ((Slider*)e.target)->pos() << endl;
    x_rot = ((Slider*)e.target)->pos() * 90.0 /128;
    return true;
}


int z_changed(Event &e)
{
    int zz = octree.size()-((Slider*)e.target)->pos()-1;
    change_depth(zz);
    return true;
}


bool pic1_click(Event &e)
{
    int x = LOWORD(e.lParam) -416;
    int y = HIWORD(e.lParam) -4;
    if (x>=0 && y>=0) {
        x/=8;
        y/=8;

        if (x>31+2) {
            fg_color = 0;
            if (y>16) fg_color=1;
            cout << fg_color << endl;
        }

    }

    return true;
}

bool onMenu(Event &e)
{
	if (e.id==109) {
		Application.exit(0);
	} else {
		msgBox(STR "MENU: "+e.id);
	}
	return true;
}

bool onMenuExit(Event &e)
{
	Application.exit(0);
	return true;
}


bool on_save(Event &e)
{
    vector<char> buf;
    octree.serialize(buf);
    File::save("data/test.octree",buf);
    return true;
}

bool on_load(Event &e)
{
    vector<char> buf;
    File::load("data/test.octree",buf);
    octree.unserialize(buf);
    octree.make_vartex();
    change_depth(z);
    return true;
}

bool on_copy(Event &e)
{
    int sz=octree.size();
    tmpbuf.resize(sz*sz);
    for (int i=0;i<sz*sz;i++)
        tmpbuf[i] = octree.getValue(i%sz,i/sz,z);
    return true;
}

bool on_paste(Event &e)
{
    int sz=octree.size();
    for (int i=0;i<tmpbuf.size();i++)
        octree.setValue(i%sz,i/sz,z,tmpbuf[i]);
    octree.make_vartex();
    change_depth(z);
    return true;
}

bool on_rotate_z(Event &e)
{
    octree.rotate_z();
    octree.make_vartex();
    change_depth(z);
    return true;
}


int main(){
    const int width = 400;
    const int height = 300;


    DIBitmap bmp0(width,height);
    PictureBox pic0(bmp0);
    form.add(pic0,4,4);

    PictureBox pic1(bmp1);
    form.onClick(pic1_click);
    form.add(pic1,width+16,4);

    Slider sld_rot(form,Slider::VERTICAL);
    sld_rot.range(-128,127);
    sld_rot.onChange(rot_changed);
    sld_rot.pos(-40);
    form.add(sld_rot);

    Slider sld_z(form,Slider::VERTICAL);
    sld_z.range(0,OBJ_SIZE-1);
    sld_z.pos(0);
    sld_z.onChange(z_changed);
    form.add(sld_z);

    CheckBox rot_chekbox(form,"rotation");
    form.add(rot_chekbox,20,300);
    rot_chekbox.check(true);


    Button mode_pen_button("Y",
        [](Event &e) -> bool {
            draw_mode = 0;
            return true;
        });
    mode_pen_button.size(24,24);
    form.add(mode_pen_button,500,280);

    Button mode_line_button("^",
        [](Event &e) -> bool {
            draw_mode = 1;
            return true;
        });
    mode_line_button.size(24,24);
    form.add(mode_line_button);

    Button mode_box_button("¡",
        [](Event &e) -> bool {
            draw_mode = 2;
            return true;
        });
    mode_box_button.size(24,24);
    form.add(mode_box_button);

    Button mode_circle_button("œ",
        [](Event &e) -> bool {
            draw_mode = 3;
            return true;
        });
    mode_circle_button.size(24,24);
    form.add(mode_circle_button);
    


	MenuHandler menuhandler;

	MenuItem mi1("test",menuhandler.add(onMenu));
	mi1.checked(true);
	mi1.defaultItem(true);
	MenuItem mi2("&Help",menuhandler.add(onMenu));
	
	form.menu(MainMenu(&menuhandler)
		.add("&File",Menu(&menuhandler)
			.add("Open",on_load)
			.add("Save",on_save)
			.add(mi1)
			.add(MenuItem("-"))
			.add("Exit",menuhandler.add(onMenuExit))
		)
		.add("&Edit",Menu(&menuhandler)
			.add("&Copy",on_copy)
			.add("Cu&t",on_copy)
			.add("&Paste",on_paste)
			.add(MenuItem("-"))
			.add("&Rotate",on_rotate_z)
		)
		.add(mi2)
	);

    form.show();

    DIBitmap gldib(width,height);
    
    OpenGL gl;
    if (!gl.init(gldib.getdc())){
        cerr << "ERROR: glInit()" << endl;
    }

    // OpenGL‰Šú‰»
    GLfloat light_position[] = {10.0, -10.0, 10.0, 0.0};
    GLfloat light_diffuse[] = {1.0, 1.0, 1.0, 1.0};

    glClearColor(0.0, 1.0, 1.0, 0.0);

    glLightfv(GL_LIGHT0, GL_DIFFUSE, light_diffuse);
    glLightfv(GL_LIGHT0, GL_POSITION, light_position);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);

    glColorMaterial(GL_FRONT, GL_DIFFUSE);
    glEnable(GL_COLOR_MATERIAL);

    glEnable(GL_DEPTH_TEST);

    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);

    // glPolygonMode( GL_FRONT_AND_BACK, GL_LINE );

    int w = gldib.width, h = gldib.height;
    glViewport(0, 0, (GLsizei)w,(GLsizei)h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glFrustum(-0.5, 0.5, -0.5*h/w, 0.5*h/w,0.5,20.0);
    glTranslated(-0.0,0.0,-4.0);

    glMatrixMode(GL_MODELVIEW);

    octree.scrapeSphere(0,0,0,20);
    octree.make_vartex();

    bool drawing = false;
    Point pos1;
    
    change_depth(0);

    while(form.isexist()) {
        wait(10);
        OnDraw();
        gl.draw();
        gldib.drawto(bmp0);
        pic0.update();
        if (rot_chekbox.check())
	        rot+=1.0;
        
        if (System::keydown(VK_LBUTTON)) {
            Point m = pic1.cursorPos();
            if (m.x>=0 && m.y>=0 && m.y<bmp1.height && m.x<bmp1.width) {
                int x = m.x * OBJ_SIZE / bmp1.width;
                int y = m.y * OBJ_SIZE / bmp1.height;
                if (!drawing) {
                    pos1 = Point(x,y);
                    drawing = true;
                }
                if (draw_mode==0 && octree.getValue(x,y,z) != fg_color) {
                    int v=fg_color;
                    octree.setValue(x,y,z,v);
                    cout << "click " << x << "," << y << "," << z<< endl;
            
                    DCPen *p = bmp1.dcpen();
                    if (v>0) {
                        p->color(Color::silver);
                    } else {
                        p->color(Color::black);
                    }
                    p->boxf(x*8,y*8,7,7);
                    p->release();
                    pic1.update();
                    octree.make_vartex();
                }
            }
        } else {
            if (drawing) {
                Point m = pic1.cursorPos();
                int x1 = m.x/8;
                int y1 = m.y/8;
                if (draw_mode==2) {
                    int x,y;
                    for (y = pos1.y;y<=y1;y++) {
                        for (x = pos1.x;x<=x1;x++) {
                            octree.setValue(x,y,z,fg_color);
                        }
                    }
                    pic1.update();
                    octree.make_vartex();
				    change_depth(z);
                }
                drawing=false;
            }
        }
        
//  cout << sld_rot.pos() << endl;
    }

    //wait(form);
    return 0;
}
