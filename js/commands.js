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
  logOutput("Drive-WebCLI v1.1 - Available commands:", "orange")
  helpLogOutput("help", "", "Show this help page")
  helpLogOutput("clear", "", "Clear terminal output display")
  helpLogOutput("opacity", "[value]", "Set terminal opacity (0.0 to 1.0)")
  helpLogOutput("ls", "[optional:path]", "List files in current or specified folder")
  helpLogOutput("cd",  "[optional:path]", "Walk step by step up / down folders along specified path (or to root with '~' or if no path given)")
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

function lsLogOutput(name, fileType, sharedInfo) {
  const terminalBody = terminalElement.querySelector('#terminal-body');
  const output = document.createElement('div');

  const nameSpan = document.createElement('span');
  nameSpan.style.color = '#ffcc00';
  nameSpan.textContent = name;
  nameSpan.style.whiteSpace = 'pre';

  const fileTypeSpan = document.createElement('span');
  fileTypeSpan.style.color = '#FFFFFF';
  fileTypeSpan.textContent = `   ${fileType}`;
  fileTypeSpan.style.whiteSpace = 'pre';

  const sharedInfoSpan = document.createElement('span');
  sharedInfoSpan.style.color = '#ffcc00';
  sharedInfoSpan.textContent = ` ${sharedInfo}`;
  sharedInfoSpan.style.whiteSpace = 'pre';

  output.appendChild(nameSpan);
  output.appendChild(fileTypeSpan);
  output.appendChild(sharedInfoSpan);

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
      lsLogOutput(`${file.name.padEnd(maxNameLen)}`, `${file.fileType.padEnd(maxFileTypeLen)}`, `${file.isShared ? "(Shared)" : ""}`);
    });
    logOutput(`ls: command succeeded.`, "#00FF00");
    return;
  }
  const parts = path.split("/");
  let skipFirst = false;
  if (parts && parts[0].trim() === "~") {
    allFiles = ls_impl(await loadDocFromUrl("https://drive.google.com/drive/"));
    logOutput(`ls: internally traveled to: ~...`);
    skipFirst = true;
  }
  let nof_back = 1;  // number of .. to skip the "Up to parent" entry
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
        logOutput("ls: internally traveling to \"..\": already at root directory. Exiting.", "red");
        return;
      }
      n = document.querySelectorAll('nav')[1];
      c = n.children[2].children;
      b = c[c.length - 1 - nof_back].children[0];
      folderId = b.getAttribute("data-id").trim();
      allFiles = ls_impl(await loadDocFromUrl("https://drive.google.com/drive/folders/" + folderId));
      nof_back++;
      logOutput("ls: internally traveled to: ..");
    } else {
      const c = getFileInfo(part, allFiles);
      if (!c || c.fileType !== 'Folder') {
        logOutput(`ls: internally traveling to "${part}": folder not found. Exiting.`, "red");
        return;
      }
      const doc = await loadDocFromUrl(c.url);
      allFiles = ls_impl(doc);
      logOutput("ls: internally traveled to: " + part + "...");
    }
  }
  logOutput(`Listing files in folder: "${path}"`, "orange");
  const maxNameLen = Math.max(...allFiles.map(f => f.name.length));
  const maxFileTypeLen = Math.max(...allFiles.map(f => f.fileType.length));
  allFiles.forEach(file => {
    lsLogOutput(`${file.name.padEnd(maxNameLen)}`, `${file.fileType.padEnd(maxFileTypeLen)}`, `${file.isShared ? "- (Shared)" : ""}`);
  });
  logOutput(`ls ${path}: command succeeded.`, "#00FF00");
}

async function cd_func(path) {
  const parts = path.split("/");
  let skipFirst = false;
  if ((parts && parts[0].trim() === "~") || !parts) {
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
    <div style="color: #ffcc00;">Drive-WebCLI v1.1</div>
    <div style="color: #ffcc00;">Ctrl+E to toggle terminal window visibility</div>
    <div style="color: #ffcc00;">'help' for available commands</div>
    <br>
  `;
  terminalBody.appendChild(welcomeMessage);
}

const history_maxlen = 50;
let cur_cmd_idx = 0;

async function save_command(command) {
  if (command.trim() === "") {
    return;
  }
  await chrome.storage.local.get(["cmd_hist"], async function(items) {
    if (!items || items.length === 0) {
      items = [{}];
    }
    let history = items["cmd_hist"];
    if (!history) {
      history = [];
    }
    history.push(command);
    if (history.length > history_maxlen) {
      history = history.slice(history.length - history_maxlen);
    }
    await chrome.storage.local.set({"cmd_hist": history});
  });
}

async function getPreviousCommand() {
  const items = await chrome.storage.local.get(["cmd_hist"]);
  let history = items["cmd_hist"] || [];
  let out = null;
  if (cur_cmd_idx < history.length) {
    cur_cmd_idx++;
    out = history[history.length - cur_cmd_idx];
  }
  return out; 
}

async function getNextCommand() {
  const items = await chrome.storage.local.get(["cmd_hist"]);
  const history = items["cmd_hist"] || [];
  let out = null;
  if (cur_cmd_idx > 1) {
    cur_cmd_idx--;
    out = history[history.length - cur_cmd_idx];
  } else if (cur_cmd_idx === 1) {
    cur_cmd_idx = 0;
    out = ""; 
  }
  return out;
}

async function handleCommand(command, terminalBody) {
  await save_command(command);
  if (command === '..') {
    command = 'cd ..';
  }
  cur_cmd_idx = 0;
  // args are split like file names; if in quotes, keep spaces
  const [c, ...args] = command.match(/(?:[^\s"]+|"[^"]*")+/g).map(arg => arg.replace(/(^"|"$)/g, ''));
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
      if (args.length !== 1 && args.length !== 0) {
        logOutput("Usage: cd [optional:path]", "red");
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
