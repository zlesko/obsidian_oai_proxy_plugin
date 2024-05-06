# MIT License
# Copyright (c) 2024 Zachary Lesko

"""
This converts conversations.json from your ChatGPT downloaded data
into markdown files with the formatting tags needed by the plugin. 
"""

import json
import datetime
import os

output_dir = './output/'
user_open_tag = '<div class="gpt user_open"></div>\n'
user_close_tag = '<div class="gpt user_close"></div>\n'
assistant_open_tag = '<div class="gpt assistant_open"></div>\n'
assistant_close_tag = '<div class="gpt assistant_close"></div>\n'

def convert_convo_to_md(json_data):
    md = datetime.datetime.utcfromtimestamp(json_data['create_time'])\
        .strftime('%Y-%m-%d %H:%M:%S') + '\n\n'
    
    mapping = json_data['mapping']
    parents = []
    for obj in mapping.values():
        if obj['parent'] == None:
            parents.append(obj)
    
    while len(parents) > 0:
        parent = parents.pop(0)
        for obj in mapping.values():
            if obj['parent'] == parent['id']:
                if obj['message'] != None:
                    try:
                        if obj['message']['author']['role'] == 'user':
                            md += user_open_tag
                            for part in obj['message']['content']['parts']:
                                md += part + '\n'
                            md += user_close_tag
                        elif obj['message']['author']['role'] == 'assistant':
                            md += assistant_open_tag
                            for part in obj['message']['content']['parts']:
                                md += part + '\n'
                            md += assistant_close_tag
                    except:
                       print('Error parsing ' + json_data['title']) 
                parents.append(obj)
    
    sani_title = json_data['title'] + '.md'
    for char in '<>:"/\\|?*':
        sani_title = sani_title.replace(char, '')
    
    if not os.path.exists(output_dir):
        os.mkdir(output_dir)

    with open(output_dir + sani_title, 'w') as output_file:
        output_file.write(md)


if __name__ == '__main__':
    if os.path.exists(output_dir):
        print('Error: Output directory already exists.')
        exit()

    with open('conversations.json', 'r') as input_file:
        conversations = json.load(input_file)
        for convo in conversations:
            convert_convo_to_md(convo)
