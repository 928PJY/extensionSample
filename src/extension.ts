// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

import { workspace, window, ExtensionContext, commands, Event, Uri, ViewColumn, TextDocument, Selection } from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as net from "net";
import * as ConstVariable from "./ConstVariable";
import { DfmPreviewProcessor } from './dfmPreviewProcessor';
import { DfmService } from "./dfmService";

// TODO: Implement Log
// TODO: Add a switch of preview option
// TODO: 
export function activate(context: ExtensionContext) {
    let dfmPreviewProcessor = new DfmPreviewProcessor(context);
    let showPreviewToSideRegistration = commands.registerCommand("DFM.showPreviewToSide", uri => showPreview(context, dfmPreviewProcessor, uri, true));

    context.subscriptions.push(showPreviewToSideRegistration);

    let http = require("http");
    let server = http.createServer();

    workspace.onDidChangeTextDocument(event => {
        if (isMarkdownFile(event.document)) {
            dfmPreviewProcessor.updatePreviewContent();
        }
    });

    workspace.onDidSaveTextDocument(document => {
        if (isMarkdownFile(document)) {
            dfmPreviewProcessor.updatePreviewContent();
        }
    })

    workspace.onDidChangeConfiguration(() => {
        workspace.textDocuments.forEach(document => {
            if (document.uri.scheme === ConstVariable.markdownScheme) {
                dfmPreviewProcessor.updatePreviewContent();
            } else if (document.uri.scheme === ConstVariable.tokenTreeScheme) {
                // TOD: TokenTree
            }
        });
    })

    workspace.onDidCloseTextDocument(event => {
        dfmPreviewProcessor.stopPreview();
    })

    let startLine = 0;
    let endLine = 0;

    window.onDidChangeTextEditorSelection(event => {
        startLine = event.selections[0].start.line + 1;
        endLine = event.selections[0].end.line + 1;
    });

    server.on("request", function (req, res) {
        var test = 1;
        let requestInfo = req.url.split("/");
        switch (requestInfo[1]) {
            case ConstVariable.previewContent:
                if (!dfmPreviewProcessor.isMarkdownFileChange) {
                     res.writeHead(200, { "Content-Type": "text/plain" });
                    res.write("F");
                    res.end();
                } else {
                    // File changed
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.write("T");
                    res.write(dfmPreviewProcessor.httpServiceResponse)
                    res.end();
                    dfmPreviewProcessor.isMarkdownFileChange = false;
                }
                break;
            case ConstVariable.matchFromR2L:
                if (!mapToSelection(parseInt(requestInfo[2]), parseInt(requestInfo[3])))
                    window.showErrorMessage("Selection Range Error");
                res.end();
                break;
            case ConstVariable.matchFromL2R:
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.write(startLine + " " + endLine);
                res.end();
                break;
        }
    });

    server.on("error", function (err) {
        window.showErrorMessage("Navigation port have been used by other process, if you don't have 'navigatePort' item in your preview.json file, please add this item and use another port");
    })

    server.listen(4001);
}

function mapToSelection(startLineNumber: number, endLineNumber: number) {
    if (startLineNumber > endLineNumber)
        return false;
    // Go back to the Source file editor first
    if (startLineNumber === 0 && endLineNumber === 0) {
        // Click the node markdown
        commands.executeCommand("workbench.action.navigateBack").then(() => {
            endLineNumber = window.activeTextEditor.document.lineCount;
            window.activeTextEditor.selection = new Selection(0, 0, endLineNumber - 1, window.activeTextEditor.document.lineAt(endLineNumber - 1).range.end.character);
        });
    } else {
        commands.executeCommand("workbench.action.navigateBack").then(() => {
            window.activeTextEditor.selection = new Selection(startLineNumber - 1, 0, endLineNumber - 1, window.activeTextEditor.document.lineAt(endLineNumber - 1).range.end.character);
        });
    }
    return true;
}

// Check the file type
function isMarkdownFile(document: TextDocument) {
    // Prevent processing of own documents
    return document.languageId === "markdown" && document.uri.scheme === "file";
}

function showSource() {
    return commands.executeCommand("workbench.action.navigateBack");
}

function showPreview(context: ExtensionContext, dfmPreviewProcessor, uri?: Uri, sideBySide: boolean = false) {
    if (isMarkdownFile(window.activeTextEditor.document)) {
        dfmPreviewProcessor.startPreview();
    }
    else {
        window.showErrorMessage("This is not a markdown file")
    }
}
