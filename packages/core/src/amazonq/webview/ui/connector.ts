/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ChatItem,
    FeedbackPayload,
    Engagement,
    ChatItemAction,
    CodeSelectionType,
    ReferenceTrackerInformation,
} from '@aws/mynah-ui'
import { Connector as CWChatConnector } from './apps/cwChatConnector'
import { Connector as FeatureDevChatConnector } from './apps/featureDevChatConnector'
import { Connector as AmazonQCommonsConnector } from './apps/amazonqCommonsConnector'
import { Connector as GumbyChatConnector } from './apps/gumbyChatConnector'
import { ExtensionMessage } from './commands'
import { TabType, TabsStorage } from './storages/tabsStorage'
import { WelcomeFollowupType } from './apps/amazonqCommonsConnector'
import { AuthFollowUpType } from './followUps/generator'
import { DiffTreeFileInfo } from './diffTree/types'
import { UserIntent } from '@amzn/codewhisperer-streaming'

export interface CodeReference {
    licenseName?: string
    repository?: string
    url?: string
    recommendationContentSpan?: {
        start?: number
        end?: number
    }
}

export interface UploadHistory {
    [key: string]: {
        uploadId: string
        timestamp: number
        tabId: string
        filePaths: DiffTreeFileInfo[]
        deletedFiles: DiffTreeFileInfo[]
    }
}

export interface ChatPayload {
    chatMessage: string
    chatCommand?: string
}

// Adding userIntent param by extending ChatItem to send userIntent as part of amazonq_interactWithMessage telemetry event
export interface CWCChatItem extends ChatItem {
    traceId?: string
    userIntent?: UserIntent
    codeBlockLanguage?: string
}

export interface ConnectorProps {
    sendMessageToExtension: (message: ExtensionMessage) => void
    onMessageReceived?: (tabID: string, messageData: any, needToShowAPIDocsTab: boolean) => void
    onChatAnswerUpdated?: (tabID: string, message: ChatItem) => void
    onChatAnswerReceived?: (tabID: string, message: ChatItem, messageData: any) => void
    onWelcomeFollowUpClicked: (tabID: string, welcomeFollowUpType: WelcomeFollowupType) => void
    onAsyncEventProgress: (tabID: string, inProgress: boolean, message: string | undefined) => void
    onQuickHandlerCommand: (tabID: string, command?: string, eventId?: string) => void
    onCWCContextCommandMessage: (message: ChatItem, command?: string) => string | undefined
    onOpenSettingsMessage: (tabID: string) => void
    onError: (tabID: string, message: string, title: string) => void
    onWarning: (tabID: string, message: string, title: string) => void
    onFileComponentUpdate: (
        tabID: string,
        filePaths: DiffTreeFileInfo[],
        deletedFiles: DiffTreeFileInfo[],
        messageId: string,
        disableFileActions: boolean
    ) => void
    onUpdatePlaceholder: (tabID: string, newPlaceholder: string) => void
    onChatInputEnabled: (tabID: string, enabled: boolean) => void
    onUpdateAuthentication: (featureDevEnabled: boolean, authenticatingTabIDs: string[]) => void
    onNewTab: (tabType: TabType) => void
    onFileActionClick: (tabID: string, messageId: string, filePath: string, actionName: string) => void
    tabsStorage: TabsStorage
}

export class Connector {
    private readonly sendMessageToExtension
    private readonly onMessageReceived
    private readonly cwChatConnector
    private readonly featureDevChatConnector
    private readonly gumbyChatConnector
    private readonly tabsStorage
    private readonly amazonqCommonsConnector: AmazonQCommonsConnector

    isUIReady = false

    constructor(props: ConnectorProps) {
        this.sendMessageToExtension = props.sendMessageToExtension
        this.onMessageReceived = props.onMessageReceived
        this.cwChatConnector = new CWChatConnector(props as ConnectorProps)
        this.featureDevChatConnector = new FeatureDevChatConnector(props)
        this.gumbyChatConnector = new GumbyChatConnector(props)
        this.amazonqCommonsConnector = new AmazonQCommonsConnector({
            sendMessageToExtension: this.sendMessageToExtension,
            onWelcomeFollowUpClicked: props.onWelcomeFollowUpClicked,
        })
        this.tabsStorage = props.tabsStorage
    }

