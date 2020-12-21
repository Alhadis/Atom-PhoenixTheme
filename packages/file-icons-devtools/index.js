"use strict";

const fs   = require("fs");
const util = require("util");
const exec = require("child_process").exec[util.promisify.custom];
const Atom = require("atom");

const {loadFromCore} = require("../../lib/utils/loaders.js");
const {waitToLoad}   = require("../../lib/utils/other.js");
const {debounce}     = loadFromCore("lodash");
const {sync: which}  = loadFromCore("which");


// Toggle bounding-boxes of visible file-icons
atom.commands.add("atom-workspace", "file-icons:show-outlines", () =>
	document.body.classList.toggle("file-icons-show-outlines"));

// Make `icons.tsv` nicer to edit
watchStyleSheet(`${__dirname}/style.css`);

// Recompile `config.cson` on save
waitToLoad("file-icons").then(pkg => {
	let nodePath = "";
	atom.whenShellEnvironmentLoaded(() => nodePath = which("node").trim());
	atom.workspace.observeTextEditors(editor => {
		let outputPath, recompiler, configPath, openedPath;
		if("config.cson" === editor.getFileName()
		&& fs.existsSync(outputPath = pkg.path + "/lib/icons/.icondb.js")
		&& fs.existsSync(recompiler = pkg.path + "/bin/compile")
		&& fs.existsSync(configPath = pkg.path + "/config.cson")
		&& fs.existsSync(openedPath = editor.getPath())
		&& fs.realpathSync(configPath) === fs.realpathSync(openedPath))
			editor.onDidSave(async result => {
				try{
					const {stdout} = await exec(nodePath, [recompiler], editor.getText());
					if(stdout){
						fs.writeFileSync(outputPath, result.stdout);
						for(const repo of atom.project.repositories)
							repo && repo.projectAtRoot && repo.refreshStatus();
					}
				} finally{}
			});
	});
});


function watch(target, fn, delay = 10, preempt = true){
	preempt && fn(target);
	const symlink = fs.lstatSync(target).isSymbolicLink();
	target = fs.realpathSync(target);
	target = fs.statSync(target).isDirectory()
		? new Atom.Directory(target)
		: new Atom.File(target, symlink);
	target.onDidChange(debounce(() => fn(target.getPath()), delay));
	return target;
}

function watchStyleSheet(source){
	const el = document.createElement("style");
	let text = el.appendChild(document.createTextNode(""));
	watch(source, () => {
		if(fs.existsSync(source)){
			const fileData = fs.readFileSync(source, "utf8");
			
			// Minimise footprint as much as possible
			if(el.contains(text))
				text.nodeValue = fileData;
			else{
				el.textContent = fileData;
				text = el.childNodes[0];
			}
		}
	});
	Object.assign(el.dataset, {source, revision: ""});
	document.head.appendChild(el);
	return el;
}
