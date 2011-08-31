// # Localize
// is a GNU gettext-inspired (but not conformant) localization library for
// Node.js

function getTranslations(currDir, translations) {
	if(path.existsSync(currDir)) {
		if(path.existsSync(path.join(currDir, "translations.json"))) {
			translations = utils.mergeObjs(translations,
				JSON.parse(fs.readFileSync(path.join(path.resolve(currDir), "translations.json")))
			);
		}
		var pathChildren = fs.readdirSync(currDir);
		for(var child in pathChildren) {
			var childPath = path.resolve(path.join(currDir, pathChildren[child]));
			if(fs.statSync(childPath).isDirectory()) {
				translations = getTranslations(childPath, translations);
			}
		}
	} else {
		throw new Error("Translation Path Invalid");
	}
	return translations;
}

var langLookup = getTranslations("./views", {});

function buildString() {
	var outString = arguments[0];
	for(var i = 1; i < arguments.length; i++) {
		outString = outString.replace(new RegExp("\\$\\[" + i + "\\]", "g"), arguments[i]);
	}
	return outString;
}

function translate(request, response) { // Cannot think of any use case where the controller absolutely needs this method
	if(!request.session.loginData || !request.session.loginData.lang || request.session.loginData.lang == "en") {
		return buildString;
	} else {
		var myLang = request.session.loginData.lang;
		return function() {
			var currText = arguments[0];
			var newArr = Array.prototype.splice.call(arguments, 1, 1);
			if(langLookup && langLookup[currText] && langLookup[currText][myLang]) {
				newArr.unshift(langLookup[currText][myLang]);
				return buildString.apply(this, newArr);
			} else {
				return buildString.apply(this, arguments);
			}
		};
	}
}