    onSourceLinkClick = (tabID: string, messageId: string, link: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.onSourceLinkClick(tabID, messageId, link)
                break
        }
    }

    onResponseBodyLinkClick = (tabID: string, messageId: string, link: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.onResponseBodyLinkClick(tabID, messageId, link)
                break
            case 'featuredev':
                this.featureDevChatConnector.onResponseBodyLinkClick(tabID, messageId, link)
                break
            case 'gumby':
                this.gumbyChatConnector.onResponseBodyLinkClick(tabID, messageId, link)
        }
    }

    onInfoLinkClick = (tabID: string, link: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            default:
                this.cwChatConnector.onInfoLinkClick(tabID, link)
                break
        }
    }

    requestAnswer = (tabID: string, payload: ChatPayload) => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'gumby':
                return this.gumbyChatConnector.requestAnswer(tabID, payload)
        }
    }

    requestGenerativeAIAnswer = (tabID: string, messageId: string, payload: ChatPayload): Promise<any> =>
        new Promise((resolve, reject) => {
            if (this.isUIReady) {
                switch (this.tabsStorage.getTab(tabID)?.type) {
                    case 'featuredev':
                        return this.featureDevChatConnector.requestGenerativeAIAnswer(tabID, messageId, payload)
                    default:
                        return this.cwChatConnector.requestGenerativeAIAnswer(tabID, messageId, payload)
                }
            } else {
                return setTimeout(() => {
                    return this.requestGenerativeAIAnswer(tabID, messageId, payload)
                }, 2000)
            }
        })

    clearChat = (tabID: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.clearChat(tabID)
                break
        }
    }

    help = (tabID: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.help(tabID)
                break
        }
    }

    transform = (tabID: string): void => {
        this.gumbyChatConnector.transform(tabID)
    }

    onStopChatResponse = (tabID: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'featuredev':
                this.featureDevChatConnector.onStopChatResponse(tabID)
                break
            case 'cwc':
                this.cwChatConnector.onStopChatResponse(tabID)
                break
        }
    }

    handleMessageReceive = async (message: MessageEvent): Promise<void> => {
        if (message.data === undefined) {
            return
        }

        // TODO: potential json parsing error exists. Need to determine the failing case.
        const messageData = JSON.parse(message.data)

        if (messageData === undefined) {
            return
        }

        if (messageData.sender === 'CWChat') {
            await this.cwChatConnector.handleMessageReceive(messageData)
        } else if (messageData.sender === 'featureDevChat') {
            await this.featureDevChatConnector.handleMessageReceive(messageData)
        } else if (messageData.sender === 'gumbyChat') {
            await this.gumbyChatConnector.handleMessageReceive(messageData)
        }

        // Reset lastCommand after message is rendered.
        this.tabsStorage.updateTabLastCommand(messageData.tabID, '')
    }

    onTabAdd = (tabID: string): void => {
        this.tabsStorage.addTab({
            id: tabID,
            type: 'unknown',
            status: 'free',
            isSelected: true,
        })
    }

    onUpdateTabType = (tabID: string) => {
        const tab = this.tabsStorage.getTab(tabID)
        switch (tab?.type) {
            case 'cwc':
                this.cwChatConnector.onTabAdd(tabID, tab.openInteractionType)
                break
            case 'gumby':
                this.gumbyChatConnector.onTabAdd(tabID)
                break
        }
    }

    onKnownTabOpen = (tabID: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'featuredev':
                this.featureDevChatConnector.onTabOpen(tabID)
                break
        }
    }

    onTabChange = (tabId: string): void => {
        const prevTabID = this.tabsStorage.setSelectedTab(tabId)
        this.cwChatConnector.onTabChange(tabId, prevTabID)
    }

    onCodeInsertToCursorPosition = (
        tabID: string,
        messageId: string,
        code?: string,
        type?: 'selection' | 'block',
        codeReference?: CodeReference[],
        eventId?: string,
        codeBlockIndex?: number,
        totalCodeBlocks?: number,
        userIntent?: string,
        codeBlockLanguage?: string
    ): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.onCodeInsertToCursorPosition(
                    tabID,
                    messageId,
                    code,
                    type,
                    codeReference,
                    eventId,
                    codeBlockIndex,
                    totalCodeBlocks,
                    userIntent,
                    codeBlockLanguage
                )
                break
            case 'featuredev':
                this.featureDevChatConnector.onCodeInsertToCursorPosition(
                    tabID,
                    messageId,
                    code,
                    type,
                    codeReference,
                    eventId,
                    codeBlockIndex,
                    totalCodeBlocks,
                    userIntent,
                    codeBlockLanguage
                )
                break
        }
    }

    onAcceptDiff = (
        tabId: string,
        messageId: string,
        actionId: string,
        data?: string,
        code?: string,
        type?: CodeSelectionType,
        referenceTrackerInformation?: ReferenceTrackerInformation[],
        eventId?: string,
        codeBlockIndex?: number,
        totalCodeBlocks?: number
    ) => {
        const tabType = this.tabsStorage.getTab(tabId)?.type
        this.sendMessageToExtension({
            tabType,
            tabID: tabId,
            command: 'accept_diff',
            messageId,
            actionId,
            data,
            code,
            type,
            referenceTrackerInformation,
            eventId,
            codeBlockIndex,
            totalCodeBlocks,
        })
    }

    onViewDiff = (
        tabId: string,
        messageId: string,
        actionId: string,
        data?: string,
        code?: string,
        type?: CodeSelectionType,
        referenceTrackerInformation?: ReferenceTrackerInformation[],
        eventId?: string,
        codeBlockIndex?: number,
        totalCodeBlocks?: number
    ) => {
        const tabType = this.tabsStorage.getTab(tabId)?.type
        this.sendMessageToExtension({
            tabType,
            tabID: tabId,
            command: 'view_diff',
            messageId,
            actionId,
            data,
            code,
            type,
            referenceTrackerInformation,
            eventId,
            codeBlockIndex,
            totalCodeBlocks,
        })
    }

    onCopyCodeToClipboard = (
        tabID: string,
        messageId: string,
        code?: string,
        type?: 'selection' | 'block',
        codeReference?: CodeReference[],
        eventId?: string,
        codeBlockIndex?: number,
        totalCodeBlocks?: number,
        userIntent?: string,
        codeBlockLanguage?: string
    ): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'cwc':
                this.cwChatConnector.onCopyCodeToClipboard(
                    tabID,
                    messageId,
                    code,
                    type,
                    codeReference,
                    eventId,
                    codeBlockIndex,
                    totalCodeBlocks,
                    userIntent,
                    codeBlockLanguage
                )
                break
            case 'featuredev':
                this.featureDevChatConnector.onCopyCodeToClipboard(
                    tabID,
                    messageId,
                    code,
                    type,
                    codeReference,
                    eventId,
                    codeBlockIndex,
                    totalCodeBlocks,
                    userIntent,
                    codeBlockLanguage
                )
                break
        }
    }

    onTabRemove = (tabID: string): void => {
        const tab = this.tabsStorage.getTab(tabID)
        this.tabsStorage.deleteTab(tabID)
        switch (tab?.type) {
            case 'cwc':
                this.cwChatConnector.onTabRemove(tabID)
                break
            case 'featuredev':
                this.featureDevChatConnector.onTabRemove(tabID)
                break
            case 'gumby':
                this.gumbyChatConnector.onTabRemove(tabID)
                break
        }
    }

    uiReady = (): void => {
        this.isUIReady = true
        this.sendMessageToExtension({
            command: 'ui-is-ready',
        })

        if (this.onMessageReceived !== undefined) {
            window.addEventListener('message', this.handleMessageReceive.bind(this))
        }

        window.addEventListener('focus', this.handleApplicationFocus)
        window.addEventListener('blur', this.handleApplicationFocus)
    }

    handleApplicationFocus = async (event: FocusEvent): Promise<void> => {
        this.sendMessageToExtension({
            command: 'ui-focus',
            type: event.type,
            tabType: 'cwc',
        })
    }

    triggerSuggestionEngagement = (tabId: string, messageId: string, engagement: Engagement): void => {
        // let command: string = 'hoverSuggestion'
        // if (
        //     engagement.engagementType === EngagementType.INTERACTION &&
        //     engagement.selectionDistanceTraveled?.selectedText !== undefined
        // ) {
        //     command = 'selectSuggestionText'
        // }
        // this.sendMessageToExtension({
        //     command,
        //     searchId: this.searchId,
        //     suggestionId: engagement.suggestion.url,
        //     // suggestionRank: parseInt(engagement.suggestion.id),
        //     suggestionType: engagement.suggestion.type,
        //     selectedText: engagement.selectionDistanceTraveled?.selectedText,
        //     hoverDuration: engagement.engagementDurationTillTrigger / 1000, // seconds
        // })
    }

    onAuthFollowUpClicked = (tabID: string, authType: AuthFollowUpType) => {
        const tabType = this.tabsStorage.getTab(tabID)?.type
        switch (tabType) {
            case 'cwc':
            case 'featuredev':
                this.amazonqCommonsConnector.authFollowUpClicked(tabID, tabType, authType)
        }
    }

    onFollowUpClicked = (tabID: string, messageId: string, followUp: ChatItemAction): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            // TODO: We cannot rely on the tabType here,
            // It can come up at a later point depending on the future UX designs,
            // We should decide it depending on the followUp.type
            case 'unknown':
                this.amazonqCommonsConnector.followUpClicked(tabID, followUp)
                break
            case 'featuredev':
                this.featureDevChatConnector.followUpClicked(tabID, messageId, followUp)
                break
            default:
                this.cwChatConnector.followUpClicked(tabID, messageId, followUp)
                break
        }
    }

    onFileActionClick = (tabID: string, messageId: string, filePath: string, actionName: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'featuredev':
                this.featureDevChatConnector.onFileActionClick(tabID, messageId, filePath, actionName)
                break
        }
    }

    onOpenDiff = (tabID: string, filePath: string, deleted: boolean, messageId?: string): void => {
        switch (this.tabsStorage.getTab(tabID)?.type) {
            case 'featuredev':
                this.featureDevChatConnector.onOpenDiff(tabID, filePath, deleted, messageId)
                break
        }
    }

    sendFeedback = (tabId: string, feedbackPayload: FeedbackPayload): void | undefined => {
        switch (this.tabsStorage.getTab(tabId)?.type) {
            case 'featuredev':
                this.featureDevChatConnector.sendFeedback(tabId, feedbackPayload)
                break
            case 'cwc':
                this.cwChatConnector.onSendFeedback(tabId, feedbackPayload)
                break
        }
    }

    onChatItemVoted = (tabId: string, messageId: string, vote: 'upvote' | 'downvote'): void | undefined => {
        switch (this.tabsStorage.getTab(tabId)?.type) {
            case 'cwc':
                this.cwChatConnector.onChatItemVoted(tabId, messageId, vote)
                break
            case 'featuredev':
                this.featureDevChatConnector.onChatItemVoted(tabId, messageId, vote)
                break
        }
    }

    onCustomFormAction = (
        tabId: string,
        messageId: string | undefined,
        action: any,
        eventId: string | undefined = undefined
    ): void | undefined => {
        switch (this.tabsStorage.getTab(tabId)?.type) {
            case 'gumby':
                this.gumbyChatConnector.onCustomFormAction(tabId, action)
                break
            case 'cwc':
                if (action.id === `open-settings`) {
                    this.sendMessageToExtension({
                        command: 'open-settings',
                        type: '',
                        tabType: 'cwc',
                    })
                }
        }
    }
}
