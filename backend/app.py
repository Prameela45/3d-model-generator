import os
import uuid
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from blueprint_parser import parse_blueprint
from stl import mesh  # type: ignore

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

# Configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
STL_FOLDER = os.path.join(os.getcwd(), 'generated_stls')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'stl'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STL_FOLDER, exist_ok=True)

# Dummy user store with roles
users = {
    'admin': {'password': 'admin123', 'role': 'admin'},
    'coreuser': {'password': 'core123', 'role': 'core'}
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_numpy_types(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    elif isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

def create_box(x, y, width, height, thickness):
    """Creates a 3D box with thickness as height in Z-axis."""
    z = 0
    vertices = np.array([
        [x, y, z], [x + width, y, z], [x + width, y + height, z], [x, y + height, z],
        [x, y, z + thickness], [x + width, y, z + thickness], [x + width, y + height, z + thickness], [x, y + height, z + thickness]
    ])
    faces = np.array([
        [0, 1, 2], [0, 2, 3],        # bottom
        [4, 7, 6], [4, 6, 5],        # top
        [0, 4, 5], [0, 5, 1],        # front
        [1, 5, 6], [1, 6, 2],        # right
        [2, 6, 7], [2, 7, 3],        # back
        [3, 7, 4], [3, 4, 0]         # left
    ])
    return vertices, faces

def shapes_to_stl(shapes, filename='output.stl'):
    meshes = []

    for shape in shapes:
        shape_type = shape.get('type')

        if shape_type in ['rectangle', 'wall', 'door', 'window']:
            x = shape.get('x', 0)
            y = shape.get('y', 0)
            width = shape.get('width', 10)
            height = shape.get('height', 10)
            thickness = 20 if shape_type == 'wall' else 10

            vertices, faces = create_box(x, y, width, height, thickness)
            data = np.zeros(len(faces), dtype=mesh.Mesh.dtype)
            for i, f in enumerate(faces):
                for j in range(3):
                    data['vectors'][i][j] = vertices[f[j], :]
            meshes.append(mesh.Mesh(data))

        elif shape_type == 'circle':
            r = shape.get('r', 10)
            cx = shape.get('cx', 0)
            cy = shape.get('cy', 0)
            segments = 32
            angle = 2 * np.pi / segments

            vertices = []
            for i in range(segments):
                theta = i * angle
                x = cx + r * np.cos(theta)
                y = cy + r * np.sin(theta)
                vertices.append([x, y, 0])
                vertices.append([x, y, 5])

            faces = []
            for i in range(segments):
                j = (i + 1) % segments
                faces.append([i * 2, j * 2, i * 2 + 1])
                faces.append([j * 2, j * 2 + 1, i * 2 + 1])

            v_arr = np.array(vertices)
            f_arr = np.array(faces)
            data = np.zeros(len(f_arr), dtype=mesh.Mesh.dtype)
            for i, f in enumerate(f_arr):
                for j in range(3):
                    data['vectors'][i][j] = v_arr[f[j], :]
            meshes.append(mesh.Mesh(data))

    if meshes:
        combined = mesh.Mesh(np.concatenate([m.data for m in meshes]))
        combined.save(filename)
        return filename
    else:
        raise ValueError("No valid shapes to convert")

@app.route('/')
def home():
    return jsonify({'message': "Flask backend is running!"})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = data.get('username')
    password = data.get('password')

    user = users.get(username)
    if user and user['password'] == password:
        return jsonify({'status': 'success', 'role': user['role']})
    return jsonify({'status': 'fail', 'message': 'Invalid credentials'}), 401

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'fail', 'message': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'fail', 'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{extension}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)

        if extension in ['png', 'jpg', 'jpeg', 'bmp', 'gif']:
            try:
                parsed_shapes = parse_blueprint(file_path)
            except Exception as e:
                print(f"Error parsing blueprint: {e}")
                parsed_shapes = [
                    {"type": "wall", "x": 10, "y": 20, "width": 100, "height": 10},
                    {"type": "door", "x": 120, "y": 20, "width": 30, "height": 10},
                    {"type": "window", "x": 160, "y": 20, "width": 40, "height": 10}
                ]
        else:
            parsed_shapes = [
                {"type": "stl", "filename": unique_filename, "message": "STL file uploaded. No shape parsing."}
            ]

        return jsonify({
            'status': 'success',
            'filename': unique_filename,
            'parse_result': convert_numpy_types(parsed_shapes),
            'url': f'http://localhost:5000/uploads/{unique_filename}'
        })

    return jsonify({'status': 'fail', 'message': 'Unsupported file type'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/generated_stls/<filename>')
def serve_stl(filename):
    return send_from_directory(STL_FOLDER, filename)

@app.route('/generate_stl', methods=['POST'])
def generate_stl():
    try:
        data = request.get_json(force=True)
        filename = data.get('filename')
        if not filename:
            return jsonify({'status': 'fail', 'message': 'No filename provided'}), 400

        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.isfile(file_path):
            return jsonify({'status': 'fail', 'message': 'File not found'}), 404

        try:
            parsed_shapes = parse_blueprint(file_path)
        except Exception as e:
            print(f"Error parsing in /generate_stl: {e}")
            parsed_shapes = [
                {"type": "wall", "x": 0, "y": 0, "width": 100, "height": 10}
            ]

        stl_filename = f"{uuid.uuid4().hex}.stl"
        output_path = os.path.join(STL_FOLDER, stl_filename)
        shapes_to_stl(parsed_shapes, filename=output_path)

        return jsonify({
            'status': 'success',
            'url': f'http://localhost:5000/generated_stls/{stl_filename}'
        })

    except Exception as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
    app.run(debug=True)