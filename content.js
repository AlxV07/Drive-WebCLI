// ===== Command Functionality  =====

function ls_impl(doc) {
	const result = []

	t = doc.querySelector("table[role='grid']")

	const DriveUrlHead = "https://drive.google.com"
	const DocsUrlHead = "https://docs.google.com"
	const ColabUrlHead = "https://colab.research.google.com"
	const TypeToUrl = new Map([
		["Folder",          {head: DriveUrlHead, stub: "drive/folders"}],
		["Text",            {head: DriveUrlHead, stub: "file/d"}],
		["Image",           {head: DriveUrlHead, stub: "file/d"}],
		["PDF",             {head: DriveUrlHead, stub: "file/d"}],
		["Binary",          {head: DriveUrlHead, stub: "file/d"}],
		["Audio",           {head: DriveUrlHead, stub: "file/d"}],
		["Video",           {head: DriveUrlHead, stub: "file/d"}],
		["Unknown",         {head: DriveUrlHead, stub: "file/d"}],
		["Google Docs",     {head: DocsUrlHead, stub: "document/d"}],
		["Google Drawings", {head: DocsUrlHead, stub: "drawings/d"}],
		["Google Sheets",   {head: DocsUrlHead, stub: "spreadsheets/d"}],
		["Google Vids",     {head: DocsUrlHead, stub: "videos/d"}],
		["Google Colab",    {head: ColabUrlHead, stub: "drive"}],
	]);

	const rows = t.tBodies[0].rows;
	for (let i = 0; i < rows.length; i++) {
		const r = rows[i];
		const dataId = r.getAttribute("data-id");

		let name = r.children[0].children[0].children[0].children[1].textContent.trim();
		name = name.endsWith("Shared") ? name.substring(0, name.length - "Shared".length): name;

		let isShared = false;
		let isFolder = false;

		// e.g. File Name Google Document Shared | Folder Name Shared folder
		const ariaLabel = r.querySelector("[aria-label]").getAttribute("aria-label").trim();  
		const modifiers = ariaLabel.substring(name.length, ariaLabel.length).trim();

		let fileType = modifiers.endsWith("Shared") ? (isShared = true, modifiers.substring(0, modifiers.length - "Shared".length).trim()) :
									 (modifiers.endsWith("Shared folder") ? (isShared = true, modifiers.substring(0, modifiers.length - "Shared folder".length).trim()) : modifiers.trim());
		fileType = fileType.length === 0 ? "Folder" : fileType;
    isFolder = (fileType === "Folder");

    let UrlParts = TypeToUrl.get(fileType);
    let head = UrlParts ? UrlParts.head : "unknown-fileType";
    let stub = UrlParts ? UrlParts.stub : "unknown-fileType";
		const url =  head + "/" + stub + "/" + dataId;
		result.push({name: name, fileType: fileType, isShared: isShared, isFolder: isFolder, url: url, component: r});
	}
	return result;
}

async function loadDocFromUrl(url) {
	const response = await fetch(url);
	const parser = new DOMParser();
	const doc = parser.parseFromString(await response.text(), "text/html");
	return doc;
}

function getFileComponent(name) {
  const allFiles = ls_impl(document);
  for (const file of allFiles) {
    if (file.name === name) {
      return file.component;
    }
  }
  return null;
}

