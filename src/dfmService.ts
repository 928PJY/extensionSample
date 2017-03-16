// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { AxiosError } from 'axios';

import { DfmHttpClient } from './dfmHttpClient';
import { DfmServiceResult } from './dfmServiceResult';

export class DfmService {
    private static client = new DfmHttpClient();

    static async testServerAvaliable(): Promise<boolean> {
        try {
            await DfmService.client.sendPostRequestAsync("testServer", null);
            return true;
        } catch (error) {
            return false;
        }
    }

    static async previewAsync(workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, docfxPreviewFilePath: string, pageRefreshJsFilePath: string): Promise<DfmServiceResult> {
        if (!content) {
            return null;
        }

        return await DfmService.client.sendPostRequestAsync("preview", workspacePath, relativePath, content, isFirstTime, docfxPreviewFilePath, pageRefreshJsFilePath);
    }

    static async getTokenTreeAsync(workspacePath: string, relativePath: string, content: String, isFirstTime: boolean, docfxPreviewFilePath: string, pageRefreshJsFilePath: string): Promise<DfmServiceResult> {
        if (!content) {
            return null;
        }

        return await DfmService.client.sendPostRequestAsync("generateTokenTree", workspacePath, relativePath, content, isFirstTime, docfxPreviewFilePath, pageRefreshJsFilePath);
    }

    static async exitAsync() {
        await DfmService.client.sendPostRequestAsync("exit", null);
    }
}