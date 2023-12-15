"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const cheerio = __importStar(require("cheerio"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "stackoverflowsearch" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('stackoverflowsearch.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello Srikur');
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        const selection = editor?.selection;
        if (!selection || selection.isEmpty) {
            return;
        }
        const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
        const highlighted = editor.document.getText(selectionRange);
        // Search Bing, limiting the responses to stackoverflow.com. THen, get the URLs of the top 5 results
        // DO not use the Bing API, as it requires a subscription key
        // Instead, use the Bing search engine directly
        // Build the query URL
        // make the text compatible with the URL
        let text = highlighted;
        text = text.replace(" ", "%20");
        text = text.replace("\n", "%20");
        text = text.replace("#", "%23");
        text = text.replace("/", "");
        let query = "https://www.bing.com/search?q=" + text + "+site%3Astackoverflow.com";
        // use Node.js HTTP library to get the HTML of the query
        const https = require('https');
        https.get(query, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                // get the URLs of the top 5 results
                const $ = cheerio.load(data);
                let urls = [];
                $('a').each(function (i, elem) {
                    let url = $(this).attr('href');
                    if (url && url.includes("stackoverflow.com")) {
                        urls.push(url);
                    }
                });
                urls = urls.slice(0, 5);
                // Open the URLs in the browser
                urls.forEach(url => {
                    console.log(url);
                });
            });
        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map