function getFileInfo(name, allFiles) {
  if (!allFiles) {
    allFiles = ls_impl(document);
  }
  for (const file of allFiles) {
    if (file.name === name) {
      return file;
    }
  }
  return null;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// ===== Terminal Functionality  =====
function help_func() {
  logOutput("Drive-WebCLI v1.0 - Available commands:", "orange")
  helpLogOutput("help", "", "Show this help page")
  helpLogOutput("clear", "", "Clear terminal output display")
  helpLogOutput("opacity", "[value]", "Set terminal opacity (0.0 to 1.0)")
  helpLogOutput("ls", "[optional:path]", "List files in current or specified folder")
  helpLogOutput("cd",  "[path]", "Walk step by step up / down folders along specified path")
  helpLogOutput("open",  "[file]", "Open a file in the current folder")
  helpLogOutput("rename",  "[old] [new]", "Rename a file or folder in the current folder")
  helpLogOutput("rm", "[file1 file2 file3 ...]", "Remove files or folders, in order of first occurrence, from the current folder")
  helpLogOutput("new", "[docs|sheets|slides]", "Create a new file in the current folder")
  helpLogOutput("new", "[folder] [name]", "Create a new folder with the given name in the current folder")
  helpLogOutput("upload", "[file|folder]", "Upload a file or folder to the current folder")
  helpLogOutput("download", "[file1 file2 file3 ...]", "Download a file or folder from the current folder")
}


function helpLogOutput(command, args, description) {
  const terminalBody = terminalElement.querySelector('#terminal-body');
  const output = document.createElement('div');

  const commandSpan = document.createElement('span');
  commandSpan.style.color = '#00FF00';
  commandSpan.textContent = command.padEnd(10);
  commandSpan.style.whiteSpace = 'pre';

  const argsSpan = document.createElement('span');
  argsSpan.style.color = '#ffcc00';
  argsSpan.textContent = args ? ` ${args.padEnd(27)}` : '';
  argsSpan.style.whiteSpace = 'pre';

  const descSpan = document.createElement('span');
  descSpan.style.color = '#D3D3D3';
  descSpan.textContent = description ? ` - ${description}` : '';
  descSpan.style.whiteSpace = 'pre';

  output.appendChild(commandSpan);
  output.appendChild(argsSpan);
  output.appendChild(descSpan);

  terminalBody.appendChild(output);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}


async function ls_func(path) {
  let allFiles = ls_impl(document);
  if (!path || path.trim() === "") {
    logOutput(`Listing files in current folder:`, "orange");
    const maxNameLen = Math.max(...allFiles.map(f => f.name.length));
    const maxFileTypeLen = Math.max(...allFiles.map(f => f.fileType.length));
    allFiles.forEach(file => {
      logOutput(`${file.name.padEnd(maxNameLen)}   ${file.fileType.padEnd(maxFileTypeLen)} ${file.isShared ? "- (Shared)" : ""}`);
    });
    logOutput(`ls: command succeeded.`, "#00FF00");
    return;
  }
  const parts = path.split("/");
  let skipFirst = false;
  if (parts && parts[0].trim() === "~") {
    allFiles = ls_impl(await loadDocFromUrl("https://drive.google.com/drive/"));
    logOutput(`ls: traveled to: ~...`);
    skipFirst = true;
  }
  for (let i = 0; i < parts.length; i++) {
    if (skipFirst) {
      skipFirst = false;
      continue;
    }
    const part = parts[i].trim();
    if (part === ".") {
      continue;
    } else if (part === "..") {
      navs = document.querySelectorAll('nav');
      if (navs.length < 2) {
        logOutput("ls: traveling to \"..\": already at root directory. Exiting.", "red");
        return;
      }
      n = document.querySelectorAll('nav')[1];
      c = n.children[2].children;
      b = c[c.length - 2].children[0];
      // TODO
      logOutput("ls with path: '..' not supported yet.", "red");
      return;
    } else {
      const c = getFileInfo(part, allFiles);
      if (!c || c.fileType !== 'Folder') {
        logOutput(`ls: traveling to "${part}": folder not found. Exiting.`, "red");
        return;
      }
      const doc = await loadDocFromUrl(c.url);
      allFiles = ls_impl(doc);
      logOutput("ls: traveled to: " + part + "...");
    }
  }
  logOutput(`Listing files in folder: "${path}"`, "orange");
  const maxNameLen = Math.max(...allFiles.map(f => f.name.length));
  const maxFileTypeLen = Math.max(...allFiles.map(f => f.fileType.length));
  allFiles.forEach(file => {
    logOutput(`${file.name.padEnd(maxNameLen)}   ${file.fileType.padEnd(maxFileTypeLen)} ${file.isShared ? "- (Shared)" : ""}`);
  });
  logOutput(`ls ${path}: command succeeded.`, "#00FF00");
}

async function cd_func(path) {
  const parts = path.split("/");
  let skipFirst = false;
  if (parts && parts[0].trim() === "~") {
    navs = document.querySelectorAll('nav');
    if (navs.length < 2) {
      logOutput("cd ..: already at root directory. Exiting.", "red");
      return;
    }
    n = document.querySelectorAll('nav')[1];
    c = n.children[2].children;
    b = c[0].children[0];
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
      b.dispatchEvent(new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
      }));
    });
    logOutput(`cd ~: succeeded.`);
    skipFirst = true;
    if (parts.length > 1) {
      await wait(700);  // delay needed for navigation to complete
    }
  }
  for (let part of parts) {
    if (skipFirst) {
      skipFirst = false;
      continue;
    }
    part = part.trim();
    if (part === ".") {
      continue;
    } else if (part === "..") {
      navs = document.querySelectorAll('nav');
      if (navs.length < 2) {
        logOutput("cd ..: already at root directory. Exiting.", "red");
        return;
      }
      n = document.querySelectorAll('nav')[1];
      c = n.children[2].children;
      b = c[c.length - 2].children[0];
      const events = ['mousedown', 'mouseup', 'click'];
      events.forEach(eventType => {
        b.dispatchEvent(new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        }));
      });
      logOutput(`cd ${part}: succeeded.`);
    } else {
      const c = getFileInfo(part);
      if (!c || c.fileType !== 'Folder') {
        logOutput(`cd ${part}: folder not found. Exiting.`, "red");
        return;
      }
      c.component.click();
      await wait(100);  // delay needed to register click
      const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
      });
      c.component.dispatchEvent(enterEvent);
      logOutput(`cd ${part}: succeeded.`);
    }
    if (part !== parts[parts.length - 1]) {
      await wait(700);  // delay needed for navigation to complete
    }
  }
  logOutput(`cd command succeeded.`, "#00FF00");
}

