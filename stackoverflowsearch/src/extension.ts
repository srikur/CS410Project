// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cheerio from 'cheerio';
import { isArgumentsObject } from 'util/types';

class BM25 {
    private k1: number;
    private b: number;
    private epsilon: number;
    private corpus_size: number;
    private avgdl: number;
    private doc_freqs: any[];
    private idf: { [id: string] : number; };
    private doc_len: any[];
    private nd: any;

    constructor(corpus: any[], k1: number = 1.5, b: number = 0.75, epsilon: number = 0.25) {
        this.k1 = k1;
        this.b = b;
        this.epsilon = epsilon;
        this.corpus_size = 0;
        this.avgdl = 0;
        this.doc_freqs = [];
        this.idf = {};
        this.doc_len = [];

        this.nd = this._initialize(corpus);
        this._calc_idf();
    }

    private _preprocess(document: string) {
        let stopwords: string[] = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", 
                     "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 
                     'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 
                     'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 
                     'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 
                     'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 
                     'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
                     'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 
                     'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 
                     'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 
                     'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 
                     'can', 'will', 'just', 'don', "don't", 'should', "should've", 'now', 'd', 'll', 'm', 'o', 're', 
                     've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn', "doesn't", 
                     'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', 
                     "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 
                     'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't"];
        let documentWords: string[] = document.split(" ");
        for (let word of documentWords) {
            // remove any non-alphanumeric characters
			word = word.replace(/[^a-zA-Z0-9]/g, '');
			// convert to lowercase
			word = word.toLowerCase();
			// remove stopwords
			if (stopwords.includes(word)) {
				word = "";
			}
        }
		// remove empty strings
		documentWords = documentWords.filter(word => word !== "");
		return documentWords;
    }

    private _initialize(corpus: any[]) {
		let nd: any = {};
		let num_doc = 0;
		for (let document of corpus) {
			document = this._preprocess(document);
			this.doc_len.push(document.length);
			num_doc += document.length;

			let frequencies: any = {};
			for (let word of document) {
				if (!(word in frequencies)) {
					frequencies[word] = 0;
				}
				frequencies[word] += 1;
			}
			this.doc_freqs.push(frequencies);

			for (let word in frequencies) {
				try {
					nd[word] += 1;
				} catch (error) {
					nd[word] = 1;
				}
			}

			this.corpus_size += 1;
		}
		this.avgdl = num_doc / this.corpus_size;
		return nd;
    }

    private _calc_idf() {
		let idf_sum = 0;
		let negative_idfs: any[] = [];
		for (let word in this.nd) {
			let freq = this.nd[word];
			let idf = Math.log(this.corpus_size - freq + 0.5) - Math.log(freq + 0.5);
			this.idf[word] = idf;
			idf_sum += idf;
			if (idf < 0) {
				negative_idfs.push(word);
			}
		}
		this.avgdl = idf_sum / Object.keys(this.idf).length;
		let eps = this.epsilon * this.avgdl;
		for (let word of negative_idfs) {
			this.idf[word] = eps;
		}
    }

	// Python code to convert:
	// def get_scores(self, query):
    //     score = np.zeros(self.corpus_size)
    //     doc_len = np.array(self.doc_len)
    //     for q in query:
    //         q_freq = np.array([(doc.get(q) or 0) for doc in self.doc_freqs])
    //         score += (self.idf.get(q) or 0) * (q_freq * (self.k1 + 1) /
    //                                            (q_freq + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)))
    //     return score
	public get_scores(query: string) {
		let score: number[] = [];
		let doc_len = this.doc_len;
		let queryWords = this._preprocess(query);
		for (let q of queryWords) {
			let q_freq: number[] = [];
			for (let doc of this.doc_freqs) {
				q_freq.push(doc[q] || 0);
			}
			let idf = this.idf[q] || 0;
			for (let i = 0; i < q_freq.length; i++) {
				score[i] += idf * (q_freq[i] * (this.k1 + 1) / (q_freq[i] + this.k1 * (1 - this.b + this.b * doc_len[i] / this.avgdl)));
			}
		}
		return score;
	}
}

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

		console.log(st_questions);
		console.log(st_answers);

		// 2. calculate the relevance of the questions to the highlighted text
		// Using bm25 algorithm
		let bm25 = new BM25(st_questions);
		let scores = bm25.get_scores(highlighted);
		console.log(scores);

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
