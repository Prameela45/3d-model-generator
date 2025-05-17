import os
import cv2  # type: ignore
import numpy as np

def parse_blueprint(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError("Image not found.")

    # Read and preprocess the image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Failed to read the image. Check format.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Wall detection using Canny + Hough
    edges = cv2.Canny(blurred, 50, 150, apertureSize=3)
    kernel = np.ones((3, 3), np.uint8)
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    lines = cv2.HoughLinesP(closed, 1, np.pi / 180, threshold=80, minLineLength=40, maxLineGap=10)

    parsed_data = []
    preview = img.copy()

    # Extract wall-like lines
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.sqrt((x2 - x1) * 2 + (y2 - y1) * 2)
            if length < 30:
                continue

            wall_thickness = 5
            parsed_data.append({
                'type': 'wall',
                'x': min(x1, x2),
                'y': min(y1, y2),
                'width': abs(x2 - x1) or wall_thickness,
                'height': abs(y2 - y1) or wall_thickness
            })
            cv2.line(preview, (x1, y1), (x2, y2), (255, 0, 0), 2)  # Blue for walls

    # Detect doors/windows as rectangles or circles
    _, thresh = cv2.threshold(blurred, 200, 255, cv2.THRESH_BINARY_INV)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 150:  # Filter noise
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue

        circularity = 4 * np.pi * (area / (perimeter ** 2))

        if len(approx) >= 8 and 0.7 < circularity <= 1.2:
            (cx, cy), radius = cv2.minEnclosingCircle(cnt)
            parsed_data.append({
                'type': 'circle',
                'cx': int(cx),
                'cy': int(cy),
                'r': int(radius)
            })
            cv2.circle(preview, (int(cx), int(cy)), int(radius), (0, 255, 255), 2)  # Yellow
        else:
            # Classify as door/window based on aspect ratio
            aspect_ratio = w / float(h)
            element_type = 'door' if 0.2 < aspect_ratio < 0.6 or 1.5 < aspect_ratio < 2.5 else 'window'

            parsed_data.append({
                'type': element_type,
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h)
            })
            color = (0, 255, 0) if element_type == 'door' else (0, 0, 255)
            cv2.rectangle(preview, (x, y), (x + w, y + h), color, 2)

    # Save preview image
    os.makedirs('uploads', exist_ok=True)
    preview_path = os.path.join('uploads', 'preview.jpg')
    cv2.imwrite(preview_path, preview)

    return parsed_data