async function open_func(name) {
  const c = getFileComponent(name);
  if (!c) {
    logOutput(`File not found: "${name}"`, "red");
    return;
  }
  c.click();
  await wait(100);  // delay needed to register click
  const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
  });
  c.dispatchEvent(enterEvent);
  logOutput(`Opened file: "${name}"`, "#00FF00");
}

async function rename_func(name, newName) {
  const c = getFileComponent(name);
  if (!c) {
    logOutput(`File not found: "${name}"`, "red");
    return;
  }
  c.querySelector("[aria-label~='Rename']").click();

  await wait(200);  // delay needed for rename popup to appear

  Array.from(document.querySelectorAll('input')).pop().value = newName;
  document.querySelector("button[name~=ok]").click();

  logOutput(`Renamed file: "${name}" to "${newName}"`, "");
}

async function rm_func(name) {
  const c = getFileComponent(name);
  if (!c) {
    logOutput(`File not found: "${name}"`, "red");
    return;
  }
  c.click();
  await wait(100);  // delay needed to register click
  const d = document.querySelector("[aria-label~='Delete']");
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    d.dispatchEvent(new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    }));
  });
  logOutput(`Deleted file: "${name}"`, "#00FF00");
}

async function new_func(type, folderName) {
  if (type === 'folder' && !folderName) {
    logOutput("Please provide a folder name for the new folder.", "red");
    return;
  }
  b = document.querySelector("button[guidedhelpid='new_menu_button'");
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    b.dispatchEvent(new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    }));
  });
  await wait(100);  // delay needed for upload menu to appear
  let u;
  const all = document.querySelectorAll('[role="menuitem"][aria-haspopup="true"]');
  switch (type) {
    case 'docs':
      all.forEach(item => {
        if (item.innerText.includes("Google Docs")) {
          u = item;
        }
      });
      break;
    case 'sheets':
      all.forEach(item => {
        if (item.innerText.includes("Google Sheets")) {
          u = item;
        }
      });
      break;
    case 'slides':
      all.forEach(item => {
        if (item.innerText.includes("Google Slides")) {
          u = item;
        }
      });
      break;
    case 'folder':
      u = document.querySelectorAll('[aria-label~="New"]')[1]
      break;
    default:
      logOutput(`Unknown type for upload command: "${type}"`, "red");
      return;
  }
  [...events, ...events].forEach(eventType => {  // for some reason needs twice
    u.dispatchEvent(new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    }));
  });
  if (type === 'folder') {
    await wait(200);  // delay needed for name popup to appear
    Array.from(document.querySelectorAll('input')).pop().value = folderName;
    Array.from(document.querySelectorAll("button")).forEach(item => {
      if (item.textContent.includes("Create")) {
        item.click();
      }
    });
    logOutput(`Create folder with name: "${folderName}"`, "#00FF00");
  } else {
    logOutput(`Started creation for type: "${type}"`, "#00FF00");
  }
}

