// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { default as Axios, AxiosResponse } from 'axios'

import { DfmServiceResult } from './dfmServiceResult';

export class DfmHttpClient {
    // TODO: make the urlPrefix configurable
    private urlPrefix = "http://localhost:4002";

    async sendPostRequestAsync(command: String, workspacePath = null, relativePath = null, content = null, isFirstTime = false, docfxPreviewFilePath = null, pageRefreshJsFilePath = null): Promise<DfmServiceResult> {
        let promise = Axios.post(this.urlPrefix, {
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
                throw new Error(err)
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
        return new DfmServiceResult(response.data, response.headers["content-type"]);
    }
}