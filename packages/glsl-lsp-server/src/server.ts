/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  CompletionItem,
  CompletionItemKind,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver/node"
import {
  check,
  findPositionNode,
  GLSL_LEXER,
  GLSL_PARSER,
  Node,
  shortDesc2,
  Token,
  TranslationUnit,
} from "prettier-plugin-glsl"

import { TextDocument } from "vscode-languageserver-textdocument"
import { isToken } from "prettier-plugin-glsl/out/nodes"
import { applyLineContinuations, fixLocations } from "prettier-plugin-glsl/out/preprocessor"
import { DefinitionLink, Range } from "vscode-languageserver"

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities

  console.log("test")

  connection.console.log("gadlkadlkajdlkajkj")

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  )
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  )
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  )

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      definitionProvider: true,
    },
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    }
  }
  return result
})

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    )
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.")
    })
  }
})

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 }
let globalSettings: ExampleSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map()

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear()
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.glslLanguageServer || defaultSettings)
    )
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument)
})

connection.onExit(() => {
  console.log("exited")
})

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings)
  }
  let result = documentSettings.get(resource)
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "glslLanguageServer",
    })
    documentSettings.set(resource, result)
  }
  return result
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri)
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document)
})

function getRange(textDocument: TextDocument, e: Token | Node): Range {
  return isToken(e)
    ? {
        start: textDocument.positionAt(e.startOffset),
        end: textDocument.positionAt(e.endOffset!),
      }
    : {
        start: textDocument.positionAt(e.firstToken!.startOffset),
        end: textDocument.positionAt(e.lastToken!.endOffset! + 1),
      }
}

let translationUnit: TranslationUnit

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(textDocument.uri)

  connection.console.log("HIII!!!")

  const originalText = textDocument.getText()

  const { result: input, changes } = applyLineContinuations(originalText)

  const diagnostics: Diagnostic[] = []
  const lexingResult = GLSL_LEXER.tokenize(input)
  for (let error of lexingResult.errors) {
    diagnostics.push({
      message: error.message,
      range: {
        start: { line: error.line!, character: error.column! },
        end: { line: error.line!, character: error.column! + error.length },
      },
      severity: DiagnosticSeverity.Error,
    })
  }

  fixLocations(lexingResult.tokens, changes)

  // "input" is a setter which will reset the glslParser's state.
  GLSL_PARSER.input = lexingResult.tokens
  translationUnit = GLSL_PARSER.translationUnit()
  for (let err of GLSL_PARSER.errors) {
    diagnostics.push({
      message: err.message,
      range: getRange(textDocument, err.token),
      severity: DiagnosticSeverity.Error,
    })
  }

  const errs = check(translationUnit, undefined)
  for (let err of errs) {
    diagnostics.push({
      message: err.message,
      range: getRange(textDocument, err.where),
      severity: DiagnosticSeverity.Error,
    })
  }

  // = errs.map((e) => {
  // const diag: Diagnostic = {
  //   range: getRange(textDocument, e),
  //   message: e.message,
  //   severity: DiagnosticSeverity.Error,
  // }
  // return diag
  // }))
  // const pattern = /\b[A-Z]{2,}\b/g
  // let m: RegExpExecArray | null
  //
  // let problems = 0
  // const diagnostics: Diagnostic[] = []
  // while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
  //   problems++
  //   const diagnostic: Diagnostic = {
  //     severity: DiagnosticSeverity.Warning,
  //     range: {
  //       start: textDocument.positionAt(m.index),
  //       end: textDocument.positionAt(m.index + m[0].length),
  //     },
  //     message: `${m[0]} is all uppercase.`,
  //     source: "ex",
  //   }
  //   if (hasDiagnosticRelatedInformationCapability) {
  //     diagnostic.relatedInformation = [
  //       {
  //         location: {
  //           uri: textDocument.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Spelling matters",
  //       },
  //       {
  //         location: {
  //           uri: textDocument.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Particularly for names",
  //       },
  //     ]
  //   }
  //   diagnostics.push(diagnostic)
  // }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event")
})

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    console.log(_textDocumentPosition)
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
      {
        label: "TypeScript",
        kind: CompletionItemKind.Text,
        data: 1,
      },
      {
        label: "JavaScript",
        kind: CompletionItemKind.Text,
        data: 2,
      },
    ]
  },
)

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = "TypeScript details"
    item.documentation = "TypeScript documentation"
  } else if (item.data === 2) {
    item.detail = "JavaScript details"
    item.documentation = "JavaScript documentation"
  }
  return item
})

connection.onDefinition(
  ({ textDocument, position }): DefinitionLink[] | undefined => {
    const [x, xx] = findPositionNode(
      translationUnit,
      position.line,
      position.character,
    )
    connection.console.log("" + xx.map(shortDesc2))
    return [
      {
        originSelectionRange: undefined as any,
        targetRange: undefined as any,
        targetSelectionRange: undefined as any,
        targetUri: "",
      },
    ]
  },
)

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
