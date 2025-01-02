import { App, Editor, EditorPosition, MarkdownView,
	Modal, Notice, Plugin, PluginSettingTab, Setting,
	TFile, Vault } from 'obsidian';

const plugin_settings_default: Partial<{ [key: string]: any }> = {
	model: 'gpt-4',
	frequency_penalty: 0,
	logit_bias: null,
	logprobs: false,
	top_logprobs: null,
	max_tokens: null,
	n: 1,
	presence_penalty: 0,
	response_format: { type: "text" },
	seed: null,
	stop: null,
	stream: false,
	temperature: 1,
	top_p: 1,
	// tools: [],
	// tool_choice: "none",
	user: null
};

const plugin_settings_info: { [key: string]: { name: string, desc: string, type: string } } = {
    model: {
        name: 'model',
        desc: 'ID of the model to use. See the model endpoint compatibility table for details.',
        type: 'string'
    },
    frequency_penalty: {
        name: 'frequency_penalty',
        desc: 'Number between -2.0 and 2.0, penalizes token repetition. Defaults to 0.',
        type: 'number'
    },
    logit_bias: {
        name: 'logit_bias',
        desc: 'Modifies token likelihood using a map from token IDs to bias values (-100 to 100). Defaults to null.',
        type: 'map'
    },
    logprobs: {
        name: 'logprobs',
        desc: 'Whether to return log probabilities of the output tokens. Defaults to false.',
        type: 'boolean'
    },
    top_logprobs: {
        name: 'top_logprobs',
        desc: 'Returns the log probabilities for the top N tokens at each position, requires logprobs to be true. Defaults to null.',
        type: 'integer'
    },
    max_tokens: {
        name: 'max_tokens',
        desc: 'Maximum number of tokens for the chat completion. Limited by the model\'s context length.',
        type: 'integer'
    },
    n: {
        name: 'n',
        desc: 'Number of chat completion choices to generate. Defaults to 1.',
        type: 'integer'
    },
    presence_penalty: {
        name: 'presence_penalty',
        desc: 'Number between -2.0 and 2.0, penalizes token presence to encourage topic variety. Defaults to 0.',
        type: 'number'
    },
    response_format: {
        name: 'response_format',
        desc: 'Specifies the output format. Use {"type": "json_object"} for JSON mode.',
        type: 'object'
    },
    seed: {
        name: 'seed',
        desc: 'Ensures deterministic output for repeated requests with the same seed and parameters. Beta feature.',
        type: 'integer'
    },
    temperature: {
        name: 'temperature',
        desc: 'Sampling temperature between 0 and 2. Controls randomness, defaults to 1.',
        type: 'number'
    },
    user: {
        name: 'user',
        desc: 'A unique identifier for the end-user to help monitor and detect abuse.',
        type: 'string'
    }
};

export default class MyPlugin extends Plugin {
	settings: { [key: string]: any };
	
	async onload() {
		const data = await this.loadData() || {};
		this.settings = Object.assign({}, plugin_settings_default, data);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('GPT Ready');

		this.addCommand({
			id: 'system-tags-html',
			name: 'system tags html',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				this.insert_html_tag(editor, '<div class="gpt system_open"></div>',
					'<div class="gpt system_close"></div>\n');
			}
		});

