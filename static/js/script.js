class UltiAI {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.initEventListeners();
    }

    initEventListeners() {
        // Chat functionality
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Voice recording
        document.getElementById('start-recording').addEventListener('click', () => this.toggleRecording());

        // Code generation
        document.getElementById('generate-code').addEventListener('click', () => this.generateCode());

        // Image analysis
        document.getElementById('analyze-image').addEventListener('click', () => this.analyzeImage());

        // Text to speech
        document.getElementById('text-to-speech').addEventListener('click', () => this.textToSpeech());
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            
            if (data.success) {
                this.addMessage(data.reply, 'assistant');
            } else {
                this.addMessage('Error: ' + data.error, 'assistant');
            }
        } catch (error) {
            this.addMessage('Error: ' + error.message, 'assistant');
        }
    }

    addMessage(text, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async toggleRecording() {
        const button = document.getElementById('start-recording');
        
        if (!this.isRecording) {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    await this.sendAudioToServer(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                button.classList.add('recording');
                button.textContent = '⏹️ Stop';
            } catch (error) {
                alert('Error accessing microphone: ' + error.message);
            }
        } else {
            // Stop recording
            this.mediaRecorder.stop();
            this.isRecording = false;
            button.classList.remove('recording');
            button.textContent = '🎤 Speak';
        }
    }

    async sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
            const response = await fetch('/speech_to_text', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                document.getElementById('message-input').value = data.text;
                this.sendMessage();
            } else {
                this.addMessage('Speech recognition error: ' + data.error, 'assistant');
            }
        } catch (error) {
            this.addMessage('Error: ' + error.message, 'assistant');
        }
    }

    async generateCode() {
        const prompt = document.getElementById('code-prompt').value.trim();
        if (!prompt) return;

        try {
            const response = await fetch('/generate_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();
            const output = document.getElementById('code-output');
            
            if (data.success) {
                output.textContent = data.code;
            } else {
                output.textContent = 'Error: ' + data.error;
            }
        } catch (error) {
            document.getElementById('code-output').textContent = 'Error: ' + error.message;
        }
    }

    async analyzeImage() {
        const imageInput = document.getElementById('image-upload');
        const prompt = document.getElementById('image-prompt').value.trim();
        
        if (!imageInput.files[0]) {
            alert('Please select an image first');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        formData.append('prompt', prompt || 'Describe this image in detail');

        try {
            const response = await fetch('/analyze_image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            const resultDiv = document.getElementById('image-analysis-result');
            
            if (data.success) {
                resultDiv.textContent = data.analysis;
            } else {
                resultDiv.textContent = 'Error: ' + data.error;
            }
        } catch (error) {
            document.getElementById('image-analysis-result').textContent = 'Error: ' + error.message;
        }
    }

    async textToSpeech() {
        const text = document.getElementById('tts-text').value.trim();
        if (!text) return;

        try {
            const response = await fetch('/text_to_speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.play();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new UltiAI();
});
