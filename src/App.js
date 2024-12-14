// src/App.js  
import React, { useState } from 'react';
import { Layout, Tree } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Chat, { Bubble, useMessages } from '@chatui/core';
import { parseFileFromMarkdown, parseTreeFromFiles } from './utils/ParseMarkdown.js';
import { marked } from "marked";
import OpenAI from 'openai';
import '@chatui/core/dist/index.css';
import './App.css';
import '@chatui/core/es/styles/index.less';
import './chatui-theme.css';
import { FileOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const openai = new OpenAI({
  apiKey: '0000',
  dangerouslyAllowBrowser: true,
  baseURL: "https://gitclone.com/qchain/v1/"
});
var message_history = [];


const App = () => {
  const [treesData, setTreesData] = useState('');
  const [files, setFiles] = useState('');
  const [code, setCode] = useState('// 选择左侧文件以查看代码');
  const { messages, appendMsg, setTyping } = useMessages([]);

  async function chat_stream(prompt, _msgId) {
    message_history.push(
      {
        role: 'system', content:
          `
        你是一个人工智能助理。
        重要！输出的文本中，如果包含代码文件，则在代码块中，要将文件名加上注释放到代码块的第一行，如：
        \`\`\`jsx
        // app.js
        import React, { useState } from 'react';
        import axios from 'axios';
        \`\`\`

        \`\`\`python
        # app.py
        from openai import OpenAI
        import streamlit as st
        import streamlit.components.v1 as components
        import random
        \`\`\`
        `
      }
    );
    message_history.push({ role: 'user', content: prompt });
    const stream = openai.beta.chat.completions.stream({
      model: 'glm-4-9b-chat',
      messages: message_history,
      stream: true,
    });
    var full_text = "";
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content === undefined) {
        continue;
      }
      full_text = full_text + chunk.choices[0]?.delta?.content || '';
      _updateMsg(full_text.trim());
      //updateMsg(_msgId, {
      //  type: "text",
      //  content: { text: marked(full_text.trim()) }
      //});
    }
    message_history.push({ "role": "assistant", "content": full_text });
    //
    let files = parseFileFromMarkdown(full_text);
    setFiles(files);
    setTreesData(parseTreeFromFiles(files));
    defaultTreeSelect(files);
  }

  function _updateMsg(context) {
    context = marked(context);
    var oUl = document.getElementById('root');
    var aBox = getByClass(oUl, 'Bubble text');
    if (aBox.length > 0) {
      aBox[aBox.length - 1].innerHTML = "<p>" + context + "</p>";
      var msgList = getByClass(oUl, "PullToRefresh")[0];
      msgList.scrollTo(0, msgList.scrollHeight);
    }
  }

  function findInArr(arr, n) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === n) return true;
    }
    return false;
  };

  function getByClass(oParent, sClass) {
    if (document.getElementsByClassName) {
      return oParent.getElementsByClassName(sClass);
    } else {
      var aEle = oParent.getElementsByTagName('*');
      var arr = [];
      for (var i = 0; i < aEle.length; i++) {
        var tmp = aEle[i].className.split(' ');
        if (findInArr(tmp, sClass)) {
          arr.push(aEle[i]);
        }
      }
      return arr;
    }
  }

  function handleSend(type, val) {
    if (type === 'text' && val.trim()) {
      appendMsg({
        type: 'text',
        content: { text: val },
        position: 'right',
      });
      setTyping(true);
      const msgID = new Date().getTime();
      appendMsg({
        _id: msgID,
        type: 'text',
        content: { text: '' },
      });
      chat_stream(val, msgID);
    }
  };

  const defaultTreeSelect = (_files) => {
    if (_files.length === 0) {
      return;
    };
    _files.forEach(({ type, path, content }) => {
      if (type !== "bash") {
        setCode(content);
        return;
      }
    });
  };

  const handleTreeSelect = (selectedKeys) => {
    files.forEach(({ type, path, content }) => {
      if (path === selectedKeys[0]) {
        setCode(content);
        return;
      }
    });
  };

  const renderTreeNodes = (data) => { 
    if (!Array.isArray(data)) {  
      return []; 
    }  
    return data.map(item => { 
      const isFile = item.icon === 'file';  
      const icon = isFile ? <FileOutlined /> : <FolderOutlined />;   
      return {  
        title: (  
          <span>  
            {icon}
            {item.title}  
          </span>  
        ),  
        key: item.key,  
        icon: icon,  
        children: renderTreeNodes(item.children),  
      };  
    });  
  };  

  function renderMessageContent(msg) {
    const { content } = msg;
    return <Bubble content={content.text} />;
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ color: 'white', fontSize: '20px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
        <div>llm-code</div>
        <a href="https://github.com/git-cloner/code-llm" target="_blank" style={{ color: 'white', fontSize: '16px', textDecoration: 'none' }} rel="noopener noreferrer">
          源码
        </a>
      </Header>
      <Layout>
        <Sider width={550} style={{ background: '#ffffff', padding: '10px' }}>
          <Chat
            messages={messages}
            renderMessageContent={renderMessageContent}
            onSend={handleSend}
            placeholder="请输入您的需求，如：使用 Tailwind 在 React 中构建一个邮件管理应用程序"
          />
        </Sider>
        <Layout>
          <Sider width={250} style={{ background: '#f0f2f5', padding: '15px' }}>
            <Tree
              treeData={renderTreeNodes(treesData)}  
              switcherIcon={<FolderOpenOutlined />}  
              defaultExpandAll={true}
              onSelect={handleTreeSelect}
              style={{ padding: '10px' }}
            />
          </Sider>
          <Layout style={{ padding: '0px' }}>
            <Content style={{ background: '#fff', padding: 5 }}>
              <div style={{ height: '100vh', overflow: 'auto', marginTop: '1px' ,fontSize: '17px'}}>
                <SyntaxHighlighter language="javascript" style={vs} showLineNumbers={true}>
                  {code}
                </SyntaxHighlighter>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;