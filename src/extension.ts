// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

import { workspace, window, ExtensionContext, commands, Event, Uri, ViewColumn, TextDocument, Selection } from "vscode";
import * as path from "path";
import { PreviewCore } from "./previewCore";
import * as ConstVariable from "./constVariable";

let testuri;
let hUri;

export function activate(context: ExtensionContext) {
    let dfmProcess = new PreviewCore(context);

    let showPreviewToSideRegistration = commands.registerCommand("DFM.showPreviewToSide", uri => showPreview(dfmProcess, uri, true));

    workspace.onDidChangeTextDocument(event => {
        if (isMarkdownFile(event.document)) {
            const uri = getMarkdownUri(event.document.uri);
            dfmProcess.callDfm(uri); 
        }
    });
}

// Check the file type
function isMarkdownFile(document: TextDocument) {
    // Prevent processing of own documents
    return document.languageId === "markdown" && document.uri.scheme === "file";
}

function getMarkdownUri(uri: Uri) {
    return uri.with({ scheme: ConstVariable.markdownScheme, path: uri.path + ".renderedDfm", query: uri.toString() });
}

function getTokenTreeUri(uri: Uri) {
    return uri.with({ scheme: ConstVariable.tokenTreeScheme, path: uri.path + ".renderedTokenTree", query: uri.toString() });
}

function getViewColumn(sideBySide: boolean): ViewColumn {
    const active = window.activeTextEditor;
    if (!active) {
        return ViewColumn.One;
    }

    if (!sideBySide) {
        return active.viewColumn;
    }

    switch (active.viewColumn) {
        case ViewColumn.One:
            return ViewColumn.Two;
        case ViewColumn.Two:
            return ViewColumn.Three;
    }

    return active.viewColumn;
}

function showSource() {
    return commands.executeCommand("workbench.action.navigateBack");
}

function showPreview(dfmPreview: PreviewCore, uri?: Uri, sideBySide: boolean = false) {
    dfmPreview.isFirstTime = true;
    let resource = uri;
    if (!(resource instanceof Uri)) {
        if (window.activeTextEditor) {
            resource = window.activeTextEditor.document.uri;
        } else {
            // This is most likely toggling the preview
            return commands.executeCommand("DFM.showSource");
        }
    }

    var HtmlUrl = "file:///E:/SeedProject/docfx-seed/_site/articles/docfxPreview.html";

    let thenable = commands.executeCommand("vscode.previewHtml",
        HtmlUrl,
        ViewColumn.Two,
        `DfmPreview "${path.basename(resource.fsPath)}"`);

    dfmPreview.callDfm(getMarkdownUri(resource));
    return thenable;
}
