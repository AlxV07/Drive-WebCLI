# Drive-WebCLI

<img src="images/logo.png" alt="Drive-WebCLI Logo" width="50%"/>

A light-weight Chrome Extension enabling an in-browser CLI for Google Drive.

![Demo image](images/demo.png)

## Installation

1. Clone the repository / download as ZIP and extract into a local directory.
2. Open `chrome://extensions/` in Chrome.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the project directory.

## Usage

Drive-WebCLI is automatically enabled in any `https://drive.google.com/*`  tab created after installing and turning on the Extension.

Ctrl+E / Control+E (Mac) toggles terminal visibility.  The terminal interface is draggable and resizeable, and background opacity settings can be customized.

Entering `help` displays currently implemented commands and their respective usages.

List of some implemented commands:
* `ls [optional:path]` - List all files in the current Drive folder or folder specified at path (relative or starting from root `~`).
* `cd [path]` - Open the given Driven folder at the given path (relative to the current Drive folder or starting from root `~`).
* `open [file]` - Open a file or folder in the current Drive folder (follows default Drive behavior when deciding to open in a new tab or the current one).
* `rename [old] [new]` - Rename a file or folder in the current Drive folder.
* `rm [file1 file2 file3 ...]` - Remove all listed files or folders from the current Drive folder, in order of first occurence.
* `upload [file|folder]` - Upload a local file or folder to the current Drive folder.
* `download [file1 file2 file3 ...]` - Download a file or folder from the current Drive folder.
* `opacity [value]` - Set the opacity of the terminal; takes a float value from `0.0 (transparent)` to `1.0 (solid black)`.
* `help` - Display the help page containing all implemented commands and usages.

Tab completion is implemented for commands and files (limited functionality for files outside of current Drive folder and files with spaces in name).

Command history stores up to 50 previous commands using local storage.

## Security

* Drive-WebCLI does NOT save any information about users' Google Drive accounts or content.  All functionality is implemented through in-webpage document parsing.  However, this approach is fragile to structural Google Drive updates; bug reports are very welcome!
* Chrome Extension permissions requested and purposes (see Google Chrome Extensions documentation for more details): "scripting" - to start and run Drive-WebCLI; "storage" - to save command history and preferences.  You can verify permissions by viewing the `manifest.json` file.
* We are open-source to ensure safe and secure application usage. Be wary of non-open-source Chrome Extensions for malicious behavior.

## Update Log

### v1.1
- refactor: split single content script into modularized files (commands + ui)
- feat: added tab completion for commands and limited functionality for files
- feat: added command history (stores up to 50 commands).
- feat: `ls` handles `..` in path; updated ls display
- feat: all commands handle folders / files w/ spaces in name via quotes (e.g. `cd "A Folder With Spaces"`)
- feat: added Update Log to README.md

### v1.0
- initial release

## Contributing

Suggestions are welcome!  Please open an Issue to recommend a feature or report a bug, or submit a PR directly to the `todo.txt` file if you really want to!

## License

Apache 2.0 License (see `LICENSE.txt`)
