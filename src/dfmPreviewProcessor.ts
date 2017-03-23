// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { workspace, window, ExtensionContext, Uri, commands, ViewColumn } from "vscode";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as request from "request";

import { Common } from "./common";
import * as ConstVariable from "./ConstVariable";
import { DfmService } from "./dfmService";

export class DfmPreviewProcessor {
    public isMarkdownFileChange = false;
    public content: string;

    protected _spawn: childProcess.ChildProcess;
    protected _waiting: boolean;

    public _docfxPreviewFilePath: string;
    public _pageRefreshJsFilePath: string;
    private _isFirstTime = false;
    private _isMultipleRead = false;
    private _docfxServicePort: string;
    private ENDCODE = 7; // '\a'

    constructor(context: ExtensionContext) {
        this._waiting = false;
    }

    public startPreview(context: ExtensionContext, port: string) {
        let config = this.parseConfig(context, workspace.rootPath);
        this.initailPath(context, config);
        this._docfxServicePort = config["docfxServicePort"];

        let that = this;
        DfmService.testServerAvaliable(this._docfxServicePort)
            .then(function (res: any) {
                // There is already an avaliable Docfx service.
                that.callDfm(true);
            })
            .catch(function (err) {
                if (err.message == ConstVariable.noServiceErrorMessage) {
                    // Port have not been used, start a new Docfx service.
                    that.newHttpServerAndStartPreview(context);
                    return ;
                }
                // Port have been used by anohter process, Show a error massege.
                window.showErrorMessage("Docfx Service port have been used, if you don't have a item 'DocfxServicePort' in preview.json file, please add it and use another port");
            })

        // Test navigation port
        // TODO: implement
    }

    // Calculate two preview path.
    public initailPath(context: ExtensionContext, config) {
        let workspacePath = workspace.rootPath;
        let relativePath;
        let defaultConfigPath;
        let outputFolder;
        if (!workspacePath) {
            // Have not open a folder
            // TODO: only dfmPreview
        } else {
            if (!fs.existsSync(path.join(workspacePath, ConstVariable.docfxConfigFilename)) && !fs.existsSync(path.join(workspacePath, ConstVariable.openpublishingConfigFileName))) {
                window.showErrorMessage("Please Open docfx project root fodler");
                return;
            } else {
                let editor = window.activeTextEditor;
                let doc = editor.document;
                let fileName = doc.fileName;
                let rootPathLength = workspacePath.length;
                relativePath = fileName.substr(rootPathLength + 1, fileName.length - rootPathLength);
            }
        }

        let fileName = path.basename(relativePath);
        this._docfxPreviewFilePath = ConstVariable.filePathPrefix + path.join(workspacePath, config["outputFolder"], config["buildOutputSubFolder"], path.dirname(relativePath).substring(config["buildSourceFolder"].length), ConstVariable.docfxTempPreviewFile);

        this._pageRefreshJsFilePath = context.asAbsolutePath(path.join("htmlUpdate.js"));
    }


    private parseConfig(context: ExtensionContext, workspacePath: string) {
        let defaultConfig;
        let customeConfig;
        let defaultConfigFilePath = context.asAbsolutePath(ConstVariable.defaultPreviewConfigFilename);
        try {
            defaultConfig = JSON.parse(fs.readFileSync(defaultConfigFilePath).toString());
        } catch (e) {
            console.log(e);
        }
        let customeConfigPath = path.join(workspacePath, ConstVariable.previewConfigFilename);
        if (fs.existsSync(customeConfigPath)) {
            customeConfig = JSON.parse(fs.readFileSync(customeConfigPath).toString());
        }
        return this.mergeConfig(defaultConfig, customeConfig);
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

        if (customeConfig["docfxServicePort"] != null)
            config["docfxServicePort"] = customeConfig["docfxServicePort"];

        if (customeConfig["navigationPort"] != null)
            config["navigationPort"] = customeConfig["navigationPort"];
        return config;
    }

    private newHttpServerAndStartPreview(context: ExtensionContext) {
        // TODO: make path configurable
        let exePath = context.asAbsolutePath("./DfmParse/DfmHttpService.exe");
        try {
            // TODO: make it "-p this._docfxServicePort"
            this._spawn = Common.spawn(exePath + " " + this._docfxServicePort, {});
        }
        catch (error) {
            console.log(error);
        }
        if (!this._spawn.pid) {
            window.showErrorMessage("Error: DfmProcess lost!");
            return;
        }
        var that = this;
        this._spawn.stdout.on("data", function (data) {
            that.callDfm(true);
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
                this.sendHttpRequest(rootPath, filePath, numOfRow, docContent, true);
            } else {
                this.sendHttpRequest(rootPath, filePath, numOfRow, docContent);
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

    protected async sendHttpRequest(rootPath: string, filePath: string, numOfRow: number, docContent: string, isFirstTime = false) {
        var response = await DfmService.previewAsync(this._docfxServicePort, rootPath, filePath, docContent, isFirstTime, this._docfxPreviewFilePath, this._pageRefreshJsFilePath);
        this.content = response.data;
        this.isMarkdownFileChange = true;
        if (this._isFirstTime) {
            this.showPreviewCore();
            this._isFirstTime = false;
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