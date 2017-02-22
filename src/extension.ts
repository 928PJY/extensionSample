// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

import { workspace, window, ExtensionContext, commands, Event, Uri, ViewColumn, TextDocument, Selection } from "vscode";
import * as path from "path";

let testuri;
let hUri;

export function activate(context: ExtensionContext) {
    let showPreviewToSideRegistration = commands.registerCommand("DFM.showPreviewToSide", uri => showPreview(uri, true));
}

function showSource() {
    return commands.executeCommand("workbench.action.navigateBack");
}

function showPreview(uri?: Uri, sideBySide: boolean = false) {
    let resource = uri;
    if (!(resource instanceof Uri)) {
        if (window.activeTextEditor) {
            resource = window.activeTextEditor.document.uri;
        } else {
            // This is most likely toggling the preview
            return commands.executeCommand("DFM.showSource");
        }
    }

    // TODO: Never mind, there is hard code to test. Please change it to your path
    var HtmlUrl = "file:///E:/SeedProject/docfx-seed/_site/articles/docfxPreview.html";

    let thenable = commands.executeCommand("vscode.previewHtml",
        HtmlUrl,
        ViewColumn.Two,
        `DfmPreview "${path.basename(resource.fsPath)}"`);

    return thenable;
}
