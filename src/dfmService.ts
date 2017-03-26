// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { AxiosError } from 'axios';

import { DfmHttpClient } from './dfmHttpClient';
import { DfmServiceResult } from './dfmServiceResult';
import * as ConstVariable from "./ConstVariable";

export class DfmService {
    static testServerAvaliable(docfxServicePort) {
        return new Promise(function (fulfill, reject) {
            DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.testServerAvaliableCommand, null)
                .then(function (res) {
                    fulfill(res);
                })
                .catch(function (err) {
                    reject(err);
                })
        })
    }

    static preview(docfxServicePort, previewFilePath: string, workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, pageRefreshJsFilePath: string, builtHtmlPath: string) {
        if (!content) {
            return null;
        }

        return new Promise(function (fulfill, reject) {
            DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.previewCommand, previewFilePath, workspacePath, relativePath, content, isFirstTime, pageRefreshJsFilePath, builtHtmlPath)
                .then(function (res) {
                    fulfill(res);
                })
                .catch(function (err) {
                    reject(err);
                })
        })
    }

    static getTokenTree(docfxServicePort:string, previewFilePath: string, workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, pageRefreshJsFilePath: string) {
        if (!content) {
            return null;
        }

        return new Promise(function (fulfill, reject) {
            DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.tokenTreeCommand, previewFilePath, workspacePath, relativePath, content, isFirstTime, pageRefreshJsFilePath)
                .then(function (res) {
                    fulfill(res);
                })
                .catch(function (err) {
                    reject(err);
                })
        })
    }

    static deletePreviewFile(docfxServicePort, previewFilePath){
        return new Promise(function (fulfill, reject) {
            DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.deleteTempPreviewFileCommand, previewFilePath)
                .then(function (res) {
                    fulfill(res);
                })
                .catch(function (err) {
                    reject(err);
                })
        })
    }

    static exit(docfxServicePort) {
        return new Promise(function (fulfill, reject) {
            DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.exitCommand)
                .then(function (res) {
                    fulfill(res);
                })
                .catch(function (err) {
                    reject(err);
                })
        })
    }

    static
}