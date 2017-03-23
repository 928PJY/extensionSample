// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { default as Axios, AxiosResponse } from 'axios'

import { DfmServiceResult } from './dfmServiceResult';
import * as ConstVariable from "./ConstVariable";

export class DfmHttpClient {
    private static urlPrefix = "http://localhost:";

    static async sendPostRequestAsync(port: string, command: String, workspacePath = null, relativePath = null, content = null, isFirstTime = false, docfxPreviewFilePath = null, pageRefreshJsFilePath = null): Promise<AxiosResponse> {
        let that = this;
        let promise = Axios.post(this.urlPrefix + port, {
            name: command,
            workspacePath: workspacePath,
            relativePath: relativePath,
            markdownContent: content,
            isFirstTime: isFirstTime,
            docfxPreviewFilePath: docfxPreviewFilePath,
            pageRefreshJsFilePath: pageRefreshJsFilePath
        });

        let response: AxiosResponse;
        try {
            response = await promise;
        } catch (err) {
            let record = err.response;
            if (!record) {
                throw new Error(ConstVariable.noServiceErrorMessage);
            }

            switch (record.status) {
                case 400:
                    throw new Error(`[Client Error]: ${record.statusText}`);
                case 500:
                    throw new Error(`[Server Error]: ${record.statusText}`);
                default:
                    throw new Error(err);
            }
        }
        return response;
    }
}