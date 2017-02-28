// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { workspace, window, ExtensionContext, Uri, commands, ViewColumn} from "vscode";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";

import { Common } from "./common";
import * as ConstVariable from "./ConstVariable";

export class DfmPreviewProcessor {
    public isMarkdownFileChange = false;
    public content: string;

    protected _spawn: childProcess.ChildProcess;
    protected _waiting: boolean;

    public _docfxPreviewFilePath: string;
    public _pageUpdateJsFilePath: string;
    private _isFirstTime = false;
    private _isMultipleRead = false;
    private ENDCODE = 7; // '\a'

    constructor(context: ExtensionContext) {
        // TODO: make path configurable
        let exePath = context.asAbsolutePath("./DfmParse/Microsoft.DocAsCode.Dfm.VscPreview.exe");
        this._spawn = Common.spawn(exePath, {});
        if (!this._spawn.pid) {
            window.showErrorMessage("Error: DfmProcess lost!");
            return;
        }
        this._waiting = false;
        let that = this;

        this._spawn.stdout.on("data", function (data) {
            // The output of child process will be cut if it is too long
            let dfmResult = data.toString();
            if (dfmResult.length > 0) {
                let endCharCode = dfmResult.charCodeAt(dfmResult.length - 1);
                if (that._isMultipleRead) {
                    that.content += dfmResult;
                } else {
                    that.content = dfmResult;
                }
                that._isMultipleRead = endCharCode !== that.ENDCODE;
                if (!that._isMultipleRead) {
                    if (that._isFirstTime) {
                        that.isMarkdownFileChange = false;
                        that.showPreviewCore();
                        that._isFirstTime = false;
                    }
                    else {
                        that.isMarkdownFileChange = true;
                    }
                }
            }
        });

        this._spawn.stderr.on("data", function (data) {
            window.showErrorMessage("Error:" + data + "\n");
        });

        this._spawn.on("exit", function (code) {
            window.showErrorMessage("Child process exit with code " + code);
        });
    }

    protected sendMessage(isFirstTime) {
        let editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        let doc = editor.document;
        let docContent = doc.getText();
        let fileName = doc.fileName;
        let rootPath = workspace.rootPath;
        let filePath;
        if (!rootPath || !fileName.includes(rootPath)) {
            let indexOfFilename = fileName.lastIndexOf("\\");
            rootPath = fileName.substr(0, indexOfFilename);
            filePath = fileName.substring(indexOfFilename + 1);
        } else {
            let rootPathLength = rootPath.length;
            filePath = fileName.substr(rootPathLength + 1, fileName.length - rootPathLength);
        }
        if (doc.languageId === "markdown") {
            let numOfRow = doc.lineCount;
            if (isFirstTime) {
                this._isFirstTime = true;
                this.writeToStdin(rootPath, filePath, numOfRow, docContent, true);
            } else {
                this.writeToStdin(rootPath, filePath, numOfRow, docContent);
            }
        }
    }

    public callDfm(isFirstTime) {
        if (!this._waiting) {
            this._waiting = true;
            setTimeout(() => {
                this._waiting = false;
                this.sendMessage(isFirstTime);
            }, 300);
        }
    }

    public initailPath(context: ExtensionContext) {
        let defaultConfig;
        let customeConfig;
        let baseDir = workspace.rootPath;
        let relativePath;
        let defaultConfigPath;
        let outputFolder;
        if (!baseDir) {
            // Have not open a folder
            // TODO: only dfmPreview
        } else {
            if (!fs.existsSync(path.join(baseDir, ConstVariable.docfxConfigFilename)) && !fs.existsSync(path.join(baseDir, ConstVariable.openpublishingConfigFileName))) {
                window.showErrorMessage("Please Open docfx project root fodler");
                return;
            } else {
                let editor = window.activeTextEditor;
                let doc = editor.document;
                let fileName = doc.fileName;
                let rootPathLength = baseDir.length;
                relativePath = fileName.substr(rootPathLength + 1, fileName.length - rootPathLength);
            }
        }
        let defaultConfigFilePath = context.asAbsolutePath(ConstVariable.defaultPreviewConfigFilename);
        try {
            defaultConfig = JSON.parse(fs.readFileSync(defaultConfigFilePath).toString());
        } catch (e) {
            console.log(e);
        }
        let customeConfigPath = path.join(baseDir, ConstVariable.previewConfigFilename);
        if (fs.existsSync(customeConfigPath)) {
            customeConfig = JSON.parse(fs.readFileSync(customeConfigPath).toString());
        }
        let config = this.mergeConfig(defaultConfig, customeConfig);

        let fileName = path.basename(relativePath);
        let targetHtml = ConstVariable.filePathPrefix + path.join(baseDir, config["outputFolder"], config["buildOutputSubFolder"], path.dirname(relativePath).substring(config["buildSourceFolder"].length),  ConstVariable.docfxTempPreviewFile);

        this._docfxPreviewFilePath = targetHtml;

        this._pageUpdateJsFilePath = context.asAbsolutePath(path.join("src", "htmlUpdate.js"));
    }

    private mergeConfig(defaultConfig, customeConfig) {
        if (customeConfig == null) {
            return defaultConfig;
        }

        let config = defaultConfig;

        if (customeConfig["buildSourceFolder"] != null)
            config["buildSourceFolder"] = customeConfig["buildSourceFolder"];

        if (customeConfig["buildOutputSubFolder"] != null)
            config["buildOutputSubFolder"] = customeConfig["buildOutputSubFolder"];

        if (customeConfig["outputFolder"] != null)
            config["outputFolder"] = customeConfig["outputFolder"];

        return config;
    }

    protected writeToStdin(rootPath: string, filePath: string, numOfRow: number, docContent: string, isFirstTime = false) {
        this._spawn.stdin.write(this.appendWrap("docfxpreview"));
        this._spawn.stdin.write(this.appendWrap(rootPath));
        this._spawn.stdin.write(this.appendWrap(filePath));
        this._spawn.stdin.write(this.appendWrap(numOfRow));
        this._spawn.stdin.write(this.appendWrap(docContent));
        if (isFirstTime) {
            this._spawn.stdin.write(this.appendWrap("True"));
            this._spawn.stdin.write(this.appendWrap(this._docfxPreviewFilePath));
            this._spawn.stdin.write(this.appendWrap(this._pageUpdateJsFilePath));
        } else {
            this._spawn.stdin.write(this.appendWrap("False"));
        }
    }

    protected appendWrap(content) {
        return content + "\n";
    }

    private showPreviewCore() {
        let resource;
        if (window.activeTextEditor) {
            resource = window.activeTextEditor.document.uri;
        } else {
            return commands.executeCommand("DFM.showSource");
        }

        let thenable = commands.executeCommand("vscode.previewHtml",
            this._docfxPreviewFilePath,
            ViewColumn.Two,
            `DfmPreview "${path.basename(resource.fsPath)}"`);
    }
}