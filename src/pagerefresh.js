function previewrefresh() {
    var isCopySupported = false;
    var isDevLangSelectionAvailable = false;
    var userDevLang = undefined;
    var defaultDevLang = undefined;
    //used to override lang- visibility toggling
    var xamlLangClassName = 'lang-xaml';
    var xamlClassName = 'xaml';

    // add alert effect to TIP/NOTE/IMPORTANT/WARNING
    $('.TIP, .NOTE, .IMPORTANT, .WARNING, .CAUTION').addClass('alert');

    if ($("h1[sourcefile]").length !== 1) {
        var secondOne = $("h1[sourcefile]").filter(function (index) { return index < 2 }).last();
        $("h1[sourcefile]").first().text(secondOne.text());
        secondOne.empty();
    }

    // sidebar
    (function (minItems) {
        var hasItem = false;
        var tocContainer = $("<ol></ol>");
        var docOutlines = $(".doc-outline");
        var tocItems = $("#main h2");

        tocItems.each(function () {
            hasItem = true;
            var h2Id = $(this).attr("id");
            if (h2Id === undefined) {
                h2Id = $(this).text().toLowerCase().replace(/\s+/g, '_');
                $(this).attr("id", h2Id)
            }

            var item = $("<li></li>");
            var itemLink = $("<a href='#" + h2Id + "'>" + $(this).text() + "</a>");
            item.append(itemLink);
            tocContainer.append(item);
        });
        if (hasItem) {
            docOutlines.find("h3").show();
            docOutlines.empty().append(tocContainer);
        } else {
            docOutlines.hide();
        }
    })();

    run();

    // Code blocks
    function highlightCode() {
        var preCodes = $('pre code');
        preCodes.each(function (i, block) {
            highlightCodeBlock(block, false);
        });

        if (preCodes.length > 0) {
            msDocs.functions.updateH2Tops(true);
        }
    }

    function highlightCodeBlock(block, isFromWorker) {
        var className = $(block).attr('class');

        if (className === xamlLangClassName) { //overrides xaml class name from examples
            $(block).attr('class', xamlClassName).removeAttr("hidden").parent().removeAttr("hidden");
            className = xamlClassName;
        }

        if (!isFromWorker && typeof className !== 'undefined' && className.indexOf('lang-') === 0) {
            hljs.highlightBlock(block);
        }

        addCodeHeader(block);
        highlightLines(block);
    }

    function highlightLines(block) {
        if (block.innerHTML === "") {
            return;
        }

        var lines = block.innerHTML.split('\n');

        var queryString = block.getAttribute('highlight-lines');
        if (!queryString) {
            return;
        }

        var ranges = queryString.split(',');
        for (var j = 0, range; range = ranges[j++];) {
            var found = range.match(/^(\d+)\-(\d+)?$/);
            var start = 0;
            var end = 0;

            if (found) {
                // consider region as `{startlinenumber}-{endlinenumber}`, in which {endlinenumber} is optional
                start = +found[1];
                end = +found[2];
                if (isNaN(end) || end > lines.length) {
                    end = lines.length;
                }
            } else {
                // consider region as a single line number
                if (isNaN(range)) {
                    continue;
                }
                start = +range;
                end = start;
            }
            if (start <= 0 || end <= 0 || start > end || start > lines.length) {
                // skip current region if invalid
                continue;
            }
            lines[start - 1] = '<span class="line-highlight">' + lines[start - 1];
            lines[end - 1] = lines[end - 1] + '</span>';
        }

        block.innerHTML = lines.join('\n');
    }

    function runHighlightWorker() {
        var blocks = [];
        var rawTexts = [];
        var languages = [];
        $('pre code').each(function (i, block) {
            blocks.push(block);
            var contents = block.innerHTML;
            contents = contents.replace(/<br>/gi, '\n');
            block.innerHTML = contents;
            rawTexts.push(block.textContent);

            var language = block.className || "";
            rawTexts.push(language);
            languages.push(language);
        });
        //var HighlightWorker = require("E:/Docs/openpublishing-test/_site/openpublishing/test-docs/_themes/javascript/worker.highlight.js");
        var worker = new HighlightWorker();
        worker.onmessage = function (event) {
            var len = event.data.length;
            if (len !== blocks.length) {
                require(["trace"], function (trace) {
                    trace.traceWarning(trace.TraceCategory.performance, "Mismatched lengths for coding highlighted contents.");
                });
                highlightCode();
            }
            else {
                for (var i = 0; i < len; i++) {
                    if (event.data[i] !== '--') {
                        blocks[i].innerHTML = event.data[i];
                    }
                    highlightCodeBlock(blocks[i], true);
                }

                if (len > 0) {
                    msDocs.functions.updateH2Tops(true);
                }
            }
        };
        worker.postMessage(rawTexts);
    }

    function addCodeHeader(block) {
        var $parent = $($(block).parent());
        if ($parent !== null) {
            if ($parent.hasClass("noHeader")) {
                return;
            }

            var copyBtn = null;

            if (isCopySupported && !$parent.hasClass("noCopy")) {
                //TODO: localize 'Copy'
                copyBtn = $("<div class='copyBtn'>Copy</div>");
                copyBtn.click(function () {
                    var $parent = $($(this).parents()[0]);
                    var langList = $parent.attr('class').split(' ');
                    var langClass = '';

                    for (i = 0; i < langList.length; i++) {
                        if (langList[i].indexOf("lang-") === 0 || langList[i] === xamlClassName) {
                            langClass = langList[i];
                            break;
                        }
                    }
                    var elementToFind = 'code';
                    if (langClass !== '') {
                        elementToFind = elementToFind + '.' + langClass;
                    }

                    var $preElement = $($parent.nextAll('pre')[0]);
                    if ($preElement) {
                        var codeElement = $preElement.find(elementToFind)[0];
                        if (codeElement) {
                            var success = copyToClipboard(codeElement.textContent);
                            if (success) {
                                $(this).fadeOut(100).fadeIn(300);
                            }
                        }
                    }
                });
            }

            var langLabel = '';
            var isPairedXaml = false;
            if ($(block).attr("class")) {
                var langLabelList = $(block).attr("class").split(" ");

                for (var i = 0; i < langLabelList.length; i++) {
                    if (langLabelList[i].indexOf("lang-") === 0) {
                        langLabel = langLabelList[i];
                        break;
                    }
                }

                if (langLabel === '' && langLabelList.length === 1 && langLabelList[0] === xamlClassName) {
                    langLabel = xamlClassName;
                    isPairedXaml = true;
                }
            }

            var labelHolder = $("<div class='labelHolder'></div>");
            if (langLabel === "") {
                labelHolder.html("&nbsp;");
            } else {
                var friendlyNames = ["vb", "VB",
                    "csharp", "C#", "cs", "C#",
                    "fsharp", "F#",
                    "azurecli", "Azure CLI",
                    "json", "JSON",
                    "cpp", "C++",
                    "java", "Java",
                    "objc", "Objective-C",
                    "ruby", "Ruby",
                    "php", "PHP",
                    "powershell", "PowerShell",
                    "js", "JavaScript", "javascript", "JavaScript",
                    "azcopy", "AzCopy",
                    "python", "Python",
                    "nodejs", "NodeJS",
                    "xaml", "XAML",
                    "swift", "Swift",
                    "md", "Markdown"
                ];
                var langLabelText = langLabel.replace("lang-", "");

                for (var i = 0; i < friendlyNames.length; i += 2) {
                    if (langLabelText === friendlyNames[i]) {
                        langLabelText = friendlyNames[i + 1];
                        break;
                    }
                }
                labelHolder.text(langLabelText);
            }

            var codeHeader = $("<div class='codeHeader " + langLabel + "'></div>");
            if (copyBtn !== null) {
                codeHeader.append(copyBtn);
            }
            codeHeader.append(labelHolder);

            if (isDevLangSelectionAvailable && !isPairedXaml) {
                if (typeof userDevLang !== 'undefined') {
                    if (langLabel !== userDevLang) {
                        codeHeader.prop('hidden', true);
                    }
                } else if (typeof defaultDevLang !== 'undefined') {
                    if (langLabel !== defaultDevLang) {
                        codeHeader.prop('hidden', true);
                    }
                }
            }

            $parent.before(codeHeader);
        }
    }

    function checkIfClipboardSupported() {
        return ((window.clipboardData && window.clipboardData.setData) ||
            (document.queryCommandSupported && document.queryCommandSupported("copy")));
    }

    function copyToClipboard(text) {
        if (window.clipboardData && window.clipboardData.setData) {
            $(window).trigger("copy", text);
            return window.clipboardData.setData("Text", text);
        }
        else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            var txt = document.createElement("textarea");
            txt.textContent = text;
            txt.style.position = "fixed";
            document.body.appendChild(txt);
            txt.select();
            try {
                return document.execCommand("copy");
            } catch (ex) {
                return false;
            } finally {
                document.body.removeChild(txt);
            }
        }
    }

    function run() {
        isCopySupported = checkIfClipboardSupported();
        isDevLangSelectionAvailable = $("#lang-selector").length > 0;
        if (isDevLangSelectionAvailable) {
            userDevLang = cookies.getLocalStorage(msDocs.data.cookieDevLang);
            if (msDocs.settings.defaultDevLang) {
                defaultDevLang = "lang-" + msDocs.settings.defaultDevLang;
            }

            //check langs are valid
            var langOptions = $("#lang-selector option");
            if (langOptions.length) {
                var userFound = false;
                var defaultFound = false;

                for (var i = 0; i < langOptions.length; i++) {
                    if ($(langOptions[i]).val() === userDevLang) {
                        userFound = true;
                    }
                    if ($(langOptions[i]).val() === defaultDevLang) {
                        defaultFound = true;
                    }
                }

                if (!userFound) {
                    userDevLang = undefined;
                }

                if (!defaultFound) {
                    defaultDevLang = $(langOptions[0]).val();
                }
            }
        }

        // Uses web Worker to unfreeze the browser window.
        //if (window.Worker) {
        //  runHighlightWorker();
        //} else {
        highlightCode();
        //}
    }
}