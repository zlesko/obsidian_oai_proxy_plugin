# MIT License
# Copyright (c) 2024 Zachary Lesko

from eventlet import wsgi
import eventlet
import flask
import flask_cors
import json
import os
import requests

api_key = os.getenv('OPENAI_API_KEY')

app = flask.Flask(__name__)
flask_cors.CORS(app)

@app.route('/chat', methods=['POST'])
def stream_proxy():
    data = flask.request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400

    headers = {'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + api_key}
        
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers=headers,
        json=data)

    return flask.Response(response, mimetype='application/json')

if __name__ == '__main__':
    listener = eventlet.listen(('127.0.0.1', 8000))
    eventlet.wsgi.server(listener, app)
