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
      terminalElement.querySelector('#terminal-input').focus();
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
    margin-top: 3px;    
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
    border: none;
    outline: none;
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
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = await getPreviousCommand();
        if (prev !== null) {
          commandInput.value = prev;
          commandInput.selectionStart = commandInput.selectionEnd = commandInput.value.length;
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = await getNextCommand();
        console.log(next)
        if (next !== null) {
          commandInput.value = next;
          commandInput.selectionStart = commandInput.selectionEnd = commandInput.value.length;
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentInput = commandInput.value.trim();
        const words = currentInput.split(/\s+/);
        if (currentInput === "") {
          return;
        }
        if (words.length === 1) {
          const commands = ['help', 'clear', 'opacity', 'ls', 'cd', 'open', 'rename', 'rm', 'new', 'upload', 'download'];
          const matchingCommands = commands.filter(cmd => cmd.startsWith(words[0]));
          if (matchingCommands.length > 0) {
            commandInput.value = matchingCommands[0];
            return;
          }
        }
        const lastWord = words[words.length - 1];
        let allFiles = ls_impl(document);
        let parts = lastWord.split('/');
        if (parts.length > 1) {
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const c = getFileInfo(part, allFiles);
            if (!c || !c.isFolder) {
              return; 
            }
            const doc = await loadDocFromUrl(c.url);
            allFiles = ls_impl(doc);
          }
        }
        const lastWordOnly = parts[parts.length - 1];
        const matchingFiles = allFiles.filter(file => file.name.startsWith(lastWordOnly));
        if (matchingFiles.length > 0) {
          commandInput.value = words.slice(0, words.length - 1).join(' ') + ' ' +
            (parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') + '/' : '') +
            matchingFiles[0].name;  
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
