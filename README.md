# CS410Project Project Proposal & Documentation
CS 410 Final Project

## Project Proposal
1.	Srikur Kanuparthy – srikurk2
2.	I plan on making an extension for Visual Studio Code that allows users to more easily find StackOverflow answers to their problems. This is related to the class since VS Code is one of the, if not the, most popular text editors right now.
3.	I plan on using a simple bag of words approach, probably using the Okapi BM25 algorithm or one of the modified versions of the algorithm, to rank StackOverflow answer searches and return the most relevant one to the user.
4.	I will demonstrate that this works as expected by 
5.	I plan on having my extension be available in the marketplace for VS Code extensions. I hope to allow my code to communicate with users’ documents by allowing for in-line code completion, similar to the functionality that GitHub Copilot provides.
6.	VS Code extensions are mostly written in JavaScript, so that is what I will use.
7.	I think this is a task that, when testing and debugging is included, will take much more than 20 hours.

## Project Documentation

### How the software is implemented
The software is implemented as a VS Code extension. The extension is written in TypeScript, which is a superset of JavaScript. The extension uses the VS Code API to interact with the editor and the StackExchange API to search for StackOverflow answers. The extension uses the Okapi BM25 algorithm to rank the StackOverflow questions on relevance to the highlighted text. The Google Custom Search API is used to search for the StackOverflow question that is most relevant to the highlighted text. The extension then displays the URL of the most relevant StackOverflow question as a notification in the bottom right corner of the screen.

### How to Install
1. Download the .vsix file from the releases page
2. Open VS Code
3. Go to the extensions tab
4. Click the three dots in the top right corner
5. Click "Install from VSIX..."
6. Select the .vsix file you downloaded
7. Reload VS Code
8. You should now see the extension in the extensions tab

### How to Use
1. Open a file in VS Code
2. Highlight a comment that you want to find a StackOverflow answer for
3. Press `ctrl+shift+p` to open the command palette
4. Type "Ask StackOverflow!" and select the command
5. When the result is ready, the URL will display as a notification in the bottom right corner of the screen