const parseMarkdown = (markdown) => {
  // 使用正则表达式匹配所有的代码块  
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let matches;
  const files = [];
  let i = 0;

  while ((matches = codeBlockRegex.exec(markdown)) !== null) {
    var fileType = matches[1];
    if (fileType === undefined) {
      fileType = "bash";
    }
    const lines = matches[2].split('\n');
    const fileContent = matches[2].trim();
    var fileName = "";
    if (fileType === "") {
      fileType = "bash";
    }
    fileType = fileType.trim();
    if (fileType !== "bash") {
      if (lines[0] !== undefined) {
        if (lines[0].trim().startsWith("//") ||
          lines[0].trim().startsWith("#") ||
          lines[0].trim().startsWith("--") ||
          lines[0].trim().startsWith("<!--")) {
          fileName = lines[0].replace("//", '')
            .replace("#", '').replace("<!--", '')
            .replace("-->", '')
            .replace("--", '').trim();
        }
      }
    } else {
      files.push({
        type: 'bash',
        path: 'bash-' + i + '.md',
        content: fileContent,
      });
      i++;
    }
    if (fileName.trim() !== "") {
      files.push({
        type: fileType,
        path: fileName,
        content: fileContent,
      });
    }
  }
  //剔除代码块（但要保留命令行）
  var newMarkdown = markdown.replace(/```bash([\s\S]*?)```/g, '$1');
  newMarkdown = newMarkdown.replace(/```sh([\s\S]*?)```/g, '$1');
  files.push({
    type: 'md',
    path: 'README.md',
    content: newMarkdown.replace(/```[\s\S]*?```/g, '<代码请查看源文件>')
  });
  return files;
};

const buildTree = (files) => {
  const tree = [];
  let key = "";

  files.forEach(file => {
    const parts = file.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      key = index === parts.length - 1 ? file : index + '-' + part;
      let child = current.find(item => item.title === part);
      if (!child) {
        const isFile = index === parts.length - 1 && part.includes('.');
        child = { title: part, key: key, children: [], icon: isFile ? 'file' : 'folder' };
        current.push(child);
      }
      current = child.children;
    });
  });
  return tree;
};

const parseFileFromMarkdown = (markdownText) => {
  return parseMarkdown(markdownText);
}

const parseTreeFromFiles = (files) => {
  let paths = [];
  files.forEach(({ type, path, content }) => {
    paths.push(path);
  });
  return buildTree(paths);
}

/*
const test = () => {
  let markdownText =
    `
    \`\`\`jsx
    // app.js
    // hello world
    \`\`\`
    test
    \`\`\`python
    # src/main.py
    // hello world
    \`\`\`
    `
  let files = parseFileFromMarkdown(markdownText);
  console.log(files);
  let tree = parseTreeFromFiles(files);
  console.log(JSON.stringify(tree, null, 2));
}

test()
*/

const parseMermaidFromMarkdown = (markdown) => {
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  let matched = "";
  while ((match = mermaidRegex.exec(markdown)) !== null) {
    matched = match[0];
    break;
  }
  matched = matched.replace("```mermaid",'').replace("```",'');
  matched = matched.replace("\"",'') ;
  matched = matched.replace('(','').replace(")",'');
  matched = matched.replace('{','[').replace("}",']');
  return matched ;
}

module.exports = { parseFileFromMarkdown, parseTreeFromFiles, parseMermaidFromMarkdown };