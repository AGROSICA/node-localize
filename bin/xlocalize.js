#!/usr/bin/node

// Load required modules
var fs = require('fs');
var path = require('path');

// Use localize for internal localizations
var localize = require('localize');
localize.throwOnMissingTranslation(false);
localize.loadTranslations(path.join(__dirname, "translations.json"));
var translate = localize.translate;

// Defaults for ``xlocalize``
var recurse = true;
var extensions = ['html', 'js'];
var outLangs = [];

// Other global variables
var outJSON = {};

// Load arguments
for(var i = 0; i < process.argv.length; i++) {
	switch(process.argv[i]) {
		case "-r":
			recurse = true;
			break;
		case "-R":
			recurse = false;
			break;
		case "-e":
			extensions = process.argv[i+1].split(",");
			break;
		case "-t":
			outLangs = process.argv[i+1].split(",");
		default:
			break;
	}
}

// ## The *mergeObjs* function
// is a helper function that clones the value of various object into a new one.
// This simplistic one is fast, but assumes no recursive objects to merge.
function mergeObjs() {
	var outObj = {};
	for(var i in arguments) {
		if(arguments[i] instanceof Object) {
			for(var j in arguments[i]) {
				// Does not check for collisions, newer object
				// definitions clobber old definitions
				outObj[j] = arguments[i][j];
			}
		}
	}
	return outObj;
}

// ## The *processDir* function
// generates a ``translations.json`` file for the current directory, but does
// not override the previous file -- only augments it
function processDir(dir, dirJSON) {
	// Path where translations will go
	var translations = path.join(dir, "translations.json");
	// Check for pre-existing ``translations.json`` file
	if(path.existsSync(translations)) {
		var currJSON = JSON.parse(fs.readFileSync(translations, "utf8"));
		dirJSON = mergeObjs(dirJSON, currJSON);
	}
	
	// Build pattern matching for searchable files
	var extRegExpStr = "(";
	for(var i = 0; i < extensions.length; i++) {
		extRegExpStr += extensions[i];
		if(i < extensions.length-1) { extRegExpStr += "|"; }
		else { extRegExpStr += ")$"; }
	}
	var extRegExp = new RegExp(extRegExpStr);

	// Process files in the current directory
	var files = fs.readdirSync(dir);
	files.forEach(function(file) {
		if(extRegExp.test(file)) {
			processFile(path.join(dir, file), dirJSON);
		}
		if(recurse && fs.statSync(path.join(dir, file)).isDirectory()) {
			processDir(path.join(dir, file), {});
		}
	});

	// Output dirJSON to file
	fs.writeFileSync(translations, JSON.stringify(dirJSON, null, "	"), "utf8");
}

// ## The *processFile* function
// extracts all translatable pieces of a source file into the dirJSON object,
// unless already there.
function processFile(filename, dirJSON) {
	// Hacky, hacky RegExp parsing right now; replace with something better
	var fileContents = fs.readFileSync(filename, "utf8");
	var translatables = fileContents.match(/translation\(([^\),]*)/);
	for(var i = 0; i < translatables.length; i++) {
		if(/^['"](.*)['"]$/.test(translatables[i])) { // A string-looking thing
			if(!dirJSON[RegExp.$1]) { // Does not yet exist
				dirJSON[RegExp.$1] = {};
				outLangs.forEach(function(lang) {
					dirJSON[RegExp.$1][lang] = translate("MISSING TRANSLATION");
				});
			}
		} else {
			var translateMessage = translate("FOUND VARIABLE INPUT: $[1]", translatables[i]);
			dirJSON[translateMessage] = {};
			outLangs.forEach(function(lang) {
				dirJSON[translateMessage][lang] = translate("MISSING TRANSLATION");
			});
		}
	}
}

// Get the ball rollin'
processDir(process.cwd(), {});
