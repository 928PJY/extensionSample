// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { workspace, window, ExtensionContext, Uri, commands, ViewColumn } from "vscode";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";

import { Common } from "./common";
import * as ConstVariable from "./ConstVariable";
import { DfmService } from "./dfmService";

export class DfmPreviewProcessor {
    public isMarkdownFileChange = false;
    public httpServiceResponse: string;

    private _spawn: childProcess.ChildProcess;
    private _waiting = false;
    private _builtHtmlPath: string;
    private _pageRefreshJsFilePath: string;
    private _docfxPreviewFilePath: string;
    private _isFirstTime = false;
    private _isMultipleRead = false;
    private _docfxServerPort: string;
    private _context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this._context = context;
    }

    public startPreview() {
        let config = this.parseConfig(workspace.rootPath);
        this.initailPath(config);
        this._docfxServerPort = config["docfxServerPort"];

        let that = this;
        // Test navigation port
        // TODO: implement

        DfmService.testServerAvaliable(this._docfxServerPort)
            .then(function (res: any) {
                // There is already an avaliable Docfx service.
                that.callDfm(true);
            })
            .catch(function (err) {
                if (err.message == ConstVariable.noServiceErrorMessage) {
                    // Port have not been used, start a new Docfx service.
                    that.newHttpServerAndStartPreview();
                    return;
                }
                // Port have been used by anohter process, Show a error massege.
                window.showErrorMessage("Docfx Service port have been used, if you don't have a item 'docfxServerPort' in preview.json file, please add it and use another port");
            })
    }

    public stopPreview() {
        let that = this;
        DfmService.deletePreviewFile(this._docfxServerPort, this._docfxPreviewFilePath)
            .then(function () {
                that.killChildProcess();
            })
            .catch(function(err){
                if (!(err.message == ConstVariable.noServiceErrorMessage)) {
                    window.showErrorMessage(err.message);
                }
            })
    }

    public updatePreviewContent() {
        this.callDfm(false);
    }

    private killChildProcess() {
        // Kill child process
        DfmService.exit(this._docfxServerPort)
            .catch(function (err) {
                if (!(err.message == ConstVariable.noServiceErrorMessage)) {
                    window.showErrorMessage(err.message);
                }
            })
    }

    // Calculate two preview path.
    private initailPath(config) {
        let workspacePath = workspace.rootPath;
        let relativePath;
        let defaultConfigPath;
        let outputFolder;
        if (!workspacePath) {
            // Have not open a folder
            // TODO: only dfmPreview
        } else {
            if (!fs.existsSync(path.join(workspacePath, ConstVariable.docfxConfigFilename)) && !fs.existsSync(path.join(workspacePath, ConstVariable.openpublishingConfigFileName))) {
                window.showErrorMessage("Please Open project root fodler");
                return;
            } else {
                let editor = window.activeTextEditor;
                let doc = editor.document;
                let fileName = doc.fileName;
                let rootPathLength = workspacePath.length;
                relativePath = fileName.substr(rootPathLength + 1, fileName.length - rootPathLength);
            }
        }

        let filename = path.basename(relativePath);
        let filenameWithoutExt = filename.substr(0, filename.length - path.extname(relativePath).length);
        let builtHtmlPath = path.join(workspacePath, config["outputFolder"], config["buildOutputSubFolder"], path.dirname(relativePath).substring(config["buildSourceFolder"].length), filenameWithoutExt + ".html");
        this._builtHtmlPath = builtHtmlPath;
        this._docfxPreviewFilePath = ConstVariable.filePathPrefix + path.join(workspacePath, config["outputFolder"], config["buildOutputSubFolder"], path.dirname(relativePath).substring(config["buildSourceFolder"].length), ConstVariable.docfxTempPreviewFile);

        if (!fs.existsSync(builtHtmlPath)) {
            // TODO: add a switch to control this
            window.showErrorMessage("Please build this project first!");
        }

        this._pageRefreshJsFilePath = this._context.asAbsolutePath(path.join("htmlUpdate.js"));
    }

    private parseConfig(workspacePath: string) {
        let defaultConfig;
        let customeConfig;
        let defaultConfigFilePath = this._context.asAbsolutePath(ConstVariable.defaultPreviewConfigFilename);
        try {
            defaultConfig = JSON.parse(fs.readFileSync(defaultConfigFilePath).toString());
        } catch (err) {
            window.showErrorMessage(err);
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

        if (customeConfig["docfxServerPort"] != null)
            config["docfxServerPort"] = customeConfig["docfxServerPort"];

        if (customeConfig["navigationPort"] != null)
            config["navigationPort"] = customeConfig["navigationPort"];
        return config;
    }

    private newHttpServerAndStartPreview() {
        // TODO: make path configurable
        let exePath = this._context.asAbsolutePath("./DfmParse/DfmHttpService.exe");
        try {
            // TODO: make it "-p this._docfxServerPort"
            this._spawn = Common.spawn(exePath + " " + this._docfxServerPort, {});
        }
        catch (err) {
            window.showErrorMessage(err);
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

    private sendMessage(isFirstTime) {
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

    private callDfm(isFirstTime) {
        if (!this._waiting) {
            this._waiting = true;
            setTimeout(() => {
                this._waiting = false;
                this.sendMessage(isFirstTime);
            }, 300);
        }
    }

    private sendHttpRequest(rootPath: string, filePath: string, numOfRow: number, docContent: string, isFirstTime = false) {
        let that = this;
        DfmService.preview(this._docfxServerPort, this._docfxPreviewFilePath, rootPath, filePath, docContent, isFirstTime, this._pageRefreshJsFilePath, this._builtHtmlPath)
            .then(function (res: any) {
                that.httpServiceResponse = res.data;
                that.isMarkdownFileChange = true;
                if (that._isFirstTime) {
                    that.showPreviewCore();
                    that._isFirstTime = false;
                }
            })
            .catch(function (err) {
                if (err.message == ConstVariable.noServiceErrorMessage) {
                    // Port have not been used, start a new Docfx service.
                    that.newHttpServerAndStartPreview();
                    return;
                }
                // TODO: write error to log file
                window.showErrorMessage("Some unhandled error happened, please contact author on Docfx issues at https://github.com/dotnet/docfx/issues");
            })
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