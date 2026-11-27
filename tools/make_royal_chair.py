# Royal (maharaja palace) chair for Lakdi, modelled in Blender. 1 unit = the game's unit (~28 cm).
# Chair origin = floor, under the seat. Blender front = -Y (exports to glTF +Z, the way the game's seats face).
import bpy, bmesh, math, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
PREVIEW = sys.argv[sys.argv.index('--') + 2] if len(sys.argv) > sys.argv.index('--') + 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

def lin(h):
    r, g, b = ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

def material(name, color, metallic=0.0, rough=0.5, sheen=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(color)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.45
        b.inputs['Sheen Tint'].default_value = lin(0xc23a50)
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.2
    return m

WOOD = material('Mahogany', 0x2c140b, 0.0, 0.4, coat=0.7)
VELVET = material('MaroonVelvet', 0x6e0f1d, 0.0, 0.9, sheen=1.0)
GOLD = material('Gold', 0xd4a53c, 1.0, 0.28)

def finish(o, m, bevel=0.0, seg=3, subsurf=0):
    o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('Bevel', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'ANGLE'
    if subsurf:
        md = o.modifiers.new('Sub', 'SUBSURF'); md.levels = subsurf; md.render_levels = subsurf
    for p in o.data.polygons: p.use_smooth = True
    return o

def box(name, size, loc, m, bevel=0.03, seg=3, parent=None, subsurf=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    finish(o, m, bevel, seg, subsurf)
    if parent: o.parent = parent
    return o

def cyl(name, r, h, loc, m, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=24)
    o = bpy.context.object; o.name = name
    finish(o, m)
    if parent: o.parent = parent
    return o

def sphere(name, r, loc, m, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=14)
    o = bpy.context.object; o.name = name
    finish(o, m)
    if parent: o.parent = parent
    return o

def finial(name, r, loc, parent=None):
    s = sphere(name + '_ball', r, loc, GOLD, parent)
    bpy.ops.mesh.primitive_cone_add(radius1=r * 0.5, radius2=0, depth=r * 2.2, location=(loc[0], loc[1], loc[2] + r * 1.6), vertices=20)
    c = bpy.context.object; c.name = name + '_spire'
    finish(c, GOLD)
    if parent: c.parent = parent

LEG = [(0.55, 0), (1, 0.03), (0.7, 0.07), (0.45, 0.13), (0.45, 0.42), (0.85, 0.47), (0.5, 0.53),
       (0.5, 0.8), (0.78, 0.86), (0.55, 0.92), (0.62, 1)]

def turned(name, h, r, loc, m):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = [(0, 0)] + [(x * r, y * h) for x, y in LEG] + [(0, h)]
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), dvec=(0, 0, 0), angle=math.tau, steps=28)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    finish(o, m)
    return o

def arc(name, R, tube, loc, m, parent):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); n = 40
    sp.points.add(n)
    for i in range(n + 1):
        a = math.pi * i / n
        sp.points[i].co = (R * math.cos(a), 0, R * math.sin(a), 1)
    cu.bevel_depth = tube; cu.bevel_resolution = 4; cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.location = loc; o.parent = parent
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    finish(o, m)
    return o

# ---- measurements (floor y=0; seat centre at (0, 0.15, 1.725)) ----
SEAT_Z, SEAT_Y = 1.725, 0.15
LEGS = [(-0.52, -0.32), (0.52, -0.32), (-0.52, 0.66), (0.52, 0.66)]  # blender (x, y): front pair, back pair
for i, (x, y) in enumerate(LEGS):
    turned(f'Leg{i}', 1.65, 0.095, (x, y, 0), GOLD)

box('SeatFrame', (1.25, 1.15, 0.16), (0, SEAT_Y, SEAT_Z), WOOD, 0.05)
box('SeatPad', (1.15, 1.05, 0.2), (0, SEAT_Y, SEAT_Z + 0.16), VELVET, 0.09, 5)
box('SeatPiping', (1.27, 1.17, 0.04), (0, SEAT_Y, SEAT_Z + 0.07), GOLD, 0.015, 2)
box('FrontApron', (1.1, 0.06, 0.16), (0, SEAT_Y - 0.5, SEAT_Z - 0.16), WOOD, 0.02, 2)
box('FrontApronTrim', (1.12, 0.07, 0.04), (0, SEAT_Y - 0.5, SEAT_Z - 0.25), GOLD, 0.01, 2)
# stretchers
for x in (-0.52, 0.52):
    cyl(f'SideStretcher{x}', 0.03, 0.98, (x, 0.17, 0.55), WOOD, rot=(math.pi / 2, 0, 0))
cyl('BackStretcher', 0.03, 1.04, (0, 0.66, 0.55), WOOD, rot=(0, math.pi / 2, 0))

# ---- tall back, leaning back a little (all parts hang off a pivot at the back's centre) ----
pivot = bpy.data.objects.new('BackPivot', None)
bpy.context.collection.objects.link(pivot)
pivot.location = (0, 0.78, 2.725); pivot.rotation_euler = (-0.1, 0, 0)
box('BackFrame', (1.25, 0.14, 2.0), (0, 0, 0), WOOD, 0.06, 3, pivot)
box('BackPanel', (1.0, 0.1, 1.5), (0, -0.08, 0.05), VELVET, 0.07, 5, pivot)
box('TopRail', (1.35, 0.22, 0.14), (0, 0, 1.02), GOLD, 0.03, 3, pivot)
arc('CrestOuter', 0.52, 0.055, (0, 0, 1.07), GOLD, pivot)
arc('CrestInner', 0.36, 0.036, (0, 0, 1.07), GOLD, pivot)
finial('TopFinial', 0.09, (0, 0, 1.68), pivot)
cyl('CrestMedallion', 0.15, 0.05, (0, -0.02, 1.2), GOLD, rot=(math.pi / 2, 0, 0), parent=pivot)
sphere('CrestJewel', 0.07, (0, -0.07, 1.2), VELVET, pivot)
for sx in (-1, 1):
    finial(f'CornerFinial{sx}', 0.07, (sx * 0.64, 0, 1.06), pivot)
    box(f'SideTrim{sx}', (0.07, 0.07, 1.9), (sx * 0.63, -0.04, 0), GOLD, 0.01, 2, pivot)
# diamond-tufted gold buttons
for j, z in enumerate((0.55, 0.2, -0.15, -0.5)):
    for x in ((-0.3, 0.3) if j % 2 == 0 else (-0.5, 0, 0.5)):
        sphere(f'Button{j}_{x}', 0.03, (x, -0.135, z), GOLD, pivot)

# ---- export ----
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT')
print('exported', OUT)

# ---- preview render ----
if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.device = 'CPU'
    sc.render.resolution_x = 900; sc.render.resolution_y = 900
    sc.cycles.use_denoising = False
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.04, 0.04, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    fl = bpy.context.object; fl.data.materials.append(material('Floor', 0x2a2420, 0, 0.8))
    def light(loc, e, size, col=(1, 0.88, 0.7)):
        bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object
        l.data.energy = e; l.data.size = size; l.data.color = col
        d = Vector((0, 0.3, 2.0)) - Vector(loc)
        l.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    light((-3.5, -4, 6), 900, 4); light((4, 3, 5), 450, 3, (0.8, 0.85, 1)); light((0, 5, 4), 400, 3)
    bpy.ops.object.camera_add(location=(4.2, -5.6, 4.6)); cam = bpy.context.object
    cam.rotation_euler = (Vector((0, 0.3, 2.1)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 55; sc.camera = cam
    sc.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print('rendered', PREVIEW)
