// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cheerio from 'cheerio';
import { isArgumentsObject } from 'util/types';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "stackoverflowsearch" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('stackoverflowsearch.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Attempting to retrieve StackOverflow results');

		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		const selection = editor?.selection;
		if (!selection || selection.isEmpty) {return;}
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
		let urls: string[] = [];
		let st_questions: string[] = [];
		let st_answers: string[] = [];
		https.get(query, (resp: any) => {
			let data = '';
			resp.on('data', (chunk: any) => {
				data += chunk;
			});
			resp.on('end', () => {
				// get the URLs of the top 5 results
				const $ = cheerio.load(data);
				$("li.b_algo").each(function(i: any, elem: any) {
					let url = $(this).find("a").attr("href");
					if (url && url.includes("stackoverflow.com")) {
						urls.push(url);
					}
				});
				urls = urls.slice(0, 5);

				urls.forEach(url => {
					// Need to get the body of the stackoverflow page
					https.get(url, (resp: any) => {
						let data = '';
						resp.on('data', (chunk: any) => {
							data += chunk;
						});
						resp.on('end', () => {
							// get the text of the stackoverflow page
							const $ = cheerio.load(data);
							let posts = $(".js-post-body");
							let question_text = $(posts[0]).text();
							let answer_html = $(posts[1]).html();

							st_questions.push(question_text);
							if (answer_html !== null) {
								st_answers.push(answer_html);
							}
						});
					}).on("error", (err: any) => {
						console.log("Error: " + err.message);
					});
				});
			});
		}).on("error", (err: any) => {
			console.log("Error: " + err.message);
		});

		// 2. calculate the relevance of the questions to the highlighted text
		// Using bm25 algorithm
		const nodecallspython = require('node-calls-python');
		const py = nodecallspython.interpreter;

		let scores: number[] = [];
		py.import("bm25.py").then(async function(pymodule) {
			const pyobj = py.createSync(module, "BM25", st_questions);
			const ret_scores = await py.callSync(pyobj, "get_scores", highlighted);
			scores = ret_scores;
		});

		// 3. Display the top answer's content in a window
		// Get the index of the highest score
		let max_score = 0;
		let max_score_index = 0;
		for (let i = 0; i < scores.length; i++) {
			if (scores[i] > max_score) {
				max_score = scores[i];
				max_score_index = i;
			}
		}

		// Display the HTML of the highest score in a new window
		const panel = vscode.window.createWebviewPanel(
			'stackoverflowsearch',
			'StackOverflow Search',
			vscode.ViewColumn.One,
			{}
		);
		panel.webview.html = st_answers[max_score_index];
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
