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

    static async previewAsync(docfxServicePort, workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, docfxPreviewFilePath: string, pageRefreshJsFilePath: string) {
        if (!content) {
            return null;
        }

        return await DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.previewCommand, workspacePath, relativePath, content, isFirstTime, docfxPreviewFilePath, pageRefreshJsFilePath);
    }

    static async getTokenTreeAsync(docfxServicePort, workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, docfxPreviewFilePath: string, pageRefreshJsFilePath: string) {
        if (!content) {
            return null;
        }

        return await DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.tokenTreeCommand, workspacePath, relativePath, content, isFirstTime, docfxPreviewFilePath, pageRefreshJsFilePath);
    }

    static async exitAsync(docfxServicePort) {
        await DfmHttpClient.sendPostRequestAsync(docfxServicePort, ConstVariable.exitCommand, null);
    }
}