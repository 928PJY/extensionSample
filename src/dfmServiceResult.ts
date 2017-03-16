// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE file in the project root for full license information.

export class DfmServiceResult {
    data: string;
    type: string;

    constructor(data: string, type: string) {
        this.data = data;
        this.type = type;
    }
}