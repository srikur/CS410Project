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

		// Build the query URL
		// make the text compatible with the URL
		let text = highlighted;
		text = text.replace(" ", "%20");
		text = text.replace("\n", "%20");
		text = text.replace("#", "");
		text = text.replace("/", "");

		// use Node.js HTTP library to get the HTML of the query
		const https = require('https');
		let urls: string[] = [];
		let st_questions: string[] = [];
		let st_answers: string[] = [];

		// Use Google custom search API
		const api_key = "AIzaSyBe_iLeqX-82btASX-6XE5AcmCidO_yIFE";
		const cx = "60debd4612ccc4f2d";
		const url = "https://www.googleapis.com/customsearch/v1?key=" + api_key + "&cx=" + cx + "&q=" + text;

		// Use HTTP get to get the JSON response
		https.get(url, (resp: any) => {
			let data = '';
			resp.on('data', (chunk: any) => {
				data += chunk;
			});
			resp.on('end', () => {
				// Parse the JSON response
				let json = JSON.parse(data);

				// Get the URLs of the top 5 results
				for (let i = 0; i < 5; i++) {
					urls.push(json.items[i].link);
				}

				// Get the question IDs for the urls
				let questionIds: string[] = [];
				for (let url of urls) {
					let id = url.split("/")[4];
					questionIds.push(id);
				}

				// fetch(`https://api.stackexchange.com/2.3/questions/${questionId}?order=desc&sort=activity&site=stackoverflow&filter=withbody`);

				// Get the JSON results of the top 5 questions
				const promises = [];
				// Wait for all the promises to resolve
				for (let questionId of questionIds) {
					promises.push(fetch(`https://api.stackexchange.com/2.3/questions/${questionId}?order=desc&sort=activity&site=stackoverflow&filter=withbody`));
				}

				// Get the JSON results of the top 5 questions
				Promise.all(promises).then((responses) => {
					// Get the JSON results of the top 5 questions
					return Promise.all(responses.map((response) => {
						return response.json();
					}));
				}).then((data) => {
					// Get the question and answer HTML
					for (let item of data as any) {
						const question = item.items[0];
						const topAnswer = question.answers?.sort((a: { score: number; }, b: { score: number; }) => b.score - a.score)[0];
						// Add the question and answer HTML to the arrays
						st_questions.push(question.body);
						st_answers.push(topAnswer);
					}

					// Use BM25 to get the top answer
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

					// Display the top question's URL
					vscode.window.showInformationMessage("Top question URL: " + urls[max_score_index]);

				}).catch((error) => {
					console.log(error);
				});
			});
		});
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}