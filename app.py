from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import openai
import speech_recognition as sr
from gtts import gTTS
import os
import base64
import io
from PIL import Image
import requests
import json
import tempfile

app = Flask(__name__)
CORS(app)

# Configure your API keys here (you'll set this as environment variable)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-api-key-here')

# Initialize OpenAI client
openai.api_key = OPENAI_API_KEY

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_code', methods=['POST'])
def generate_code():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert programmer who can generate code in any programming language. Provide complete, working code with explanations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000
        )
        
        code = response.choices[0].message.content
        return jsonify({"success": True, "code": code})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/analyze_image', methods=['POST'])
def analyze_image():
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image provided"})
        
        image_file = request.files['image']
        prompt = request.form.get('prompt', 'Describe this image in detail')
        
        # Convert image to base64
        image_data = image_file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        response = openai.ChatCompletion.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        analysis = response.choices[0].message.content
        return jsonify({"success": True, "analysis": analysis})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/text_to_speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '')
        
        tts = gTTS(text=text, lang='en')
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tts.save(temp_file.name)
        
        return send_file(temp_file.name, as_attachment=True, download_name='response.mp3')
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/speech_to_text', methods=['POST'])
def speech_to_text():
    try:
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"})
        
        audio_file = request.files['audio']
        
        # Save audio file temporarily
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        audio_file.save(temp_audio.name)
        
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        with sr.AudioFile(temp_audio.name) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
        
        # Clean up
        os.unlink(temp_audio.name)
        
        return jsonify({"success": True, "text": text})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Ulti, a helpful AI assistant that can generate code, analyze images, and provide software development guidance. Be concise and helpful."},
                {"role": "user", "content": message}
            ],
            max_tokens=500
        )
        
        reply = response.choices[0].message.content
        return jsonify({"success": True, "reply": reply})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