async function upload_func(type) {
  b = document.querySelector("button[guidedhelpid='new_menu_button'");
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    b.dispatchEvent(new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    }));
  });
  await wait(100);  // delay needed for upload menu to appear
  let u;
  switch (type) {
    case 'file':
      u = document.querySelectorAll('[aria-label~="File"]')[2]
      break; 
    case 'folder':
      u = document.querySelectorAll("[aria-label~='Folder']")[4];
      break;
    default:
      logOutput(`Unknown type for upload command: "${type}"`, "red");
      return;
  }
  [...events, ...events].forEach(eventType => {  // for some reason needs twice
    u.dispatchEvent(new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    }));
  });
  logOutput(`Started upload dialog for type: "${type}"`, "#00FF00");
}

function download_func(name) {
  const c = getFileComponent(name);
  if (!c) {
    logOutput(`File not found: "${name}"`, "red");
    return;
  }
  c.querySelector("[aria-label~='Download']").click();
  logOutput(`Started download for file: "${name}"`, "#00FF00");
}

function clear_func() {
  const terminalBody = terminalElement.querySelector('#terminal-body');
  terminalBody.innerHTML = '';
  const welcomeMessage = document.createElement('div');
  welcomeMessage.innerHTML = `
    <div style="color: #ffcc00;">Drive-WebCLI v1.0</div>
    <div style="color: #ffcc00;">Ctrl+E to toggle terminal window visibility</div>
    <div style="color: #ffcc00;">'help' for available commands</div>
    <br>
  `;
  terminalBody.appendChild(welcomeMessage);
}

async function handleCommand(command, terminalBody) {
  const [c, ...args] = command.split(" ");
  switch (c) {
    case 'help':
      help_func();
      break;
    case 'ls':
      if (args.length !== 1 && args.length !== 0) {
        logOutput("Usage: ls [optional:path]", "red");
      }
      await ls_func(args[0]);
      break;  
    case 'cd':
      if (args.length !== 1) {
        logOutput("Usage: cd [path]", "red");
      }
      await cd_func(args[0]);
      break;
    case 'open':
      if (args.length !== 1) {
        logOutput("Usage: open [file]", "red");
      } else {
        await open_func(args[0]);
      }
      break;
    case 'rename':  // TODO: handle whitespaced names
      if (args.length !== 2) {
        logOutput("Usage: rename [old] [new]", "red");
      } else {
        await rename_func(args[0], args[1]);
      }
      break;
    case 'rm':
      if (args.length === 0) {
        logOutput("Usage: rm [file(s)]", "red");
      } else {
        for (const name of args) {
          await rm_func(name);
        }
      }
      break;  
    case 'new':
      if (args.length !== 1 && args.length !== 2) {
        logOutput("Usage: new [docs|sheets|slides] | [new folder] [name]", "red");
      } else {
        await new_func(args[0], args[1]);
      }
      break;  
    case 'upload':
      if (args.length !== 1) {
        logOutput("Usage: upload [file|folder]", "red");
      } else {
        await upload_func(args[0]);
      }
      break;
    case 'download':
      if (args.length === 0) {
        logOutput("Usage: download [file(s)]", "red");
      } else {
        for (const name of args) {
          download_func(name);
        }
      }
      break;
    case 'clear':
      clear_func();
      break;
    case 'opacity':
      if (args.length !== 1) {
        logOutput("Usage: opacity [value]", "red");
      } else {
        const value = parseFloat(args[0]);
        if (isNaN(value) || value < 0.0 || value > 1.0) {
          logOutput("Opacity value must be between 0.0 and 1.0", "red");
        } else {
          terminalElement.style.backgroundColor = `rgba(0, 0, 0, ${value})`;
          logOutput(`Set terminal opacity to ${value}`, "#00FF00");
        }
      }
      break
    default:
      logOutput(`Unknown command: ${command}`, "red");
      break;
  }
  const newLine = document.createElement('div');
  newLine.innerHTML = '<br>';
  terminalBody.appendChild(newLine);
}

