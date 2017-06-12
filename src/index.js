"use strict";
const {shell:$} =

// Helper functions
require("./utils/other.js");
require("./utils/global.js");
require("./utils/buffer.js");

// Custom commands
require("./commands/display.js");
require("./commands/editor.js");
require("./commands/other.js");
require("./commands/quotes.js");
require("./commands/text-alignment.js");
require("./commands/pull-requests.js");


// Disable pending items / Fix focus for docked tree-view
atom.workspace.onDidAddPaneItem(event => {
	const {pane} = event;
	pane.setPendingItem(null);
	pane.focus();
});


// Increase token limit
loadGrammar("source.js").then(js => js.maxTokensPerLine = 500);


// Undo whitespace molestation applied by Project-Manager
$ `make could-you-not`;


atom.workspace.observeTextEditors(editor => {
	
	// Set tab-width to that specified by file's modeline
	editor.emitter.on("did-change-indentation", () => {
		let text = editor.getText();
		let tabStop = text.match(/(?:^|\s)vi(?:m[<=>]?\d+|m?):.*?[: ](?:ts|tabstop)\s*=(\d+)/i);
		if(tabStop){
			const {setTabLength} = editor.constructor.prototype;
			setTabLength.call(editor, +tabStop[1]);
		}
	});
});