		this.addCommand({
			id: 'user-tags-html',
			name: 'user tags html',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insert_html_tag(editor, '<div class="gpt user_open"></div>',
					'<div class="gpt user_close"></div>\n');
			}
		});

		this.addCommand({
			id: 'assistant-tags-html',
			name: 'assistant tags html',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insert_html_tag(editor, '<div class="gpt assistant_open"></div>',
					'<div class="gpt assistant_close"></div>\n');
			}
		});

		this.addCommand({
			id: 'parent-tags-html',
			name: 'parent tags html',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insert_html_tag(editor, '<div class="gpt parent_open"></div>',
					'<div class="gpt parent_close"></div>\n');
			}
		});

		this.addCommand({
			id: 'children-tags-html',
			name: 'children tags html',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insert_html_tag(editor, '<div class="gpt children_open"></div>\n',
					'<div class="gpt children_close"></div>\n');
			}
		});

		this.addCommand({
			id: 'branch_conversation',
			name: 'branch conversation',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				let parent_file = view.file;
				if(!parent_file){
					new Notice('Unable to find original file.');
					return;
				}
				
				let parent_link = parent_file.path;
				let last_dot_index = parent_link.lastIndexOf('.');
				if (last_dot_index != -1) {
					parent_link = parent_link.slice(0, last_dot_index);
				}
				parent_link = '\n<div class="gpt parent_open"></div>\n[[' + parent_link
					+ ']]\n<div class="gpt parent_close"></div>';

				let branch_path = this.create_new_path(parent_file.path);	
				let child_link = branch_path;
				last_dot_index = child_link.lastIndexOf('.');
				if (last_dot_index > 0) {
					child_link = child_link.slice(0, last_dot_index);
				}

				let cursor_begin = {line: 0, ch: 0};
				let cursor_pos = editor.getCursor();
				let cursor_end = {line: editor.lastLine(),
					ch: editor.getLine(editor.lastLine()).length};

				let parent_content = editor.getRange(cursor_begin, cursor_pos);
				let child_content = editor.getRange(cursor_pos, cursor_end);
				
				const child_tag_regex = 
					/^<div class="gpt children_open"><\/div>\n\n(.*?)\n<div class="gpt children_close"><\/div>$/gsm;
				let child_match = child_tag_regex.exec(child_content);
				if(child_match == null){
					child_link = '<div class="gpt children_open"><\/div>\n\n[['
						+ child_link + ']]\n<div class="gpt children_close"><\/div>';
				}
				else{
					child_link = child_match[1] + '\n[[' + child_link + ']]';
					child_link = `<div class="gpt children_open"></div>\n\n${child_link}\n<div class="gpt children_close"></div>`
					child_content = child_content.replace(child_tag_regex, ``);
				}
			
				parent_content = parent_content + child_link;
				child_content = parent_link + child_content;
				let new_file = await app.vault.create(branch_path, child_content);
				editor.replaceRange(parent_content, cursor_begin, cursor_end);

				if(this.app.workspace.activeLeaf != null){
					const newLeaf = this.app.workspace.createLeafBySplit(this.app.workspace.activeLeaf, 'vertical', true);
        			newLeaf.openFile(new_file, { state: { mode: "editing" }, active: true });
				}
				else{
					new Notice('Unable to create new leaf.');
				}

				return;
			}
		});

		this.addCommand({
			id: 'send-gpt',
			name: 'Send GPT',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// view.file.name = 'test';  // Consider auto-naming the file
				// protect against empty editor
				statusBarItemEl.setText('GPT Generating...');
				let c = this.has_children(editor.getValue())
				if(c){
					new Notice('Cannot send branched conversations.\n\nContinue conversation in the children files.');
					statusBarItemEl.setText('GPT Ready');
					return;
				}
				const messages = await this.compile_conversation(editor);
				if(messages.length == 0){
					new Notice('No conversation to send.\n\nEnsure conversations are enclosed in system, user, or assistant tags.\n\nAdd tags from command seach (Ctrl-p)');
					statusBarItemEl.setText('GPT Ready');
					return;
				}
				let tx_data = { ...this.settings };
				tx_data.messages = messages;
				if(tx_data.model.includes('o1')){
					const keys_to_keep = ['model', 'messages'];
					for (const key in tx_data) {
					  if (!keys_to_keep.includes(key)) {
						delete tx_data[key];
					  }
					}
				}
				try{					
					const response = await fetch('http://localhost:8000/chat',
						{
							method: 'POST',
							headers: {'Content-Type': 'application/json'},
							body: JSON.stringify(tx_data)
						}
					);
					if (!response.ok || !response.body) {
						this.append_text(editor, 'Response != 200 || No response body.\n');
						statusBarItemEl.setText('GPT Ready');
						return;
					}
					try{
						let rx_data = await response.json();
						let text = '';
						text = text + '<div class="gpt assistant_open"></div>\n';
						text = text + rx_data['choices'][0]['message']['content'];
						text = text + '\n<div class="gpt assistant_close"></div>\n';
						this.append_text(editor, text);
					}
					catch(e){
						this.append_text(editor, String(e) + '\n' + response.text());
						statusBarItemEl.setText('GPT Ready');
						return;
					}

				}
				catch(e){
					this.append_text(editor, String(e));
					statusBarItemEl.setText('GPT Ready');
					return;
				}
				statusBarItemEl.setText('GPT Ready');
			}
		});
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
	}

	append_text(editor: Editor, text: string){
	
		let editor_pos = {line: editor.lastLine(),
			ch: editor.getLine(editor.lastLine()).length}
			if(editor_pos.ch != 0){
					text = '\n' + text;
				editor_pos.line += 1;				
		}
		editor.replaceRange(text,
			{line: editor.lastLine(),
			ch: editor.getLine(editor.lastLine()).length});
		
		editor_pos.line += 1;
		editor_pos.ch = 0;
		editor.setCursor(editor_pos);
	}

	insert_html_tag(editor: Editor, prefix: string, postfix: string){
		let editor_pos = editor.getCursor();
		editor_pos.ch = editor.getLine(editor_pos.line).length;
		if(editor_pos.line == 0){
			editor_pos.line += 1;
			prefix = '\n' + prefix;
		}
		if(editor_pos.ch != 0){
			prefix = '\n' + prefix;
		}
		prefix = prefix + '\n';
		postfix = '\n' + postfix;
		editor.replaceRange(prefix + postfix, editor_pos);
		if(editor_pos.ch == 0){
			editor_pos.line += 1;
		}
		else{
			editor_pos.line += 2;
			editor_pos.ch = 0;
		}
		editor.setCursor(editor_pos);
	}

	create_new_path(path: string){
		const last_dot_index = path.lastIndexOf('.');
		let path_new = '';
		let ext = '';
		if (last_dot_index > 0) {
			path_new = path.slice(0, last_dot_index);
			ext = path.slice(last_dot_index);
		}
		else{
			path_new = path;
		}
	
		while(app.vault.getAbstractFileByPath(path_new + ext)){
			path_new = path_new + '_1';
		}
	
		return path_new + ext;
	}

	async compile_conversation(editor: Editor): Promise<{role: string, content: string}[]>{
		// fix empty editor
		let text_convo = editor.getValue();
	
		let text_parent = await this.get_parent_text(text_convo);
		while(text_parent != null){
			text_convo += text_parent + '\n' + text_convo;
			text_parent = await this.get_parent_text(text_parent);
		}
	
		let messages: {role: string, content: string}[] = [];
		const regex = 
			/^<div class="gpt (system|user|assistant)_open"><\/div>(.*?)<div class="gpt (system|user|assistant)_close"><\/div>$/gsm;
		while(true){
			let match = regex.exec(text_convo);
			if(match == null){
				break;
			}
			messages.push({role: match[1], content: match[2].trim()});
		}
		
		return messages;
	}

	async get_parent_text(text: string): Promise<string | null> {
		const regex_parent_div =
			/^<div class="gpt parent_open"><\/div>(.*?)<div class="gpt parent_close"><\/div>$/sm;
		const regex_parent = /\[\[(.*?)\]\]/;
	
		let text_parent_div = regex_parent_div.exec(text);
		if(text_parent_div == null){
			return null;
		}
		let text_parent = regex_parent.exec(text_parent_div[1]);
		if(text_parent == null){
			return null;
		}
		let file_parent = app.vault.getFileByPath(text_parent[1] + '.md');
		if(!file_parent){
			return null;
		}

		return app.vault.cachedRead(file_parent);	
	}

	has_children(text: string): boolean{
		const regex_children_div =
			/^<div class="gpt children_open"><\/div>(.*?)<div class="gpt children_close"><\/div>$/sm;
		let matches = regex_children_div.exec(text);
		if(matches == null){
			return false;
		}
		return true;
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		for (const key in plugin_settings_info) {
			this.new_setting(containerEl, key);
		}
	}

	async new_setting(containerEl: HTMLElement, key: string){
		if (plugin_settings_info[key].type == 'object'){
			var value_str = JSON.stringify(this.plugin.settings[key]);
		}
		else{
			var value_str = String(this.plugin.settings[key]);
		}
		new Setting(containerEl)
			.setName(plugin_settings_info[key].name)
			.setDesc(plugin_settings_info[key].desc)
			.addText(text => text
				.setPlaceholder('')
				.setValue(value_str)
				.onChange(async (new_value) => {
					if (new_value == 'null' || new_value == ''){
						this.plugin.settings[key] = null;
					}
					else if(plugin_settings_info[key].type == 'string'){
						this.plugin.settings[key] = new_value;
					}
					else if(plugin_settings_info[key].type == 'number'){
						this.plugin.settings[key] = parseFloat(new_value);
					}
					else if(plugin_settings_info[key].type == 'integer'){
						this.plugin.settings[key] = parseInt(new_value);
					}
					else if(plugin_settings_info[key].type == 'map'
						|| plugin_settings_info[key].type == 'object'){
						try{
							this.plugin.settings[key] = JSON.parse(new_value);
						}
						catch{
							this.plugin.settings[key] = null;
						}
					}
					else if(plugin_settings_info[key].type == 'boolean'){
						if(new_value == '0' || new_value == 'false'
							|| new_value == 'False'){
							this.plugin.settings[key] = false;
						}
						else if(new_value == '1' || new_value == 'true'
							|| new_value == 'True'){
							this.plugin.settings[key] = true;
						}
					}
				
					await this.plugin.saveData(this.plugin.settings);
				}
			)
		);
	}
}