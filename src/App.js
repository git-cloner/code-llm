// src/App.js  
import React, { useState, useRef } from 'react';
import { Layout, Tree, Tabs, Card } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Chat, { Bubble, useMessages } from '@chatui/core';
import { parseFileFromMarkdown, parseTreeFromFiles } from './utils/ParseMarkdown.js';
import { marked } from "marked";
import OpenAI from 'openai';
import '@chatui/core/dist/index.css';
import './App.css';
import '@chatui/core/es/styles/index.less';
import './chatui-theme.css';
import {
  FileOutlined, FolderOutlined,
  DownloadOutlined, GithubOutlined, CodepenCircleOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { downloadFiles } from './utils/FileDownloader.js';
import sys_prompt from './utils/prompts.js';
import packageJson from '../package.json';
import Preview from './Components/Preview.js';
import { Footer } from 'antd/es/layout/layout.js';
import { sleep } from 'openai/core.mjs';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;

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
  const [language, setLanguage] = useState('javascript');
  const { messages, appendMsg, setTyping } = useMessages([]);
  const [execResult, setExecResult] = useState('');
  const previewRef = useRef();

  async function chat_stream(prompt, _msgId) {
    message_history.push(
      {
        role: 'system', content: sys_prompt
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
      showFiles(full_text);
    }
    message_history.push({ "role": "assistant", "content": full_text });
  }

  function showFiles(full_text) {
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

  function getFileLanguage(type) {
    if (type === 'js') {
      type = 'javascript';
    }
    else if (type == 'md') {
      type = 'markdown';
    }
    else if (type == 'py') {
      type = 'python';
    }
    return type;
  };

  const defaultTreeSelect = (_files) => {
    if (_files.length === 0) {
      return;
    };
    _files.forEach(({ type, path, content }) => {
      if (type !== "bash") {
        setCode(content);
        setLanguage(getFileLanguage(type));
        return;
      }
    });
  };

  const handleTreeSelect = (selectedKeys) => {
    files.forEach(({ type, path, content }) => {
      if (path === selectedKeys[0]) {
        setCode(content);
        setLanguage(getFileLanguage(type));
        return;
      }
    });
  };

  const _downloadFiles = () => {
    if (!Array.isArray(files)) {
      return;
    }
    if (files.length === 0) {
      return;
    }
    downloadFiles(files);
  }

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

  const defaultQuickReplies = [
    {
      name: '使用 Tailwind 在 React 中构建一个邮件管理应用程序',
      isNew: true,
    },
    {
      name: '使用 Astro 构建一个任务管理应用程序',
      isNew: true,
    },
    {
      name: '使用 React 构建一个ChatBot程序',
      isNew: true,
    },
    {
      name: '如何实现多AI Agent应用，实现任务自动分解、执行？',
      isNew: true,
    },
  ];

  function handleQuickReplyClick(item) {
    handleSend('text', item.name);
  }

  function handleVersionClick() {
    let versionInfo = packageJson.name + ' ' + packageJson.version;
    alert(versionInfo);
  }

  const handlePreviewOutput = (textContent) => {
    setExecResult(execResult + '\n' + textContent);
  };

  const onTabsChange = (newActiveKey) => {
    if (newActiveKey === '2') {
      const waitForPreview = () => {
        setTimeout(() => {
          if (previewRef.current === undefined) {
            waitForPreview();
          } else {
            if (previewRef.current) {
              previewRef.current.doPreview(files);
            }
          }
        }, 500);
      };
      waitForPreview();
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ color: 'black', backgroundColor: 'lightgray', fontSize: '18px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: '1' }}>
          <CodepenCircleOutlined style={{ marginRight: 8 }} />
          <span onClick={handleVersionClick}>LLM-Code</span>
          <span style={{ fontSize: '14px', marginLeft: '10px', color: 'blue' }}>
            代码生成工具---支持Java、React、Vue、Python、C++、go、sql、Lua等
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="#" onClick={() => _downloadFiles()} style={{ color: 'black', fontSize: '16px', textDecoration: 'none' }}>
            <DownloadOutlined style={{ marginRight: 8 }} />打包下载
          </a>
          <a href="https://github.com/git-cloner/code-llm" target="_blank"
            style={{ color: 'black', fontSize: '16px', textDecoration: 'none', marginLeft: 20 }}
            rel="noopener noreferrer">
            <GithubOutlined style={{ marginRight: 8 }} />网站源码
          </a>
          <a href="https://gitclone.com" target="_blank"
            style={{ color: 'black', fontSize: '16px', textDecoration: 'none', marginLeft: 20 }}
            rel="noopener noreferrer">
            <HomeOutlined style={{ marginRight: 8 }} />首页
          </a>
        </div>
      </Header>
      <Layout>
        <Sider width={550} style={{ background: '#ffffff', padding: '5px' }}>
          <Chat
            messages={messages}
            renderMessageContent={renderMessageContent}
            onSend={handleSend}
            placeholder="请输入您的需求，如：使用 Tailwind 在 React 中构建一个邮件管理应用程序"
            quickReplies={defaultQuickReplies}
            onQuickReplyClick={handleQuickReplyClick}
          />
        </Sider>
        <Layout>
          <Content style={{ background: '#fff', padding: 3, border: '1px solid #ccc' }}>
            <Tabs defaultActiveKey="1"  style={{ paddingLeft: 10 }} onChange={onTabsChange}>
              <TabPane tab="代码" key="1">
                <Layout>
                  <Sider width={250} style={{ background: '#ffffff', padding: 1, margin: 3, border: '1px solid #ccc' }}>
                    <Tree
                      showLine
                      treeData={renderTreeNodes(treesData)}
                      defaultExpandAll={true}
                      onSelect={handleTreeSelect}
                      style={{ padding: '2px', marginTop: '2px' }}
                      autoExpandParent={true}
                      showIcon
                    />
                  </Sider>
                  <Content style={{ background: '#ffffff', padding: 3, marginTop: 0, height: '83vh', border: '1px solid #ccc' }}>
                    <SyntaxHighlighter language={language} style={prism} showLineNumbers={true}>
                      {code}
                    </SyntaxHighlighter>
                  </Content>
                </Layout>
              </TabPane>
              <TabPane tab="预览" key="2">
                <Layout>
                  <Layout>
                    <Content style={{ minHeight: '70vh', padding: 3, border: '1px solid #ccc' }}>
                      <Preview ref={previewRef} name="Preview！！" onOutput={handlePreviewOutput} />
                    </Content>
                  </Layout>
                  <Footer style={{ padding: 3 }}>
                    控制台消息
                    <Card title='' style={{ overflow: 'auto', maxHeight: 100, wordWrap: 'break-word', border: '1px solid #ccc' }}>
                      {execResult.split('\n').map((line, index) => (
                        <span key={index}>
                          {line}
                          {index !== execResult.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </Card>
                  </Footer>
                </Layout>
              </TabPane>
            </Tabs>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;