This is an Obsidian plugin for interfacing with OpenAI API through a local Python proxy server.

It is designed to provide a chat-like functionality, with the added organization and privacy benefits of Obsidian.

A script is also included for importing OpenAI ChatGPT data into the formatted markdown files used by this plugin.
## Features
When in an Obsidian editor the commands (Ctrl-p) become available:
- "system tags html"
- "user tags html"
- "assistant tags html"
- "Send GPT"
- "branch conversation"
	- "parent tags html"
	- "children tags html"

You structure your conversation with system, user, and assistant HTML tags added with the commands.

When the "send GPT" command is called, the conversation is parsed and formatted for the OpenAI API,  then sent to the local proxy_server.py. The response is parsed, formatted and appended in the Obsidian editor.

OpenAI API settings are editable in the plugin's settings menu within Obsidian.

Users are able to branch conversations, which adds parent and child tags to conversations. This allows the user to leverage Obsidian's graph view to visually display the progression and flow of a conversations.

By using correctly formatting the HTML tags, this plugin provides visually distinct formatting for each sections which can be edited in the styles.css file. These styles will be rendered in both of the editor's edit and view modes.

See examples folder for more info and images.

Note: In order for the markdown and HTML to render in the editor it was necessary to use separate HTML tags for opening and closing sections. For Obsidian's graphing view to link markdown files, the file references and child HTML tag had to be separated by a newline.
## Benefits
At the time of writing:
- Obsidian states that they do not use telemetry and the data in your vault is your private data.
- OpenAI states that the user owns the inputs and outputs of API communication and that the input and output is not used to train models.
- When using ChatGPT, if you want your conversations saved with your account, you are agreeing to allow OpenAI to train their models using the inputs and outputs of conversations.

Therefore, from a privacy perspective, is it advantageous to use this Obsidian plugin with the OpenAI API rather than ChatGPT.

Other advantages:
- Most likely spend less money because you only pay for the token's you use, instead of a monthly subscription.
- Search past conversations easily in the Obsidian app.
- Better organization of conversations in the Obsidian app.
## Preparing Environment
#### Obsidian Plugin
Navigate to your_vault_dir/.obsidian/plugins and clone this repo.
Restart Obsidian, go to the community plugins settings tab and enable the plugin.
#### Proxy Server
In the cloned repo:
```bash
python -m venv gpt_proxy
source gpt_proxy/bin/activate
pip install eventlet flask flask-cors requests
python gpt_proxy.py
```

Your OpenAI API key should be the accessible via the OPENAI_API_KEY environment variable.

The proxy HTTP server that you must run locally to use this plugin is not encrypted as of time of writing. This means if there is malicious software running on your computer is will be able to view that traffic between Obsidian and the proxy server. This will not contain your OPENAI_API_KEY, which is only handled by the proxy server and OpenAI API communication. Eventually the proxy server will be updated to be encrypted.