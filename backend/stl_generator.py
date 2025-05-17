import trimesh # type: ignore
import numpy as np

def generate_stl_from_shapes(shapes, output_path):
    mesh_list = []

    for shape in shapes:
        if shape.get('type') == 'rectangle':
            width = shape.get('width', 1)
            height = shape.get('height', 1)
            x = shape.get('x', 0)
            y = shape.get('y', 0)
            depth = 5

            box = trimesh.creation.box(extents=(width, height, depth))
            box.apply_translation([x + width / 2, y + height / 2, depth / 2])
            mesh_list.append(box)

        elif shape.get('type') == 'circle':
            r = shape.get('r', 1)
            cx = shape.get('cx', 0)
            cy = shape.get('cy', 0)
            depth = 5

            cylinder = trimesh.creation.cylinder(radius=r, height=depth, sections=32)
            cylinder.apply_translation([cx, cy, depth / 2])
            mesh_list.append(cylinder)

    if not mesh_list:
        raise ValueError("No valid shapes found to generate STL.")

    combined = trimesh.util.concatenate(mesh_list)
    combined.export(output_path)