function logOutput(text, color) {
  const terminalBody = terminalElement.querySelector('#terminal-body');
  const output = document.createElement('div');
  output.style.color = color || '#ffcc00';
  output.style.whiteSpace = 'pre-wrap';
  output.textContent = text;
  terminalBody.appendChild(output);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}


// ===== Terminal UI  =====
let terminalVisible = false;
let terminalElement = null;

function injectTerminal() {
  terminalElement = document.createElement('div');
  terminalElement.id = 'terminal-container';
  terminalElement.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 70%;
    height: 60%;
    max-width: 90%;
    max-height: 80%;
    background-color: rgba(0, 0, 0, 0.7);
    border: 2px solid #ffcc00;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
    z-index: 10000;
    display: none;
    flex-direction: column;
    font-family: monospace;
    font-weight: bold;
  `;
  terminalElement.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const input = terminalElement.querySelector('#terminal-input');
      input.focus();
    }
  });

  const headerBar = document.createElement('div');
  headerBar.id = 'terminal-header';
  headerBar.style.cssText = `
    background-color: black;
    padding: 5px 10px;
    cursor: move;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ffcc00;
  `;

  const title = document.createElement('span');
  title.textContent = 'Drive-WebCLI v1.0';
  title.style.cssText = `
    color: #ffcc00;
    font-weight: bold;
    font-size: 14px;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.cssText = `
    background-color: #ffcc00;
    color: white;
    border: none;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-weight: bold;
  `;
  closeButton.onclick = () => {
    terminalElement.style.display = 'none';
    terminalVisible = false;
  };

  headerBar.appendChild(title);
  headerBar.appendChild(closeButton);
  terminalElement.appendChild(headerBar);

  const terminalBody = document.createElement('div');
  terminalBody.id = 'terminal-body';
  terminalBody.style.cssText = `
    flex: 1;
    padding: 10px;
    overflow-y: auto;
    background-color: transparent;
    color: #ffcc00;
    border: 2px solid #ffcc00;
    font-size: 14px;
    line-height: 1.4;
  `;

  const welcomeMessage = document.createElement('div');
  welcomeMessage.innerHTML = `
    <div style="color: #ffcc00;">Drive-WebCLI v1.0</div>
    <div style="color: #ffcc00;">Ctrl+E to toggle terminal window visibility</div>
    <div style="color: #ffcc00;">'help' for available commands</div>
    <br>
  `;
  terminalBody.appendChild(welcomeMessage);
  terminalElement.appendChild(terminalBody);

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    display: flex;
    padding: 10px;
    background-color: transparent;
    border-top: 1px solid #ffcc00;
  `;

  const promptSpan = document.createElement('span');
  promptSpan.textContent = '> ';
  promptSpan.style.cssText = `
    color: #ffcc00;
    margin-right: 5px;
    white-space: nowrap;
  `;

  const commandInput = document.createElement('input');
  commandInput.type = 'text';
  commandInput.autocomplete = 'off';
  commandInput.id = 'terminal-input';
  commandInput.style.cssText = `
    flex: 1;
    background-color: transparent;
    color: #ffcc00;
    border: 1px solid #ffcc00;
    border-radius: 3px;
    padding: 5px;
    font-family: monospace;
    font-size: 14px;
  `;

  commandInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.value.trim();
      if (command) {
        const userCmd = document.createElement('div');
        userCmd.innerHTML = `<span style="color: #ffcc00;">> ${command}</span>`;
        terminalBody.appendChild(userCmd);

        await handleCommand(command, terminalBody);

        commandInput.value = '';
        commandInput.focus();

        terminalBody.scrollTop = terminalBody.scrollHeight;
      }
    }
  });

  inputContainer.appendChild(promptSpan);
  inputContainer.appendChild(commandInput);
  terminalElement.appendChild(inputContainer);

  document.body.appendChild(terminalElement);

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      toggleTerminal();
    }
  });

  const resizerBottom = document.createElement('div');
  resizerBottom.style.cssText = `
    width: 100%;
    height: 5px;
    background-color: #ffcc00;
    cursor: ns-resize;
    position: absolute;
    bottom: 0;
    left: 0;
  `;

  const resizerRight = document.createElement('div');
  resizerRight.style.cssText = `
    width: 5px;
    height: calc(100% - 30px); /* Account for header height */
    background-color: #ffcc00;
    cursor: ew-resize;
    position: absolute;
    top: 30px; /* Account for header height */
    right: 0;
  `;

  resizerBottom.addEventListener('mousedown', (e) => initResize(e, 'bottom'), false);
  resizerRight.addEventListener('mousedown', (e) => initResize(e, 'right'), false);
  terminalElement.appendChild(resizerBottom);
  terminalElement.appendChild(resizerRight);

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  headerBar.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    terminalElement.style.top = Math.min(Math.max(0, terminalElement.offsetTop - pos2), window.innerHeight - terminalElement.offsetHeight) + "px";
    terminalElement.style.left = Math.min(Math.max(0, terminalElement.offsetLeft - pos1), window.innerWidth - terminalElement.offsetWidth) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }

  function initResize(e, direction) {
    e.preventDefault();
    e.stopPropagation();

    function resizeHandler(moveEvent) {
      const rect = terminalElement.getBoundingClientRect();
      const mouseX = moveEvent.clientX;
      const mouseY = moveEvent.clientY;

      if (direction === 'bottom') {
        // calculate new height based on mouse position relative to terminal top
        const newHeight = mouseY - rect.top;
        if (newHeight > 200) { // minimum height constraint
          terminalElement.style.height = newHeight + 'px';
        }
      } else if (direction === 'right') {
        // calculate new width based on mouse position relative to terminal left
        const newWidth = mouseX - rect.left;
        if (newWidth > 300) { // minimum width constraint
          terminalElement.style.width = newWidth + 'px';
        }
      }
    }

    function stopResizeHandler() {
      window.removeEventListener('mousemove', resizeHandler);
      window.removeEventListener('mouseup', stopResizeHandler);
    }

    window.addEventListener('mousemove', resizeHandler);
    window.addEventListener('mouseup', stopResizeHandler);
  }
}

function toggleTerminal() {
  if (terminalElement) {
    terminalVisible = !terminalVisible;
    terminalElement.style.display = terminalVisible ? 'flex' : 'none';

    if (terminalVisible) {
      const input = terminalElement.querySelector('#terminal-input');
      // focus input when showing
      setTimeout(() => input.focus(), 100);
    }
  }
}

function injectIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'drive-webcli-indicator';
  indicator.textContent = '  Drive-WebCLI v1.0 - Enabled\n   Toggle View: Ctrl+E';
  indicator.style.cssText = `
    white-space: pre-wrap;
    position: fixed;
    bottom: 70px;
    left: 10px;
    padding: 5px 35px;
    background-color: rgba(0, 0, 0, 0.7);
    color: #ffcc00;
    font-family: monospace;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid #ffcc00;
    clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%);
    z-index: 99999;
    pointer-events: none;
    box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
    user-select: none;
  `;
  document.body.appendChild(indicator);
}

function main() {
	injectTerminal();
  injectIndicator();
	console.log("Drive-WebCLI v1.0 Enabled.");
}
main();
