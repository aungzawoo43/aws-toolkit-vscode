/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert'
import { resetCodeWhispererGlobalVariables } from 'aws-core-vscode/test'
import { CodewhispererLanguage } from 'aws-core-vscode/shared'
import { SecurityScanLanguageId, SecurityScanLanguageContext } from 'aws-core-vscode/codewhisperer'

describe('securityScanLanguageContext', function () {
    const languageContext = new SecurityScanLanguageContext()

    describe('test isLanguageSupported', function () {
        const cases: [string, boolean][] = [
            ['java', true],
            ['javascript', true],
            ['typescript', true],
            ['jsx', false],
            ['javascriptreact', true],
            ['typescriptreact', true],
            ['tsx', false],
            ['csharp', true],
            ['python', true],
            ['c', true],
            ['cpp', true],
            ['go', true],
            ['kotlin', true],
            ['php', true],
            ['ruby', true],
            ['rust', false],
            ['scala', true],
            ['shellscript', true],
            ['sql', false],
            ['json', true],
            ['yaml', true],
            ['tf', true],
            ['plaintext', false],
            ['html', false],
            ['r', false],
            ['vb', false],
            ['xml', false],
            ['toml', false],
            ['pip-requirements', false],
            ['java-properties', false],
            ['go.mod', false],
            ['go.sum', false],
        ]

        beforeEach(async function () {
            await resetCodeWhispererGlobalVariables()
        })

        cases.forEach((tuple) => {
            const languageId = tuple[0]
            const expected = tuple[1]

            it(`should ${expected ? '' : 'not'} support ${languageId}`, function () {
                const actual = languageContext.isLanguageSupported(languageId)
                assert.strictEqual(actual, expected)
            })
        })
    })

    describe('normalizeLanguage', function () {
        beforeEach(async function () {
            await resetCodeWhispererGlobalVariables()
        })

        const codewhispererLanguageIds: CodewhispererLanguage[] = [
            'java',
            'python',
            'javascript',
            'typescript',
            'csharp',
            'go',
            'ruby',
            'json',
            'yaml',
            'tf',
            'plaintext',
        ]

        for (const inputCwsprLanguageId of codewhispererLanguageIds) {
            it(`should return itself if input language is codewhispererLanguageId - ${inputCwsprLanguageId}`, function () {
                const actual = languageContext.normalizeLanguage(inputCwsprLanguageId)
                assert.strictEqual(actual, inputCwsprLanguageId)
            })
        }

        const securityScanLanguageIds: [SecurityScanLanguageId, CodewhispererLanguage][] = [
            ['java', 'java'],
            ['python', 'python'],
            ['javascript', 'javascript'],
            ['javascriptreact', 'javascript'],
            ['typescript', 'typescript'],
            ['typescriptreact', 'typescript'],
            ['csharp', 'csharp'],
            ['go', 'go'],
            ['ruby', 'ruby'],
            ['golang', 'go'],
            ['json', 'json'],
            ['yaml', 'yaml'],
            ['tf', 'tf'],
            ['hcl', 'tf'],
            ['terraform', 'tf'],
            ['terragrunt', 'tf'],
            ['packer', 'tf'],
            ['plaintext', 'plaintext'],
            ['jsonc', 'json'],
            ['xml', 'plaintext'],
            ['toml', 'plaintext'],
            ['pip-requirements', 'plaintext'],
            ['java-properties', 'plaintext'],
            ['go.mod', 'plaintext'],
            ['go.sum', 'plaintext'],
            ['kotlin', 'kotlin'],
            ['scala', 'scala'],
            ['shellscript', 'shell'],
        ]

        for (const [securityScanLanguageId, expectedCwsprLanguageId] of securityScanLanguageIds) {
            it(`should return mapped codewhispererLanguageId ${expectedCwsprLanguageId} if input language is securityScanLanguageId - ${securityScanLanguageId}`, function () {
                const actual = languageContext.normalizeLanguage(securityScanLanguageId)
                assert.strictEqual(actual, expectedCwsprLanguageId)
            })
        }

        const arbitraryIds: [string | undefined, CodewhispererLanguage | undefined][] = [
            [undefined, undefined],
            ['r', undefined],
            ['fooo', undefined],
            ['bar', undefined],
        ]

        for (const [arbitraryId, _] of arbitraryIds) {
            it(`should return undefined if languageId is undefined or not neither is type of codewhispererLanguageId or securityScanLanguageId - ${arbitraryId}`, function () {
                const actual = languageContext.normalizeLanguage(undefined)
                assert.strictEqual(actual, undefined)
            })
        }
    })
})
