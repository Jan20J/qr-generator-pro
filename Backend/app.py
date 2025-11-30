from flask import Flask, request, send_file
from flask_cors import CORS
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import (
    SquareModuleDrawer, RoundedModuleDrawer, CircleModuleDrawer, 
    GappedSquareModuleDrawer, HorizontalBarsDrawer, VerticalBarsDrawer
)
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Backend QR Pro Final Activo"

@app.route('/generate', methods=['POST'])
def generate_qr():
    try:
        data = request.json
        
        # 1. Datos básicos
        content = data.get('content', '')
        qr_type = data.get('type', 'link')
        
        # WiFi logic
        if qr_type == 'wifi':
            ssid = data.get('ssid', '')
            password = data.get('password', '')
            encryption = data.get('encryption', 'WPA')
            content = f"WIFI:T:{encryption};S:{ssid};P:{password};;"

        if not content:
            return {"error": "Falta contenido"}, 400

        # 2. Configuración de Estilos
        # Drawers (Formas)
        drawers = {
            'square': SquareModuleDrawer(),
            'rounded': RoundedModuleDrawer(),
            'circle': CircleModuleDrawer(),
            'gapped': GappedSquareModuleDrawer(),
            'horizontal': HorizontalBarsDrawer(),
            'vertical': VerticalBarsDrawer()
        }
        body_style = data.get('body_style', 'square')
        eye_style = data.get('eye_style', 'square')
        
        module_drawer = drawers.get(body_style, SquareModuleDrawer())
        eye_drawer = drawers.get(eye_style, SquareModuleDrawer())

        # Colores
        fill_hex = data.get('fill_color', '#000000')
        back_hex = data.get('back_color', '#ffffff')
        is_transparent = data.get('is_transparent', False)

        def hex_to_rgb(h):
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        fill_rgb = hex_to_rgb(fill_hex)
        back_rgb = hex_to_rgb(back_hex)

        # 3. Nivel de Legibilidad (Corrección de Errores) - NUEVO
        error_level_map = {
            'L': qrcode.constants.ERROR_CORRECT_L, # 7%
            'M': qrcode.constants.ERROR_CORRECT_M, # 15%
            'Q': qrcode.constants.ERROR_CORRECT_Q, # 25%
            'H': qrcode.constants.ERROR_CORRECT_H  # 30%
        }
        # Por defecto usamos High (H) si no se especifica, para mejor calidad visual
        ec_level = error_level_map.get(data.get('error_level', 'H'), qrcode.constants.ERROR_CORRECT_H)

        # 4. Generar QR Base
        qr = qrcode.QRCode(
            version=None,
            error_correction=ec_level, 
            box_size=10,
            border=4,
        )
        qr.add_data(content)
        qr.make(fit=True)

        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=module_drawer,
            eye_drawer=eye_drawer,
            color_mask=SolidFillColorMask(back_color=back_rgb, front_color=fill_rgb)
        )

        # 5. Procesar Imagen (Transparencia y Tamaño)
        img_pil = img.convert("RGBA")

        if is_transparent:
            datas = img_pil.getdata()
            newData = []
            for item in datas:
                # Tolerancia simple para detectar el fondo y hacerlo transparente
                if (abs(item[0] - back_rgb[0]) < 5 and 
                    abs(item[1] - back_rgb[1]) < 5 and 
                    abs(item[2] - back_rgb[2]) < 5):
                    newData.append((255, 255, 255, 0))
                else:
                    newData.append(item)
            img_pil.putdata(newData)

        target_size = int(data.get('size', 1000))
        img_resized = img_pil.resize((target_size, target_size), Image.Resampling.LANCZOS)

        # Output
        img_io = io.BytesIO()
        fmt = data.get('format', 'png').lower()
        
        if fmt == 'jpg' or fmt == 'jpeg':
            bg = Image.new("RGB", img_resized.size, (255, 255, 255))
            bg.paste(img_resized, mask=img_resized.split()[3])
            bg.save(img_io, 'JPEG', quality=95)
            mimetype = 'image/jpeg'
        else:
            img_resized.save(img_io, 'PNG')
            mimetype = 'image/png'

        img_io.seek(0)
        return send_file(img_io, mimetype=mimetype)

    except Exception as e:
        print(e)
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)