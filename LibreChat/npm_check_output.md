
> LibreChat@v0.1.0 check:all
> npm run check:client && npm run check:api && npm run check:packages


> LibreChat@v0.1.0 check:client
> npm run lint:client && npm run typecheck:client && npm run format:client && npm run test:client


> LibreChat@v0.1.0 lint:client
> eslint "./client/src/**/*.{js,jsx,ts,tsx}"


/Users/gannonhall/+DEV/agentis/LibreChat/client/src/common/menus.ts
  1:1  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Artifacts/useDebounceCodeBlock.ts
  24:36  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Auth/SocialLoginRender.tsx
  108:107  error  disallow literal string: <div className="absolute bg-white px-3 text-xs text-black dark:bg-gray-900 dark:text-white">
                Or
              </div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Auth/VerifyEmail.tsx
  78:6  warning  React Hook useEffect has a missing dependency: 'localize'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Auth/__tests__/Registration.spec.tsx
  151:1  warning  Unused eslint-disable directive (no problems were reported from 'jest/no-commented-out-tests')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/ActiveSetting.tsx
  3:106  error  disallow literal string: <div className="text-token-text-tertiary space-x-2 overflow-hidden text-ellipsis text-sm font-light">
      Talking to{' '}
      <span className="text-token-text-secondary font-medium">[latest] Tailwind CSS GPT</span>
    </div>  i18next/no-literal-string
  5:63   error  disallow literal string: <span className="text-token-text-secondary font-medium">[latest] Tailwind CSS GPT</span>                                                                                                                                               i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/Files/DragDropOverlay.tsx
   3:9   error  Replace `⏎······className="bg-surface-primary/85·fixed·inset-0·z-[9999]·flex·flex-col·items-center·justify-center⏎········gap-2·text-text-primary⏎········backdrop-blur-[4px]·transition-all·duration-200⏎········ease-in-out·animate-in·fade-in⏎········zoom-in-95·hover:backdrop-blur-sm"⏎····` with `·className="bg-surface-primary/85·fixed·inset-0·z-[9999]·flex·flex-col·items-center·justify-center·gap-2·text-text-primary·backdrop-blur-[4px]·transition-all·duration-200·ease-in-out·animate-in·fade-in·zoom-in-95·hover:backdrop-blur-sm"`  prettier/prettier
  58:11  error  disallow literal string: <h3>Add anything</h3>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         i18next/no-literal-string
  59:11  error  disallow literal string: <h4>Drop any file here to add it to the conversation</h4>                                                                                                                                                                                                                                                                                                                                                                                                                                                                     i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/Files/FileRow.tsx
  78:9  error  Insert `··`                           prettier/prettier
  79:1  error  Insert `··`                           prettier/prettier
  80:9  error  Insert `··`                           prettier/prettier
  81:1  error  Replace `········` with `··········`  prettier/prettier
  82:1  error  Insert `··`                           prettier/prettier
  83:9  error  Insert `··`                           prettier/prettier
  84:1  error  Replace `······` with `········`      prettier/prettier
  86:1  error  Insert `··`                           prettier/prettier
  87:1  error  Replace `········` with `··········`  prettier/prettier
  88:1  error  Insert `··`                           prettier/prettier
  89:9  error  Insert `··`                           prettier/prettier
  90:1  error  Insert `··`                           prettier/prettier
  91:1  error  Insert `··`                           prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/Files/ImagePreview.tsx
  96:7  error  Insert `··`  prettier/prettier
  97:1  error  Insert `··`  prettier/prettier
  98:1  error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/Files/Table/DataTable.tsx
  221:23  error  Replace `⏎··············'com_files_number_selected',⏎·············` with `'com_files_number_selected',`  prettier/prettier
  224:1   error  Delete `··`                                                                                              prettier/prettier
  225:15  error  Delete `··`                                                                                              prettier/prettier
  226:13  error  Replace `··},⏎············` with `}`                                                                     prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/Files/Table/TemplateTable.tsx
   9:189  error  disallow literal string: <th className="sticky top-0 rounded-t border-b border-black/10 bg-white px-4 py-2 text-left font-medium text-gray-700 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100">
              Name
            </th>  i18next/no-literal-string
  12:189  error  disallow literal string: <th className="sticky top-0 rounded-t border-b border-black/10 bg-white px-4 py-2 text-left font-medium text-gray-700 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100">
              Date
            </th>  i18next/no-literal-string
  15:189  error  disallow literal string: <th className="sticky top-0 rounded-t border-b border-black/10 bg-white px-4 py-2 text-left font-medium text-gray-700 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100">
              Size
            </th>  i18next/no-literal-string
  35:80   error  disallow literal string: <div className="px-4 py-2 [tr[data-disabled=true]_&]:opacity-50">
                File Transfer: Node to FastAPI
              </div>                                                                                  i18next/no-literal-string
  40:80   error  disallow literal string: <div className="px-4 py-2 [tr[data-disabled=true]_&]:opacity-50">June 11, 2023</div>                                                                                                                                   i18next/no-literal-string
  43:80   error  disallow literal string: <div className="px-4 py-2 [tr[data-disabled=true]_&]:opacity-50">11 mb</div>                                                                                                                                           i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/HeaderOptions.tsx
  48:5  warning  React Hook useMemo has an unnecessary dependency: 'conversationId'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps
  55:6  warning  React Hook useEffect has a missing dependency: 'setShowPopover'. Either include it or remove the dependency array     react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Input/StreamAudio.tsx
  42:52  error  Replace `latestMessage?.conversationId·??·paramId·??·''` with `(latestMessage?.conversationId·??·paramId·??·'')`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Menus/Endpoints/components/EndpointItem.tsx
   70:81  warning  React Hook useMemo has a missing dependency: 'endpointRequiresUserKey'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  105:9   error    Insert `··`                                                                                                               prettier/prettier
  106:1   error    Insert `··`                                                                                                               prettier/prettier
  107:1   error    Insert `··`                                                                                                               prettier/prettier
  108:9   error    Insert `··`                                                                                                               prettier/prettier
  109:1   error    Insert `··`                                                                                                               prettier/prettier
  110:1   error    Insert `··`                                                                                                               prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Menus/Endpoints/components/EndpointModelItem.tsx
  48:11  error  Delete `··`  prettier/prettier
  49:13  error  Delete `··`  prettier/prettier
  50:11  error  Delete `··`  prettier/prettier
  51:1   error  Delete `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Menus/Endpoints/components/SearchResults.tsx
  105:17  error  Insert `··`  prettier/prettier
  106:17  error  Insert `··`  prettier/prettier
  107:1   error  Insert `··`  prettier/prettier
  110:17  error  Insert `··`  prettier/prettier
  111:1   error  Insert `··`  prettier/prettier
  112:1   error  Insert `··`  prettier/prettier
  113:19  error  Insert `··`  prettier/prettier
  116:17  error  Insert `··`  prettier/prettier
  117:1   error  Insert `··`  prettier/prettier
  118:17  error  Insert `··`  prettier/prettier
  119:1   error  Insert `··`  prettier/prettier
  120:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Menus/Models/fakeData.ts
  36:17  error  Replace `'What\'s·up!!'` with `"What's·up!!"`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Menus/UI/MenuItem.tsx
  58:54  error  Delete `·`  prettier/prettier
  75:39  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/Content/Parts/AgentUpdate.tsx
  14:9  warning  The 'agentsMap' logical expression could make the dependencies of useMemo Hook (at line 15) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'agentsMap' in its own useMemo() Hook  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/Content/Parts/EditTextPart.tsx
  120:13  error  Insert `··`  prettier/prettier
  121:1   error  Insert `··`  prettier/prettier
  122:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/Content/ToolCall.tsx
  142:1   error  Delete `····`  prettier/prettier
  145:1   error  Delete `····`  prettier/prettier
  151:1   error  Delete `····`  prettier/prettier
  155:1   error  Delete `····`  prettier/prettier
  167:28  error  Delete `·`     prettier/prettier
  169:78  error  Insert `,`     prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/Content/ToolPopover.tsx
  44:39  error  Delete `·`  prettier/prettier
  51:54  error  Delete `·`  prettier/prettier
  61:58  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/Message.tsx
   6:1   warning  Unused eslint-disable directive (no problems were reported from 'import/no-cycle')
  76:66  error    Delete `·`                                                                          prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/MultiMessage.tsx
  33:6  warning  React Hook useEffect has a missing dependency: 'setSiblingIdx'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/Messages/ui/MessageRender.tsx
   97:13  error  Insert `··`  prettier/prettier
   98:13  error  Insert `··`  prettier/prettier
   99:1   error  Insert `··`  prettier/prettier
  100:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Chat/TemporaryChat.tsx
  45:13  error  Delete `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Icon.tsx
  51:9   error  Delete `··`                               prettier/prettier
  52:7   error  Delete `··`                               prettier/prettier
  53:1   error  Replace `··········` with `········`      prettier/prettier
  54:1   error  Delete `··`                               prettier/prettier
  55:1   error  Replace `············` with `··········`  prettier/prettier
  56:11  error  Delete `··`                               prettier/prettier
  57:1   error  Delete `··`                               prettier/prettier
  58:9   error  Delete `··`                               prettier/prettier
  59:1   error  Delete `··`                               prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/SaveAsPresetDialog.tsx
  26:7   error  Replace `_preset.title·??·''` with `(_preset.title·??·'')`  prettier/prettier
  79:88  error  Delete `·`                                                  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/Advanced.tsx
  112:77  error  Delete `·`                                                                                              prettier/prettier
  163:82  error  disallow literal string: <small className="opacity-40">({localize('com_endpoint_default')}: 1)</small>  i18next/no-literal-string
  202:82  error  disallow literal string: <small className="opacity-40">({localize('com_endpoint_default')}: 0)</small>  i18next/no-literal-string
  241:82  error  disallow literal string: <small className="opacity-40">({localize('com_endpoint_default')}: 0)</small>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/AgentSettings.tsx
  56:82  error  disallow literal string: <small className="opacity-40">({localize('com_endpoint_default')}: 0)</small>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/Assistants.tsx
  164:76  error  Delete `·`  prettier/prettier
  181:76  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/Examples.tsx
  45:82  error  Delete `·`  prettier/prettier
  70:82  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/Google.tsx
   97:77  error  Delete `·`                                                                                                                                                                                                                                                                     prettier/prettier
  224:62  error  Insert `·`                                                                                                                                                                                                                                                                     prettier/prettier
  264:20  error  Replace `{localize('com_endpoint_default_with_num',·{·0:·google.maxOutputTokens.default·+·''·})}` with `⏎··················{localize('com_endpoint_default_with_num',·{⏎····················0:·google.maxOutputTokens.default·+·'',⏎··················})}⏎··················`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Endpoints/Settings/Plugins.tsx
  168:79  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/ActionButton.tsx
  15:8  error  disallow literal string: <Button
        className="w-full rounded-md border border-black bg-white p-0 text-black hover:bg-black hover:text-white"
        onClick={onClick}
      >
        Action Button
      </Button>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileDashboardView.tsx
  20:12  error  disallow literal string: <Button
            className="block lg:hidden"
            variant={'outline'}
            size={'sm'}
            onClick={() => {
              navigate('/d');
            }}
          >
            Go back
          </Button>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/DataTableFile.tsx
   90:19  error  disallow literal string: <strong>Files</strong>                                                       i18next/no-literal-string
  245:25  error  Replace `text-muted-foreground·ml-2·flex-1·text-sm` with `ml-2·flex-1·text-sm·text-muted-foreground`  prettier/prettier
  246:21  error  Delete `⏎············`                                                                                prettier/prettier
  248:1   error  Replace `··············` with `············`                                                          prettier/prettier
  249:1   error  Delete `··`                                                                                           prettier/prettier
  250:11  error  Replace `··},⏎··········` with `}`                                                                    prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/EmptyFilePreview.tsx
  5:73  error  disallow literal string: <div className="h-full w-full content-center text-center font-bold">
      Select a file to view details.
    </div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/FileListItem.tsx
  20:32  error  disallow literal string: <p>({file.bytes / 1000}KB)</p>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/FileListItem2.tsx
  45:56  error  disallow literal string: <span
                  key={index}
                  className="ml-2 mt-1 flex flex-row items-center rounded-full bg-[#f5f5f5] px-2 text-xs"
                >
                  <PlusIcon className="h-3 w-3" />
                  &nbsp;
                  {attachedVectorStores.length - index} more
                </span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/FilePreview.tsx
   77:58  error  disallow literal string: <span className="flex w-1/2 flex-row items-center sm:w-1/4 md:w-2/5">
            <InfoIcon className="size-4 text-gray-500" />
            &nbsp; File ID
          </span>               i18next/no-literal-string
   84:68  error  disallow literal string: <span className="flex w-1/2 flex-row items-center sm:w-1/4 md:w-2/5">
            <CircleIcon className="m-0 size-4 p-0 text-gray-500" />
            &nbsp; Status
          </span>      i18next/no-literal-string
   96:68  error  disallow literal string: <span className="flex w-1/2 flex-row items-center sm:w-1/4 md:w-2/5">
            <Clock3Icon className="m-0 size-4 p-0 text-gray-500" />
            &nbsp; Purpose
          </span>     i18next/no-literal-string
  103:68  error  disallow literal string: <span className="flex w-1/2 flex-row items-center sm:w-1/4 md:w-2/5">
            <Clock3Icon className="m-0 size-4 p-0 text-gray-500" />
            &nbsp; Size
          </span>        i18next/no-literal-string
  110:68  error  disallow literal string: <span className="flex w-1/2 flex-row items-center sm:w-1/4 md:w-2/5">
            <Clock3Icon className="m-0 size-4 p-0 text-gray-500" />
            &nbsp; Created At
          </span>  i18next/no-literal-string
  121:58  error  disallow literal string: <b className="text-sm md:text-base lg:text-lg">Attached To</b>                                                                                                                             i18next/no-literal-string
  125:86  error  disallow literal string: <div className="w-2/5 text-sm md:w-1/2 md:text-base lg:text-lg xl:w-2/3">
              Vector Stores
            </div>                                                                   i18next/no-literal-string
  128:86  error  disallow literal string: <div className="w-3/5 text-sm md:w-1/2 md:text-base lg:text-lg xl:w-1/3">Uploaded</div>                                                                                                    i18next/no-literal-string
  155:86  error  disallow literal string: <div className="w-2/5 text-sm md:w-1/2 md:text-base lg:text-lg xl:w-2/3">Threads</div>                                                                                                     i18next/no-literal-string
  156:86  error  disallow literal string: <div className="w-3/5 text-sm md:w-1/2 md:text-base lg:text-lg xl:w-1/3">Uploaded</div>                                                                                                    i18next/no-literal-string
  161:78  error  disallow literal string: <div className="ml-4 w-2/5 content-center md:w-1/2 xl:w-2/3">ID: {thread.id}</div>                                                                                                         i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/FileSidePanel.tsx
  154:17  error  disallow literal string: <strong>Files</strong>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/FileTableColumns.tsx
  86:56  error  disallow literal string: <span
                  key={index}
                  className="ml-2 mt-2 flex w-fit flex-row items-center rounded-full bg-[#f5f5f5] px-2 text-gray-500"
                >
                  <PlusIcon className="h-3 w-3" />
                  &nbsp;
                  {attachedVectorStores.length - index} more
                </span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/UploadFileButton.tsx
  14:46  error  disallow literal string: <span className="text-nowrap">Upload New File</span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FileList/UploadFileModal.tsx
  26:99  error  disallow literal string: <DialogTitle className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
            Upoad a File
          </DialogTitle>                                                                                                                                       i18next/no-literal-string
  36:39  error  disallow literal string: <div className="italic">Please upload square file, size less than 100KB</div>                                                                                                                                                                                                    i18next/no-literal-string
  39:27  error  disallow literal string: <Button>Choose File</Button>                                                                                                                                                                                                                                                     i18next/no-literal-string
  41:49  error  disallow literal string: <div className="w-1/2 sm:w-1/3"> No File Chosen</div>                                                                                                                                                                                                                            i18next/no-literal-string
  46:35  error  disallow literal string: <label htmlFor="name">Name</label>                                                                                                                                                                                                                                               i18next/no-literal-string
  47:63  error  disallow literal string: <label className="hidden text-[#808080] sm:block">The name of the uploaded file</label>                                                                                                                                                                                          i18next/no-literal-string
  52:38  error  disallow literal string: <label htmlFor="purpose">Purpose</label>                                                                                                                                                                                                                                         i18next/no-literal-string
  53:63  error  disallow literal string: <label className="hidden text-[#808080] sm:block">
              The purpose of the uploaded file
            </label>                                                                                                                                                           i18next/no-literal-string
  61:43  error  disallow literal string: <span className="font-bold">Learn about file purpose</span>                                                                                                                                                                                                                      i18next/no-literal-string
  69:16  error  disallow literal string: <Button
                className="mr-3 w-full rounded-md border border-black bg-white p-0 text-black hover:bg-white"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>  i18next/no-literal-string
  77:16  error  disallow literal string: <Button
                className="w-full rounded-md border border-black bg-black p-0 text-white"
                onClick={() => {
                  console.log('upload file');
                }}
              >
                Upload
              </Button>               i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/FilesSectionSelector.tsx
  30:10  error  disallow literal string: <Button
          className="w-full rounded rounded-lg border"
          style={selectedPage === '/vector-stores' ? darkButton : lightButton}
          onClick={() => {
            selectedPage = '/vector-stores';
            navigate('/d/vector-stores');
          }}
        >
          Vector Stores
        </Button>  i18next/no-literal-string
  42:10  error  disallow literal string: <Button
          className="w-full rounded rounded-lg border"
          style={selectedPage === '/files' ? darkButton : lightButton}
          onClick={() => {
            selectedPage = '/files';
            navigate('/d/files');
          }}
        >
          Files
        </Button>                                  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/EmptyVectorStorePreview.tsx
  5:73  error  disallow literal string: <div className="h-full w-full content-center text-center font-bold">
      Select a vector store to view details.
    </div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/VectorStoreButton.tsx
  14:46  error  disallow literal string: <span className="text-nowrap">Add Store</span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/VectorStoreFilter.tsx
  4:15  error  disallow literal string: <div>VectorStoreFilter</div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/VectorStoreListItem.tsx
  30:42  error  disallow literal string: <p>
          {vectorStore.file_counts.total} Files ({vectorStore.bytes / 1000}KB)
        </p>  i18next/no-literal-string
  30:76  error  disallow literal string: <p>
          {vectorStore.file_counts.total} Files ({vectorStore.bytes / 1000}KB)
        </p>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/VectorStorePreview.tsx
  102:62  error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  105:74  error  disallow literal string: <b className="hidden text-base md:text-lg lg:block lg:text-xl">VECTOR STORE</b>                                                                                                                                  i18next/no-literal-string
  138:88  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <BarChart4Icon className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Usage this &nbsp;month
          </span>  i18next/no-literal-string
  143:48  error  disallow literal string: <span className="text-[#91c561]">0 KB hours</span>                                                                                                                                                               i18next/no-literal-string
  143:65  error  disallow literal string: <p className="text-gray-500">
              <span className="text-[#91c561]">0 KB hours</span>
              &nbsp; Free until end of 2024
            </p>                                                      i18next/no-literal-string
  150:83  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <InfoIcon className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Size
          </span>                         i18next/no-literal-string
  153:77  error  disallow literal string: <span className="w-1/2 text-gray-500 md:w-3/5">{vectorStore.bytes} bytes</span>                                                                                                                                  i18next/no-literal-string
  157:81  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <Clock3 className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Last active
          </span>                    i18next/no-literal-string
  164:83  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <InfoIcon className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Expiration policy
          </span>            i18next/no-literal-string
  171:84  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <FileClock className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Expires
          </span>                     i18next/no-literal-string
  178:81  error  disallow literal string: <span className="flex w-1/2 flex-row items-center md:w-2/5">
            <Clock3 className="text-base text-gray-500 md:text-lg lg:text-xl" />
            &nbsp;Created At
          </span>                     i18next/no-literal-string
  187:58  error  disallow literal string: <b className="text-base md:text-lg lg:text-xl">Files attached</b>                                                                                                                                                i18next/no-literal-string
  191:77  error  disallow literal string: <div className="w-1/2 text-base md:text-lg lg:w-2/3 lg:text-xl">File</div>                                                                                                                                       i18next/no-literal-string
  192:77  error  disallow literal string: <div className="w-1/2 text-base md:text-lg lg:w-1/3 lg:text-xl">Uploaded</div>                                                                                                                                   i18next/no-literal-string
  218:58  error  disallow literal string: <b className="text-base md:text-lg lg:text-xl">Used by</b>                                                                                                                                                       i18next/no-literal-string
  220:55  error  disallow literal string: <Button variant={'default'}>
            <PlusIcon className="h-4 w-4 font-bold" />
            &nbsp; Create Assistant
          </Button>                                                                      i18next/no-literal-string
  226:77  error  disallow literal string: <div className="w-1/2 text-base md:text-lg lg:w-2/3 lg:text-xl">Resource</div>                                                                                                                                   i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStore/VectorStoreSidePanel.tsx
  222:19  error  disallow literal string: <strong>Vector Stores</strong>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Files/VectorStoreView.tsx
  21:10  error  disallow literal string: <Button
          className="block lg:hidden"
          variant={'outline'}
          size={'sm'}
          onClick={() => {
            navigate('/d/vector-stores');
          }}
        >
          Go back
        </Button>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Input/Generations/Continue.tsx
  11:67  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Input/Generations/Stop.tsx
  11:73  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Input/Generations/__tests__/Button.spec.tsx
  12:8   error  disallow literal string: <Button
        type="regenerate"
        onClick={() => {
          ('');
        }}
      >
        Regenerate
      </Button>  i18next/no-literal-string
  23:53  error  disallow literal string: <Button type="continue" onClick={handleClick}>
        Continue
      </Button>                                                   i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Input/SetKeyDialog/SetKeyDialog.tsx
  174:19  error  Insert `··`  prettier/prettier
  175:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Messages/Content/Plugin.tsx
   69:14  error  Replace `'I\'m··thinking...'` with `"I'm··thinking..."`                                                                                                                                                           prettier/prettier
  115:27  error  Replace `⏎······················latestPlugin·?·`RESPONSE·FROM·${latestPlugin.toUpperCase()}`·:·'RESPONSE'⏎····················` with `latestPlugin·?·`RESPONSE·FROM·${latestPlugin.toUpperCase()}`·:·'RESPONSE'`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Messages/ContentRender.tsx
  94:13  error  Insert `··`  prettier/prettier
  95:13  error  Insert `··`  prettier/prettier
  96:1   error  Insert `··`  prettier/prettier
  97:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Messages/MessageContent.tsx
   4:1   warning  Unused eslint-disable directive (no problems were reported from 'import/no-cycle')
  67:66  error    Delete `·`                                                                          prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/AccountSettings.tsx
  81:11  error  Insert `··`                                   prettier/prettier
  82:1   error  Insert `··`                                   prettier/prettier
  83:15  error  Insert `··`                                   prettier/prettier
  84:1   error  Replace `············` with `··············`  prettier/prettier
  85:1   error  Insert `··`                                   prettier/prettier
  86:11  error  Insert `··`                                   prettier/prettier
  87:1   error  Insert `··`                                   prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/NavToggle.tsx
  38:74  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/SettingsTabs/Account/Avatar.tsx
  105:6  warning  React Hook useCallback has a missing dependency: 'handleFile'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/SettingsTabs/Speech/STT/DecibelSelector.tsx
  18:39  error  Replace `({localize('com_endpoint_default_with_num',·{·0:·'-45'·})})` with `⏎··········({localize('com_endpoint_default_with_num',·{·0:·'-45'·})})⏎········`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/SettingsTabs/Speech/STT/EngineSTTDropdown.tsx
  17:7  error  Insert `··`  prettier/prettier
  18:1  error  Insert `··`  prettier/prettier
  19:1  error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/SettingsTabs/Speech/TTS/EngineTTSDropdown.tsx
  17:7  error  Insert `··`  prettier/prettier
  18:1  error  Insert `··`  prettier/prettier
  19:1  error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Nav/SettingsTabs/Speech/TTS/PlaybackRate.tsx
  18:39  error  Replace `({localize('com_endpoint_default_with_num',·{·0:·'1'·})})` with `⏎··········({localize('com_endpoint_default_with_num',·{·0:·'1'·})})⏎········`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Plugins/Store/PluginStoreDialog.tsx
  190:32  error  Delete `⏎····················`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Plugins/Store/PluginTooltip.tsx
  12:56  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/EmptyPromptPreview.tsx
  5:92  error  disallow literal string: <div className="h-full w-full content-center text-center font-bold dark:text-gray-200">
      Select or Create a Prompt
    </div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/Groups/FilterPrompts.tsx
  47:9  error  Insert `··`                               prettier/prettier
  48:1  error  Insert `··`                               prettier/prettier
  49:1  error  Replace `··········` with `············`  prettier/prettier
  50:9  error  Insert `··`                               prettier/prettier
  51:1  error  Insert `··`                               prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/Groups/ListCard.tsx
  29:137  error  Delete `⏎·········`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/PreviewLabels.tsx
  39:88  error  disallow literal string: <h3 className="rounded-t-lg border border-gray-300 px-4 text-base font-semibold">Labels</h3>  i18next/no-literal-string
  62:55  error  disallow literal string: <label className="rounded-full border px-2">No Labels</label>                                 i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/PromptForm.tsx
  181:35  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead  react-hooks/exhaustive-deps
  191:34  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead  react-hooks/exhaustive-deps
  290:13  error    Insert `··`                                                                                                 prettier/prettier
  291:1   error    Insert `··`                                                                                                 prettier/prettier
  292:1   error    Insert `··`                                                                                                 prettier/prettier
  293:11  error    Insert `··`                                                                                                 prettier/prettier
  295:13  error    Insert `··`                                                                                                 prettier/prettier
  296:1   error    Replace `··············` with `················`                                                            prettier/prettier
  297:1   error    Insert `··`                                                                                                 prettier/prettier
  298:15  error    Insert `··`                                                                                                 prettier/prettier
  299:1   error    Replace `··············` with `················`                                                            prettier/prettier
  300:13  error    Insert `··`                                                                                                 prettier/prettier
  301:1   error    Insert `··`                                                                                                 prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Prompts/PromptVersions.tsx
  128:70  error  disallow literal string: <Label className="text-left text-xs text-text-secondary">by {authorName}</Label>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Share/Message.tsx
  10:1   warning  Unused eslint-disable directive (no problems were reported from 'import/no-cycle')
  51:64  error    Delete `·`                                                                          prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Share/MultiMessage.tsx
  5:1  warning  Unused eslint-disable directive (no problems were reported from 'import/no-cycle')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Share/ShareView.tsx
  18:56  error  Replace `dataTree·??·null` with `(dataTree·??·null)`  prettier/prettier
  56:64  error  Delete `·`                                            prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/ActionsInput.tsx
  211:12  error  disallow literal string: <label
            htmlFor="schemaInput"
            className="text-token-text-primary whitespace-nowrap font-medium"
          >
            Schema
          </label>  i18next/no-literal-string
  224:33  error  disallow literal string: <option value="0">Weather (JSON)</option>                                                                                                                                 i18next/no-literal-string
  225:33  error  disallow literal string: <option value="1">Pet Store (YAML)</option>                                                                                                                               i18next/no-literal-string
  226:33  error  disallow literal string: <option value="2">Blank Template</option>                                                                                                                                 i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/Advanced/AgentChain.tsx
  26:9  warning  The 'agentsMap' logical expression could make the dependencies of useMemo Hook (at line 29) change on every render. To fix this, wrap the initialization of 'agentsMap' in its own useMemo() Hook      react-hooks/exhaustive-deps
  26:9  warning  The 'agentsMap' logical expression could make the dependencies of useCallback Hook (at line 56) change on every render. To fix this, wrap the initialization of 'agentsMap' in its own useMemo() Hook  react-hooks/exhaustive-deps
  27:9  warning  The 'agentIds' logical expression could make the dependencies of useEffect Hook (at line 63) change on every render. To fix this, wrap the initialization of 'agentIds' in its own useMemo() Hook      react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/AgentConfig.tsx
   42:9   warning  The 'allTools' logical expression could make the dependencies of useMemo Hook (at line 156) change on every render. To fix this, wrap the initialization of 'allTools' in its own useMemo() Hook           react-hooks/exhaustive-deps
  159:34  error    Insert `⏎····`                                                                                                                                                                                             prettier/prettier
  160:1   error    Insert `··`                                                                                                                                                                                                prettier/prettier
  161:7   error    Replace `const·newTools·=·(tools·||·[]).filter(t` with `··const·newTools·=·(tools·||·[]).filter((t)`                                                                                                       prettier/prettier
  162:7   error    Insert `··`                                                                                                                                                                                                prettier/prettier
  163:1   error    Replace `····` with `······`                                                                                                                                                                               prettier/prettier
  164:1   error    Replace `··},·[tools,·methods]` with `····},⏎····[tools,·methods],⏎··`                                                                                                                                     prettier/prettier
  167:41  error    Insert `⏎····`                                                                                                                                                                                             prettier/prettier
  168:1   error    Insert `··`                                                                                                                                                                                                prettier/prettier
  169:1   error    Replace `······const·toolsToRemove·=·mcpServerGroups[serverName].map(t` with `········const·toolsToRemove·=·mcpServerGroups[serverName].map((t)`                                                           prettier/prettier
  170:1   error    Replace `······const·newTools·=·(tools·||·[]).filter(t` with `········const·newTools·=·(tools·||·[]).filter((t)`                                                                                           prettier/prettier
  171:1   error    Replace `······` with `········`                                                                                                                                                                           prettier/prettier
  172:5   error    Insert `··`                                                                                                                                                                                                prettier/prettier
  173:1   error    Replace `··},·[mcpServerGroups,·tools,·methods]` with `····},⏎····[mcpServerGroups,·tools,·methods],⏎··`                                                                                                   prettier/prettier
  318:1   error    Delete `············`                                                                                                                                                                                      prettier/prettier
  322:37  error    Delete `·`                                                                                                                                                                                                 prettier/prettier
  325:62  error    Delete `·`                                                                                                                                                                                                 prettier/prettier
  331:1   error    Delete `······················`                                                                                                                                                                            prettier/prettier
  334:27  error    Replace `tool.pluginKey.includes('COMPOSIO_')·||·` with `⏎························tool.pluginKey.includes('COMPOSIO_')·||`                                                                                 prettier/prettier
  335:1   error    Replace `··························tool.pluginKey.includes(`${serverName.toUpperCase()}_`)` with `························tool.pluginKey.includes(`${serverName.toUpperCase()}_`)⏎······················`  prettier/prettier
  344:1   error    Delete `······················`                                                                                                                                                                            prettier/prettier
  347:30  error    Insert `,`                                                                                                                                                                                                 prettier/prettier
  349:1   error    Delete `··············`                                                                                                                                                                                    prettier/prettier
  352:60  error    Replace `t` with `(t)`                                                                                                                                                                                     prettier/prettier
  356:1   error    Delete `··············`                                                                                                                                                                                    prettier/prettier
  366:1   error    Delete `············`                                                                                                                                                                                      prettier/prettier
  418:2   error    Insert `⏎`                                                                                                                                                                                                 prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/AgentTool.tsx
   26:1   error  Delete `··`                                                                                                                                             prettier/prettier
   28:48  error  Replace `⏎····?·allTools.find((t)·=>·t.pluginKey·===·tool)⏎···` with `?·allTools.find((t)·=>·t.pluginKey·===·tool)`                                     prettier/prettier
  100:32  error  Replace `currentTool?.pluginKey·?·removeTool(currentTool.pluginKey)·:·null` with `(currentTool?.pluginKey·?·removeTool(currentTool.pluginKey)·:·null)`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/AgentToolGroup.tsx
  21:26  error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  22:14  error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  23:9   error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  26:16  error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  27:16  error  Replace `·` with `,`                                                                                                                                                                                                                      prettier/prettier
  31:1   error  Delete `··`                                                                                                                                                                                                                               prettier/prettier
  33:21  error  Replace `mb-3·rounded-md·border·border-border-medium·shadow-sm·transition-all·duration-200·hover:border-border-hover` with `hover:border-border-hover·mb-3·rounded-md·border·border-border-medium·shadow-sm·transition-all·duration-200`  prettier/prettier
  34:11  error  Delete `·`                                                                                                                                                                                                                                prettier/prettier
  35:90  error  Replace `hover:bg-surface-active·transition-colors·duration-200` with `transition-colors·duration-200·hover:bg-surface-active`                                                                                                            prettier/prettier
  39:25  error  Insert `(`                                                                                                                                                                                                                                prettier/prettier
  40:68  error  Replace `·:·` with `⏎··········)·:·(`                                                                                                                                                                                                     prettier/prettier
  42:11  error  Insert `)`                                                                                                                                                                                                                                prettier/prettier
  53:22  error  Replace `rounded·p-1·hover:bg-surface-danger·hover:text-text-danger` with `hover:bg-surface-danger·hover:text-text-danger·rounded·p-1`                                                                                                    prettier/prettier
  60:1   error  Delete `······`                                                                                                                                                                                                                           prettier/prettier
  62:25  error  Replace `border-t·border-border-medium·p-3·space-y-2·bg-surface-primary` with `space-y-2·border-t·border-border-medium·bg-surface-primary·p-3`                                                                                            prettier/prettier
  63:22  error  Replace `tool` with `(tool)`                                                                                                                                                                                                              prettier/prettier
  74:90  error  Insert `,`                                                                                                                                                                                                                                prettier/prettier
  78:1   error  Delete `············`                                                                                                                                                                                                                     prettier/prettier
  95:31  error  Insert `⏎`                                                                                                                                                                                                                                prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/ImageVision.tsx
  22:44  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/ShareAgent.tsx
  138:32  error  Replace `⏎············'com_ui_share_var',` with `'com_ui_share_var',·{`                                                                                                                               prettier/prettier
  140:12  error  Replace `·{·0:·agentName·!=·null·&&·agentName·!==·''·?·`"${agentName}"`·:·localize('com_ui_agent')·}` with `·0:·agentName·!=·null·&&·agentName·!==·''·?·`"${agentName}"`·:·localize('com_ui_agent')`  prettier/prettier
  141:11  error  Insert `}`                                                                                                                                                                                            prettier/prettier
  151:21  error  Replace `⏎············'com_ui_share_var',` with `'com_ui_share_var',·{`                                                                                                                               prettier/prettier
  153:12  error  Replace `·{·0:·agentName·!=·null·&&·agentName·!==·''·?·`"${agentName}"`·:·localize('com_ui_agent')·}` with `·0:·agentName·!=·null·&&·agentName·!==·''·?·`"${agentName}"`·:·localize('com_ui_agent')`  prettier/prettier
  154:11  error  Insert `}`                                                                                                                                                                                            prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Agents/__tests__/AgentToolGroup.test.tsx
  11:84  error  Replace `Remove·Tool` with `⏎········Remove·Tool⏎······`                                                                                                         prettier/prettier
  11:84  error  disallow literal string: <button onClick={onRemoveTool} data-testid={`remove-tool-${tool.pluginKey}`}>Remove Tool</button>                                       i18next/no-literal-string
  53:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  57:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  59:12  error  Replace `screen.queryByTestId('agent-tool-create_sheet_mcp_googlesheets')` with `⏎······screen.queryByTestId('agent-tool-create_sheet_mcp_googlesheets'),⏎····`  prettier/prettier
  60:12  error  Replace `screen.queryByTestId('agent-tool-update_sheet_mcp_googlesheets')` with `⏎······screen.queryByTestId('agent-tool-update_sheet_mcp_googlesheets'),⏎····`  prettier/prettier
  65:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  68:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  76:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  80:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  85:6   error  Replace `'calls·onRemoveTool·when·a·tool\'s·remove·button·is·clicked'` with `"calls·onRemoveTool·when·a·tool's·remove·button·is·clicked"`                        prettier/prettier
  87:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  90:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  94:1   error  Delete `····`                                                                                                                                                    prettier/prettier
  98:4   error  Insert `⏎`                                                                                                                                                       prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Bookmarks/BookmarkTableRow.tsx
  47:53  error  Replace `return;` with `⏎········return;⏎······`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Builder/ActionsAuth.tsx
  36:49  error  Replace `⏎··············{localize(getAuthLocalizationKey(type))}⏎············` with `{localize(getAuthLocalizationKey(type))}`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Builder/ActionsInput.tsx
  235:33  error  disallow literal string: <option value="0">Weather (JSON)</option>    i18next/no-literal-string
  236:33  error  disallow literal string: <option value="1">Pet Store (YAML)</option>  i18next/no-literal-string
  237:33  error  disallow literal string: <option value="2">Blank Template</option>    i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Builder/Code.tsx
  32:48  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Builder/ImageVision.tsx
  22:44  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Builder/Images.tsx
  110:10  error  disallow literal string: <div
          role="menuitem"
          className="group m-1.5 flex cursor-pointer gap-2 rounded p-2.5 text-sm hover:bg-gray-100 focus:ring-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:bg-white/5"
          tabIndex={-1}
          data-orientation="vertical"
          onClick={onItemClick}
        >
          Upload Photo
        </div>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Files/PanelColumns.tsx
  13:24  error  React Hook "useLocalize" is called in function "header" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use"  react-hooks/rules-of-hooks
  36:24  error  React Hook "useLocalize" is called in function "header" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use"  react-hooks/rules-of-hooks

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicCheckbox.tsx
  69:28  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
  88:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicCombobox.tsx
   96:30  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
  108:45  error  Replace `·?·localize(selectPlaceholder·as·TranslationKeys)` with `⏎················?·localize(selectPlaceholder·as·TranslationKeys)⏎···············`                                                                                                            prettier/prettier
  111:45  error  Replace `·?·localize(searchPlaceholder·as·TranslationKeys)` with `⏎················?·localize(searchPlaceholder·as·TranslationKeys)⏎···············`                                                                                                            prettier/prettier
  123:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicDropdown.tsx
   81:30  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
   99:26  error  Replace `placeholderCode·?·localize(placeholder·as·TranslationKeys)·??·placeholder·:·placeholder` with `⏎··············placeholderCode⏎················?·(localize(placeholder·as·TranslationKeys)·??·placeholder)⏎················:·placeholder⏎············`  prettier/prettier
  104:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicSlider.tsx
   63:29  error  Insert `⏎········`                                                                                                                                                                                                                                              prettier/prettier
   64:9   error  Insert `··`                                                                                                                                                                                                                                                     prettier/prettier
   65:1   error  Replace `········` with `··········`                                                                                                                                                                                                                            prettier/prettier
   66:7   error  Replace `},·{}·as·Record<string,·number>` with `··},⏎········{}·as·Record<string,·number>,⏎······`                                                                                                                                                              prettier/prettier
   73:29  error  Insert `⏎········`                                                                                                                                                                                                                                              prettier/prettier
   74:1   error  Replace `········` with `··········`                                                                                                                                                                                                                            prettier/prettier
   75:9   error  Insert `··`                                                                                                                                                                                                                                                     prettier/prettier
   76:7   error  Replace `},·{}·as·Record<number,·string>` with `··},⏎········{}·as·Record<number,·string>,⏎······`                                                                                                                                                              prettier/prettier
  120:28  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
  135:31  error  Replace `range.step·??·1` with `(range.step·??·1)`                                                                                                                                                                                                              prettier/prettier
  167:20  error  Replace `inputValue·as·number)·??·(defaultValue·as·number` with `(inputValue·as·number)·??·(defaultValue·as·number)`                                                                                                                                            prettier/prettier
  173:27  error  Replace `range.step·??·1` with `(range.step·??·1)`                                                                                                                                                                                                              prettier/prettier
  179:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicSwitch.tsx
  68:28  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
  87:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicTags.tsx
   78:47  error  Insert `·`                                                                                                                                                                                                                                                                      prettier/prettier
  129:28  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                                      prettier/prettier
  177:30  error  Replace `placeholderCode·?·localize(placeholder·as·TranslationKeys)·??·placeholder·:·placeholder` with `⏎··················placeholderCode⏎····················?·(localize(placeholder·as·TranslationKeys)·??·placeholder)⏎····················:·placeholder⏎················`  prettier/prettier
  185:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`                  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/Parameters/DynamicTextarea.tsx
  61:28  error  Replace `localize(label·as·TranslationKeys)·??·label` with `(localize(label·as·TranslationKeys)·??·label)`                                                                                                                                                      prettier/prettier
  78:26  error  Replace `placeholderCode·?·localize(placeholder·as·TranslationKeys)·??·placeholder·:·placeholder` with `⏎··············placeholderCode⏎················?·(localize(placeholder·as·TranslationKeys)·??·placeholder)⏎················:·placeholder⏎············`  prettier/prettier
  87:26  error  Replace `descriptionCode·?·localize(description·as·TranslationKeys)·??·description·:·description` with `⏎··············descriptionCode⏎················?·(localize(description·as·TranslationKeys)·??·description)⏎················:·description⏎············`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/SidePanel.tsx
   82:6  warning  React Hook useCallback has missing dependencies: 'panelRef', 'setCollapsedSize', 'setFullCollapse', 'setIsCollapsed', and 'setMinSize'. Either include them or remove the dependency array. If 'setIsCollapsed' changes too often, find the parent component that defines it and wrap that definition in useCallback  react-hooks/exhaustive-deps
  111:6  warning  React Hook useCallback has missing dependencies: 'panelRef', 'setCollapsedSize', 'setFullCollapse', 'setIsCollapsed', and 'setMinSize'. Either include them or remove the dependency array. If 'setIsCollapsed' changes too often, find the parent component that defines it and wrap that definition in useCallback  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/SidePanelGroup.tsx
  63:31  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/SidePanel/data.tsx
   7:16  error  disallow literal string: <title>Vercel</title>  i18next/no-literal-string
  17:16  error  disallow literal string: <title>Gmail</title>   i18next/no-literal-string
  30:16  error  disallow literal string: <title>iCloud</title>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/MCPServerCard.tsx
  18:25  error  Delete `·`                                                                                                                                                                                                                  prettier/prettier
  19:14  error  Delete `·`                                                                                                                                                                                                                  prettier/prettier
  21:15  error  Delete `·`                                                                                                                                                                                                                  prettier/prettier
  22:8   error  Delete `·`                                                                                                                                                                                                                  prettier/prettier
  23:9   error  Delete `·`                                                                                                                                                                                                                  prettier/prettier
  24:14  error  Replace `·` with `,`                                                                                                                                                                                                        prettier/prettier
  27:1   error  Delete `··`                                                                                                                                                                                                                 prettier/prettier
  30:1   error  Delete `··`                                                                                                                                                                                                                 prettier/prettier
  32:21  error  Replace `flex·flex-col·gap-4·rounded·border·border-border-medium·bg-transparent·p-6·hover:border-border-hover` with `hover:border-border-hover·flex·flex-col·gap-4·rounded·border·border-border-medium·bg-transparent·p-6`  prettier/prettier
  67:31  error  Replace `text-text-tertiary·font-medium` with `font-medium·text-text-tertiary`                                                                                                                                              prettier/prettier
  74:30  error  Insert `⏎`                                                                                                                                                                                                                  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/MCPServerToolSelect.tsx
   37:44  error  Replace `tool` with `(tool)`                                                                                                                                                                       prettier/prettier
   38:1   error  Delete `····`                                                                                                                                                                                      prettier/prettier
   40:57  error  Replace `tool` with `(tool)`                                                                                                                                                                       prettier/prettier
   48:44  error  Replace `tool` with `(tool)`                                                                                                                                                                       prettier/prettier
   49:1   error  Delete `····`                                                                                                                                                                                      prettier/prettier
   53:47  error  Replace `key` with `(key)`                                                                                                                                                                         prettier/prettier
   66:12  error  Replace `⏎······open={isOpen}⏎······onClose={()·=>·setIsOpen(false)}⏎······className="relative·z-[103]"⏎····` with `·open={isOpen}·onClose={()·=>·setIsOpen(false)}·className="relative·z-[103]"`  prettier/prettier
   96:1   error  Delete `··········`                                                                                                                                                                                prettier/prettier
   98:29  error  Replace `flex·items-center·justify-between·px-2·py-4·border-b·border-border-medium·mb-2` with `mb-2·flex·items-center·justify-between·border-b·border-border-medium·px-2·py-4`                     prettier/prettier
  108:40  error  Replace `text-text-tertiary·font-medium` with `font-medium·text-text-tertiary`                                                                                                                     prettier/prettier
  112:1   error  Delete `············`                                                                                                                                                                              prettier/prettier
  114:26  error  Replace `tool` with `(tool)`                                                                                                                                                                       prettier/prettier
  117:82  error  Replace `hover:bg-surface-hover·transition-colors·duration-150` with `transition-colors·duration-150·hover:bg-surface-hover`                                                                       prettier/prettier
  127:79  error  Replace `{tool.displayName·||·tool.name}` with `⏎························{tool.displayName·||·tool.name}⏎······················`                                                                   prettier/prettier
  134:1   error  Delete `············`                                                                                                                                                                              prettier/prettier
  136:48  error  Replace `g-blue-50·p-4·dark:bg-blue-950·border·border-blue-200·dark:border-blue-80` with `order·border-blue-200·bg-blue-50·p-4·dark:border-blue-800·dark:bg-blue-95`                               prettier/prettier
  146:26  error  Replace `⏎························{localize('com_ui_helper_tools_description')}⏎······················` with `{localize('com_ui_helper_tools_description')}`                                       prettier/prettier
  151:40  error  Replace `tool` with `(tool)`                                                                                                                                                                       prettier/prettier
  157:1   error  Delete `············`                                                                                                                                                                              prettier/prettier
  168:28  error  Replace `mt-3·w-full·sm:mt-0·sm:w-auto·btn·btn-neutral` with `btn·btn-neutral·mt-3·w-full·sm:mt-0·sm:w-auto`                                                                                       prettier/prettier
  181:36  error  Insert `⏎`                                                                                                                                                                                         prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/ToolSelectDialog.tsx
   37:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  128:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  132:38  error    Replace `t` with `(t)`                                                                                                                                                                                              prettier/prettier
  141:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  148:39  error    Replace `·tools·&&·Array.isArray(tools)·⏎····?·groupMCPToolsByServer(tools,·window.__mcpServerConfigs)·` with `⏎····tools·&&·Array.isArray(tools)⏎······?·groupMCPToolsByServer(tools,·window.__mcpServerConfigs)`  prettier/prettier
  150:1   error    Replace `····` with `······`                                                                                                                                                                                        prettier/prettier
  151:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  153:45  error    Replace `server·=>·⏎` with `⏎····(server)·=>⏎··`                                                                                                                                                                    prettier/prettier
  155:1   error    Replace `····server.description.toLowerCase().includes(searchValue.toLowerCase())` with `······server.description.toLowerCase().includes(searchValue.toLowerCase()),`                                               prettier/prettier
  157:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  158:52  error    Replace `tool·=>·⏎` with `⏎····(tool)·=>⏎··`                                                                                                                                                                        prettier/prettier
  160:1   error    Replace `····tool.description.toLowerCase().includes(searchValue.toLowerCase())` with `······tool.description.toLowerCase().includes(searchValue.toLowerCase()),`                                                   prettier/prettier
  162:1   error    Delete `··`                                                                                                                                                                                                         prettier/prettier
  164:9   warning  The 'filteredItems' array makes the dependencies of useEffect Hook (at line 177) change on every render. To fix this, wrap the initialization of 'filteredItems' in its own useMemo() Hook                          react-hooks/exhaustive-deps
  164:56  error    Replace `⏎····...filteredServers,⏎····...filteredRegularTools⏎··` with `...filteredServers,·...filteredRegularTools`                                                                                                prettier/prettier
  320:1   error    Delete `······`                                                                                                                                                                                                     prettier/prettier
  337:33  error    Insert `⏎`                                                                                                                                                                                                          prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/__tests__/MCPServerCard.test.tsx
  41:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  43:12  error  Replace `⏎······screen.getByText('Google·Sheets·integration·with·multiple·tools')⏎····` with `screen.getByText('Google·Sheets·integration·with·multiple·tools')`  prettier/prettier
  46:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  49:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  56:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  67:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  69:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  77:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  81:1   error  Delete `····`                                                                                                                                                     prettier/prettier
  85:4   error  Insert `⏎`                                                                                                                                                        prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/__tests__/MCPServerToolSelect.test.tsx
  70:1  error  Delete `····`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/Tools/__tests__/ToolSelectDialog.test.tsx
   26:7   error    Replace `'com_nav_tool_dialog'` with `com_nav_tool_dialog`                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
   27:7   error    Replace `'com_nav_tool_dialog_agents'` with `com_nav_tool_dialog_agents`                                                                                                                                                                                                                                                                                                                                                                                                                       prettier/prettier
   28:7   error    Replace `'com_nav_tool_dialog_description'` with `com_nav_tool_dialog_description`                                                                                                                                                                                                                                                                                                                                                                                                             prettier/prettier
   29:7   error    Replace `'com_nav_tool_search'` with `com_nav_tool_search`                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
   30:7   error    Replace `'com_nav_plugin_auth_error'` with `com_nav_plugin_auth_error`                                                                                                                                                                                                                                                                                                                                                                                                                         prettier/prettier
   31:7   error    Replace `'com_ui_tools_available'` with `com_ui_tools_available`                                                                                                                                                                                                                                                                                                                                                                                                                               prettier/prettier
   68:1   error    Delete `··`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    prettier/prettier
   83:1   error    Delete `··`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    prettier/prettier
  141:89  error    disallow literal string: <button onClick={() => onRemoveTool()} data-testid={`remove-${tool.pluginKey}`}>
          Remove
        </button>                                                                                                                                                                                                                                                                                                                                                   i18next/no-literal-string
  145:83  error    disallow literal string: <button onClick={() => onAddTool()} data-testid={`add-${tool.pluginKey}`}>
          Add
        </button>                                                                                                                                                                                                                                                                                                                                                            i18next/no-literal-string
  157:35  error    disallow literal string: <div data-testid={`server-card-${serverName}`}>
      {serverName} ({tools.length} tools)
      <button onClick={onAddServer} data-testid={`add-server-${serverName}`}>
        Add Server
      </button>
    </div>                                                                                                                                                                                                                                                 i18next/no-literal-string
  158:78  error    disallow literal string: <button onClick={onAddServer} data-testid={`add-server-${serverName}`}>
        Add Server
      </button>                                                                                                                                                                                                                                                                                                                                                            i18next/no-literal-string
  169:61  error    disallow literal string: <div data-testid={`server-tool-select-${serverName}`}>
        Select tools for {serverName}
        <button
          onClick={() => onConfirm(['auth_helper_mcp_googlesheets', 'create_sheet_mcp_googlesheets'])}
          data-testid={`confirm-tools-${serverName}`}
        >
          Confirm
        </button>
        <button onClick={() => setIsOpen(false)} data-testid={`cancel-tools-${serverName}`}>
          Cancel
        </button>
      </div>  i18next/no-literal-string
  172:25  error    Replace `·onConfirm(['auth_helper_mcp_googlesheets',·'create_sheet_mcp_googlesheets'])` with `⏎············onConfirm(['auth_helper_mcp_googlesheets',·'create_sheet_mcp_googlesheets'])⏎··········`                                                                                                                                                                                                                                                                                            prettier/prettier
  174:10  error    disallow literal string: <button
          onClick={() => onConfirm(['auth_helper_mcp_googlesheets', 'create_sheet_mcp_googlesheets'])}
          data-testid={`confirm-tools-${serverName}`}
        >
          Confirm
        </button>                                                                                                                                                                                                                                                    i18next/no-literal-string
  177:93  error    disallow literal string: <button onClick={() => setIsOpen(false)} data-testid={`cancel-tools-${serverName}`}>
          Cancel
        </button>                                                                                                                                                                                                                                                                                                                                               i18next/no-literal-string
  185:64  error    disallow literal string: <div data-testid="plugin-pagination">Pagination</div>                                                                                                                                                                                                                                                                                                                                                                                                                 i18next/no-literal-string
  186:61  error    disallow literal string: <div data-testid="plugin-auth-form">Auth Form</div>                                                                                                                                                                                                                                                                                                                                                                                                                   i18next/no-literal-string
  206:62  error    Replace `typeof·ToolSelectDialog` with `⏎······typeof·ToolSelectDialog⏎····`                                                                                                                                                                                                                                                                                                                                                                                                                   prettier/prettier
  213:21  error    Insert `,`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
  231:21  error    Insert `,`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
  243:3   warning  Test has no assertions                                                                                                                                                                                                                                                                                                                                                                                                                                                                         jest/expect-expect
  247:21  error    Insert `,`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
  271:21  error    Insert `,`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier
  289:26  error    Replace `·isOpen:·false,·serverName:·'googlesheets',·tools:·[],·helperTools:·[],·onConfirm:·jest.fn(),·setIsOpen:·jest.fn()` with `⏎······isOpen:·false,⏎······serverName:·'googlesheets',⏎······tools:·[],⏎······helperTools:·[],⏎······onConfirm:·jest.fn(),⏎······setIsOpen:·jest.fn(),⏎···`                                                                                                                                                                                                prettier/prettier
  294:4   error    Insert `⏎`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/svg/AzureMinimalIcon.tsx
  1:1  error  Delete `⏎`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Accordion.tsx
  31:35  error  Replace `text-muted-foreground·h-4·w-4·shrink-0` with `h-4·w-4·shrink-0·text-muted-foreground`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/AnimatedSearchInput.tsx
   27:18  error  Delete `⏎················`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   prettier/prettier
   40:25  error  Replace `⏎··············peer·relative·z-20·w-full·rounded-lg·bg-surface-secondary·px-10⏎··············py-2·outline-none·ring-0·backdrop-blur-sm·transition-all⏎··············duration-500·ease-in-out·placeholder:text-gray-400⏎··············focus:outline-none·focus:ring-0⏎············` with `peer·relative·z-20·w-full·rounded-lg·bg-surface-secondary·px-10·py-2·outline-none·ring-0·backdrop-blur-sm·transition-all·duration-500·ease-in-out·placeholder:text-gray-400·focus:outline-none·focus:ring-0`                                                               prettier/prettier
   50:25  error  Replace `⏎··············pointer-events-none·absolute·inset-0·z-20·rounded-lg⏎··············bg-gradient-to-r·from-blue-500/20·via-purple-500/20·to-blue-500/20⏎··············transition-all·duration-500·ease-in-out⏎··············${isSearching·&&·hasValue·?·'opacity-100·blur-sm'·:·'opacity-0·blur-none'}⏎···········` with `pointer-events-none·absolute·inset-0·z-20·rounded-lg·bg-gradient-to-r·from-blue-500/20·via-purple-500/20·to-blue-500/20·transition-all·duration-500·ease-in-out·${isSearching·&&·hasValue·?·'opacity-100·blur-sm'·:·'opacity-0·blur-none'}`  prettier/prettier
   60:25  error  Replace `⏎··············absolute·right-3·top-1/2·z-20·-translate-y-1/2⏎··············transition-all·duration-500·ease-in-out⏎··············${isSearching·&&·hasValue·?·'scale-100·opacity-100'·:·'scale-0·opacity-0'}⏎···········` with `absolute·right-3·top-1/2·z-20·-translate-y-1/2·transition-all·duration-500·ease-in-out·${isSearching·&&·hasValue·?·'scale-100·opacity-100'·:·'scale-0·opacity-0'}`                                                                                                                                                                  prettier/prettier
   76:21  error  Replace `⏎··········absolute·-inset-8·-z-10⏎··········transition-all·duration-700·ease-in-out⏎··········${isSearching·&&·hasValue·?·'scale-105·opacity-100'·:·'scale-100·opacity-0'}⏎·······` with `absolute·-inset-8·-z-10·transition-all·duration-700·ease-in-out·${isSearching·&&·hasValue·?·'scale-105·opacity-100'·:·'scale-100·opacity-0'}`                                                                                                                                                                                                                            prettier/prettier
   84:25  error  Replace `⏎··············bg-gradient-radial·absolute·inset-0·from-blue-500/10·to-transparent⏎··············transition-opacity·duration-700·ease-in-out⏎··············${isSearching·&&·hasValue·?·'animate-pulse-slow·opacity-100'·:·'opacity-0'}⏎···········` with `bg-gradient-radial·absolute·inset-0·from-blue-500/10·to-transparent·transition-opacity·duration-700·ease-in-out·${isSearching·&&·hasValue·?·'animate-pulse-slow·opacity-100'·:·'opacity-0'}`                                                                                                              prettier/prettier
   91:25  error  Replace `⏎··············absolute·inset-0·bg-gradient-to-r·from-purple-500/5·via-blue-500/5·to-purple-500/5⏎··············blur-xl·transition-all·duration-700·ease-in-out⏎··············${isSearching·&&·hasValue·?·'animate-gradient-x·opacity-100'·:·'opacity-0'}⏎···········` with `absolute·inset-0·bg-gradient-to-r·from-purple-500/5·via-blue-500/5·to-purple-500/5·blur-xl·transition-all·duration-700·ease-in-out·${isSearching·&&·hasValue·?·'animate-gradient-x·opacity-100'·:·'opacity-0'}`                                                                        prettier/prettier
  100:21  error  Replace `⏎··········absolute·inset-0·-z-20·scale-100·bg-gradient-to-r·from-blue-500/10·⏎··········via-purple-500/10·to-blue-500/10·opacity-0·blur-xl⏎··········transition-all·duration-500·ease-in-out⏎··········peer-focus:scale-105·peer-focus:opacity-100⏎········` with `absolute·inset-0·-z-20·scale-100·bg-gradient-to-r·from-blue-500/10·via-purple-500/10·to-blue-500/10·opacity-0·blur-xl·transition-all·duration-500·ease-in-out·peer-focus:scale-105·peer-focus:opacity-100`                                                                                      prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Breadcrumb.tsx
  20:10  error  Replace `text-muted-foreground·flex·flex-wrap·items-center·gap-1.5·break-words·text-sm` with `flex·flex-wrap·items-center·gap-1.5·break-words·text-sm·text-muted-foreground`  prettier/prettier
  47:22  error  Replace `hover:text-foreground·transition-colors` with `transition-colors·hover:text-foreground`                                                                              prettier/prettier
  61:22  error  Replace `text-foreground·font-normal` with `font-normal·text-foreground`                                                                                                      prettier/prettier
  88:31  error  disallow literal string: <span className="sr-only">More</span>                                                                                                                i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Combobox.tsx
   84:132  error  Delete `·`                                                                                                                                                                                                                                                                                                                              prettier/prettier
   96:19   error  Replace `displayValue·??·selectedValue` with `(displayValue·??·selectedValue)`                                                                                                                                                                                                                                                          prettier/prettier
  143:26   error  Replace `focus:bg-accent·focus:text-accent-foreground·relative·flex·w-full·cursor-pointer·select-none·items-center·rounded-sm·py-1.5·pl-2·pr-8·text-sm·outline-none` with `relative·flex·w-full·cursor-pointer·select-none·items-center·rounded-sm·py-1.5·pl-2·pr-8·text-sm·outline-none·focus:bg-accent·focus:text-accent-foreground`  prettier/prettier
  158:41   error  Replace `[&_svg]:text-foreground·flex·items-center·justify-center·gap-3·dark:text-white·[&_svg]:h-4·[&_svg]:w-4·[&_svg]:shrink-0` with `flex·items-center·justify-center·gap-3·dark:text-white·[&_svg]:h-4·[&_svg]:w-4·[&_svg]:shrink-0·[&_svg]:text-foreground`                                                                        prettier/prettier
  159:86   error  Delete `·`                                                                                                                                                                                                                                                                                                                              prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/DataTableColumnHeader.tsx
  32:56  error  Replace `data-[state=open]:bg-accent·-ml-3·h-8` with `-ml-3·h-8·data-[state=open]:bg-accent`                                                                                                                                 prettier/prettier
  45:37  error  Replace `text-muted-foreground/70·mr-2·h-3.5·w-3.5` with `mr-2·h-3.5·w-3.5·text-muted-foreground/70`                                                                                                                         prettier/prettier
  45:82  error  disallow literal string: <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Asc
          </DropdownMenuItem>      i18next/no-literal-string
  49:39  error  Replace `text-muted-foreground/70·mr-2·h-3.5·w-3.5` with `mr-2·h-3.5·w-3.5·text-muted-foreground/70`                                                                                                                         prettier/prettier
  49:84  error  disallow literal string: <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Desc
          </DropdownMenuItem>    i18next/no-literal-string
  54:37  error  Replace `text-muted-foreground/70·mr-2·h-3.5·w-3.5` with `mr-2·h-3.5·w-3.5·text-muted-foreground/70`                                                                                                                         prettier/prettier
  54:82  error  disallow literal string: <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeNoneIcon className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Hide
          </DropdownMenuItem>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Dialog.tsx
  72:41  error  disallow literal string: <span className="sr-only">Close</span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/DialogTemplate.spec.tsx
  29:24  error  disallow literal string: <div>Main Content</div>       i18next/no-literal-string
  30:30  error  disallow literal string: <button>Button</button>       i18next/no-literal-string
  31:34  error  disallow literal string: <button>Left Button</button>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/DropdownNoState.tsx
  42:43  error  Replace `option?.label·??·option?.value` with `(option?.label·??·option?.value)`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/InputWithDropDown.tsx
   95:38  error  Replace `hover:text-secondary·absolute·inset-y-0·right-0·flex·items-center·rounded-md·px-2` with `absolute·inset-y-0·right-0·flex·items-center·rounded-md·px-2·hover:text-secondary`  prettier/prettier
  130:24  error  Replace `text-primary·bg-surface-active` with `bg-surface-active·text-primary`                                                                                                        prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/MultiSearch.tsx
  56:11  error  Replace `value?.length·??·0` with `(value?.length·??·0)`  prettier/prettier
  66:13  error  Replace `value?.length·??·0` with `(value?.length·??·0)`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/MultiSelectDropDown.tsx
  145:40  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/MultiSelectPop.tsx
   57:200  error  Delete `dark:bg-gray-800·`  prettier/prettier
   64:81   error  Delete `·`                  prettier/prettier
   76:59   error  Delete `·`                  prettier/prettier
  101:37   error  Delete `·`                  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Pagination.tsx
  51:44  error  disallow literal string: <span className="sr-only">Page link</span>   i18next/no-literal-string
  67:11  error  disallow literal string: <span>Previous</span>                        i18next/no-literal-string
  79:11  error  disallow literal string: <span>Next</span>                            i18next/no-literal-string
  92:31  error  disallow literal string: <span className="sr-only">More pages</span>  i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Prompt.tsx
  9:114  error  Delete `·`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Resizable.tsx
  27:8   error  Replace `bg-border·focus-visible:ring-ring·relative·flex·w-px·items-center·justify-center·after:absolute·after:inset-y-0·after:left-1/2·after:w-1·after:-translate-x-1/2·focus-visible:outline-none·focus-visible:ring-1` with `relative·flex·w-px·items-center·justify-center·bg-border·after:absolute·after:inset-y-0·after:left-1/2·after:w-1·after:-translate-x-1/2·focus-visible:outline-none·focus-visible:ring-1·focus-visible:ring-ring`              prettier/prettier
  33:23  error  Replace `bg-border·z-10·flex·h-4·w-3·items-center·justify-center·rounded-sm·` with `z-10·flex·h-4·w-3·items-center·justify-center·rounded-sm·border·bg-`                                                                                                                                                                                                                                                                                                      prettier/prettier
  49:8   error  Replace `bg-border·focus-visible:ring-ring·group·relative·flex·w-px·items-center·justify-center·after:absolute·after:inset-y-0·after:left-1/2·after:w-1·after:-translate-x-1/2·focus-visible:outline-none·focus-visible:ring-1` with `group·relative·flex·w-px·items-center·justify-center·bg-border·after:absolute·after:inset-y-0·after:left-1/2·after:w-1·after:-translate-x-1/2·focus-visible:outline-none·focus-visible:ring-1·focus-visible:ring-ring`  prettier/prettier
  55:23  error  Replace `bg-border·invisible·z-10·flex·h-4·w-3·items-center·justify-center·rounded-sm·` with `invisible·z-10·flex·h-4·w-3·items-center·justify-center·rounded-sm·border·bg-`                                                                                                                                                                                                                                                                                  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Slider.tsx
   8:1  error  Delete `····`  prettier/prettier
   9:3  error  Delete `····`  prettier/prettier
  10:5  error  Delete `····`  prettier/prettier
  11:1  error  Delete `····`  prettier/prettier
  12:7  error  Delete `····`  prettier/prettier
  13:7  error  Delete `····`  prettier/prettier
  14:5  error  Delete `····`  prettier/prettier
  15:1  error  Delete `····`  prettier/prettier
  16:5  error  Delete `····`  prettier/prettier
  17:3  error  Delete `····`  prettier/prettier
  18:1  error  Delete `····`  prettier/prettier
  19:7  error  Delete `····`  prettier/prettier
  20:5  error  Delete `····`  prettier/prettier
  21:1  error  Delete `····`  prettier/prettier
  22:3  error  Delete `····`  prettier/prettier
  23:1  error  Delete `····`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/SplitText.tsx
  43:11  error  Insert `··`  prettier/prettier
  44:1   error  Insert `··`  prettier/prettier
  45:1   error  Insert `··`  prettier/prettier
  46:13  error  Insert `··`  prettier/prettier
  47:11  error  Insert `··`  prettier/prettier
  48:1   error  Insert `··`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Table.tsx
  35:21  error  Replace `g-muted/50·border-t` with `order-t·bg-muted/50`                                                                                                                                                          prettier/prettier
  46:10  error  Replace `hover:bg-muted/50·data-[state=selected]:bg-muted·border-b·border-border-light·transition-colors` with `border-b·border-border-light·transition-colors·hover:bg-muted/50·data-[state=selected]:bg-muted`  prettier/prettier
  62:8   error  Replace `text-muted-foreground·h-12·px-4·text-left·align-middle·font-medium` with `h-12·px-4·text-left·align-middle·font-medium·text-muted-foreground`                                                            prettier/prettier
  86:37  error  Replace `text-muted-foreground·mt-4·text-sm` with `mt-4·text-sm·text-muted-foreground`                                                                                                                            prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/Tag.tsx
  33:11  error  Insert `··`                                   prettier/prettier
  34:1   error  Insert `··`                                   prettier/prettier
  35:1   error  Insert `··`                                   prettier/prettier
  36:15  error  Insert `··`                                   prettier/prettier
  37:13  error  Insert `··`                                   prettier/prettier
  38:1   error  Replace `············` with `··············`  prettier/prettier
  39:1   error  Insert `··`                                   prettier/prettier
  40:11  error  Insert `··`                                   prettier/prettier
  41:1   error  Replace `············` with `··············`  prettier/prettier
  42:11  error  Insert `··`                                   prettier/prettier
  43:1   error  Insert `··`                                   prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/components/ui/TermsAndConditionsModal.tsx
  76:13  warning  Unused eslint-disable directive (no problems were reported from 'jsx-a11y/no-noninteractive-tabindex')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/data-provider/Agents/mutations.ts
  173:5  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unused-vars')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/AuthContext.tsx
  155:6  warning  React Hook useCallback has missing dependencies: 'authConfig?.test', 'navigate', 'refreshToken', and 'setUserContext'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  170:6  warning  React Hook useEffect has a missing dependency: 'doSetError'. Either include it or remove the dependency array                                                              react-hooks/exhaustive-deps
  217:5  warning  React Hook useMemo has missing dependencies: 'login' and 'logout'. Either include them or remove the dependency array                                                      react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Chat/useAddedHelpers.ts
  34:52  error  Replace `conversation?.conversationId·??·paramId·??·''` with `(conversation?.conversationId·??·paramId·??·'')`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Conversations/useDebouncedInput.ts
  33:30  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead  react-hooks/exhaustive-deps
  45:13  error    Insert `··`                                                                                                 prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Conversations/useExportConversation.ts
  51:23  error  Replace `·paramId·===·'new'·?·paramId·:·conversation?.conversationId·??·paramId·??·''` with `⏎······paramId·===·'new'·?·paramId·:·(conversation?.conversationId·??·paramId·??·'')`  prettier/prettier
  54:44  error  Replace `dataTree·??·null` with `(dataTree·??·null)`                                                                                                                                prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Endpoint/useEndpoints.ts
   63:5   warning  React Hook useMemo has an unnecessary dependency: 'endpoint'. Either exclude it or remove the dependency array                              react-hooks/exhaustive-deps
   68:5   warning  React Hook useMemo has an unnecessary dependency: 'endpoint'. Either exclude it or remove the dependency array                              react-hooks/exhaustive-deps
   87:6   warning  React Hook useMemo has a missing dependency: 'interfaceConfig.modelSelect'. Either include it or remove the dependency array                react-hooks/exhaustive-deps
  116:13  error    Insert `··`                                                                                                                                 prettier/prettier
  117:1   error    Insert `··`                                                                                                                                 prettier/prettier
  118:13  error    Insert `··`                                                                                                                                 prettier/prettier
  119:13  error    Insert `··`                                                                                                                                 prettier/prettier
  120:1   error    Insert `··`                                                                                                                                 prettier/prettier
  196:6   warning  React Hook useMemo has missing dependencies: 'azureAssistants' and 'instanceProjectId'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Endpoint/useSelectorEffects.ts
  118:6  warning  React Hook useEffect has a missing dependency: 'debouncedSetSelectedValues'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Files/useFileDeletion.ts
  22:3  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unused-vars')

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Input/useMentions.ts
   37:3  error    Delete `··`                                                                                                                   prettier/prettier
   38:1  error    Delete `··`                                                                                                                   prettier/prettier
   39:5  error    Delete `··`                                                                                                                   prettier/prettier
   40:1  error    Replace `······` with `····`                                                                                                  prettier/prettier
   41:1  error    Delete `··`                                                                                                                   prettier/prettier
   42:5  error    Delete `··`                                                                                                                   prettier/prettier
   43:1  error    Delete `··`                                                                                                                   prettier/prettier
   44:7  error    Delete `··`                                                                                                                   prettier/prettier
   45:7  error    Delete `··`                                                                                                                   prettier/prettier
   46:7  error    Delete `··`                                                                                                                   prettier/prettier
   47:1  error    Replace `········` with `······`                                                                                              prettier/prettier
   48:7  error    Delete `··`                                                                                                                   prettier/prettier
   49:1  error    Replace `······` with `····`                                                                                                  prettier/prettier
   50:1  error    Delete `··`                                                                                                                   prettier/prettier
  218:6  warning  React Hook useMemo has a missing dependency: 'interfaceConfig.modelSelect'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Input/useSpeechToTextBrowser.ts
  107:6  warning  React Hook useEffect has missing dependencies: 'isBrowserSTTEnabled' and 'toggleListening'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Input/useSpeechToTextExternal.ts
  271:6  warning  React Hook useEffect has a missing dependency: 'handleKeyDown'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/Prompts/usePromptGroupsNav.ts
  35:6   warning  React Hook useEffect has a missing dependency: 'queryClient'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  55:28  warning  React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead      react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/SSE/useContentHandler.ts
  36:18  error  Replace `⏎··········?.filter((m)·=>·m.messageId·!==·messageId)⏎··········.map((msg)·=>·({·...msg,·thread_id·}))·??` with `?.filter((m)·=>·m.messageId·!==·messageId).map((msg)·=>·({·...msg,·thread_id·}))·??⏎·······`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/hooks/useLocalize.ts
  21:2  error  Insert `⏎`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/locales/Translation.spec.ts
  49:4  error  Insert `⏎`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/routes/ChatRoute.tsx
  110:6  warning  React Hook useEffect has missing dependencies: 'conversation', 'conversationId', 'hasSetConversation', and 'newConversation'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/routes/RouteErrorBoundary.tsx
  131:96  error  disallow literal string: <h2 className="mb-6 text-center text-3xl font-medium tracking-tight text-text-primary">
          Oops! Something Unexpected Occurred
        </h2>                                                                                          i18next/no-literal-string
  137:44  error  disallow literal string: <h3 className="mb-2 font-medium">Error Message:</h3>                                                                                                                                                                                         i18next/no-literal-string
  147:46  error  disallow literal string: <h3 className="mb-2 font-medium">Status:</h3>                                                                                                                                                                                                i18next/no-literal-string
  159:21  error  disallow literal string: <span>Stack Trace</span>                                                                                                                                                                                                                     i18next/no-literal-string
  166:18  error  disallow literal string: <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyStack}
                  className="ml-2 px-2 py-1 text-xs"
                >
                  Copy
                </Button>  i18next/no-literal-string
  190:21  error  disallow literal string: <span>Additional Details</span>                                                                                                                                                                                                              i18next/no-literal-string
  200:65  error  disallow literal string: <p className="text-sm font-light text-text-secondary">Please try one of the following:</p>                                                                                                                                                   i18next/no-literal-string
  202:17  error  disallow literal string: <li>Refresh the page</li>                                                                                                                                                                                                                    i18next/no-literal-string
  203:17  error  disallow literal string: <li>Clear your browser cache</li>                                                                                                                                                                                                            i18next/no-literal-string
  204:17  error  disallow literal string: <li>Check your internet connection</li>                                                                                                                                                                                                      i18next/no-literal-string
  205:17  error  disallow literal string: <li>Contact the Admin if the issue persists</li>                                                                                                                                                                                             i18next/no-literal-string
  212:14  error  disallow literal string: <Button
              variant="submit"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto"
            >
              Refresh Page
            </Button>                                      i18next/no-literal-string
  215:97  error  disallow literal string: <Button variant="outline" onClick={handleDownloadLogs} className="w-full sm:w-auto">
              Download Error Logs
            </Button>                                                                                                 i18next/no-literal-string

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/__tests__/tools.test.ts
    2:9   error  Delete `·`                                                                                                                                                                                                                                                                    prettier/prettier
    3:25  error  Delete `·`                                                                                                                                                                                                                                                                    prettier/prettier
    8:21  error  Insert `,`                                                                                                                                                                                                                                                                    prettier/prettier
   53:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
   57:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
   60:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
   62:51  error  Replace `s` with `(s)`                                                                                                                                                                                                                                                        prettier/prettier
   67:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
   69:50  error  Replace `s` with `(s)`                                                                                                                                                                                                                                                        prettier/prettier
  107:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  112:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  114:49  error  Replace `t` with `(t)`                                                                                                                                                                                                                                                        prettier/prettier
  134:31  error  Insert `,`                                                                                                                                                                                                                                                                    prettier/prettier
  162:10  error  Insert `,`                                                                                                                                                                                                                                                                    prettier/prettier
  166:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  170:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  173:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  176:57  error  Replace `t·=>·t.pluginKey)).toContain('create_sheet_mcp_googlesheets'` with `(t)·=>·t.pluginKey)).toContain(⏎········'create_sheet_mcp_googlesheets',⏎······`                                                                                                                 prettier/prettier
  177:57  error  Replace `t·=>·t.pluginKey)).toContain('update_sheet_mcp_googlesheets');` with `(t)·=>·t.pluginKey)).toContain(⏎········'update_sheet_mcp_googlesheets',`                                                                                                                      prettier/prettier
  178:7   error  Insert `);⏎`                                                                                                                                                                                                                                                                  prettier/prettier
  185:29  error  Replace `⏎········'regular_tool',⏎········'nonexistent_tool_key'⏎······` with `'regular_tool',·'nonexistent_tool_key'`                                                                                                                                                        prettier/prettier
  195:10  error  Insert `,`                                                                                                                                                                                                                                                                    prettier/prettier
  199:1   error  Delete `······`                                                                                                                                                                                                                                                               prettier/prettier
  250:92  error  Insert `.toBe(`                                                                                                                                                                                                                                                               prettier/prettier
  251:9   error  Replace `.toBe('Custom·Google·Sheets'` with `'Custom·Google·Sheets',⏎······`                                                                                                                                                                                                  prettier/prettier
  265:14  error  Replace `getToolDisplayName('SHEETS_BATCH_GET',·'sheets',·{·⏎········toolDisplayNames:·{·'SHEETS_BATCH_GET':·'Custom·Batch·Get'·}·` with `⏎········getToolDisplayName('SHEETS_BATCH_GET',·'sheets',·{⏎··········toolDisplayNames:·{·SHEETS_BATCH_GET:·'Custom·Batch·Get'·},`  prettier/prettier
  267:7   error  Replace `})` with `··}),⏎······`                                                                                                                                                                                                                                              prettier/prettier
  271:62  error  Delete `⏎········`                                                                                                                                                                                                                                                            prettier/prettier
  276:14  error  Replace `getToolDisplayName('SHEETS_UPDATE',·'sheets',·{·⏎········toolDisplayNames:·{·'OTHER_TOOL':·'Other·Tool'·}·⏎······})` with `⏎········getToolDisplayName('SHEETS_UPDATE',·'sheets',·{⏎··········toolDisplayNames:·{·OTHER_TOOL:·'Other·Tool'·},⏎········}),⏎······`    prettier/prettier
  281:4   error  Insert `⏎`                                                                                                                                                                                                                                                                    prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/convos.fakeData.ts
    1:1   warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/ban-ts-comment')
  101:18  error    Replace `'Write·Einstein\'s·Famous·Equation·in·LaTeX'` with `"Write·Einstein's·Famous·Equation·in·LaTeX"`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/latex.spec.ts
  1:1  error  Delete `⏎`  prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/presets.ts
  50:11  error  Insert `··`                                   prettier/prettier
  51:1   error  Insert `··`                                   prettier/prettier
  52:15  error  Insert `··`                                   prettier/prettier
  53:1   error  Replace `············` with `··············`  prettier/prettier
  54:1   error  Insert `··`                                   prettier/prettier
  55:11  error  Insert `··`                                   prettier/prettier
  56:1   error  Insert `··`                                   prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/tools.test.ts
  67:23  error  Delete `·`                                                                                                      prettier/prettier
  68:29  error  Replace `'GOOGLESHEETS_BATCH_GET':·'Custom·Tool·Name'·}·` with `GOOGLESHEETS_BATCH_GET:·'Custom·Tool·Name'·},`  prettier/prettier
  70:89  error  Replace `'Custom·Tool·Name'` with `⏎········'Custom·Tool·Name',⏎······`                                         prettier/prettier
  78:23  error  Delete `·`                                                                                                      prettier/prettier
  79:29  error  Replace `'SOME_OTHER_TOOL':·'Other·Tool'·}·` with `SOME_OTHER_TOOL:·'Other·Tool'·},`                            prettier/prettier
  81:89  error  Replace `'Batch·Get'` with `⏎········'Batch·Get',⏎······`                                                       prettier/prettier
  84:4   error  Insert `⏎`                                                                                                      prettier/prettier

/Users/gannonhall/+DEV/agentis/LibreChat/client/src/utils/tools.ts
   35:21  error  Delete `·`                                                                                                                                                                                                                                                         prettier/prettier
   41:32  error  Delete `·`                                                                                                                                                                                                                                                         prettier/prettier
   42:29  error  Replace `string,·{·displayName?:·string;·toolDisplayNames?:·Record<string,·string>·}>` with `⏎····string,⏎····{·displayName?:·string;·toolDisplayNames?:·Record<string,·string>·}⏎··>,`                                                                            prettier/prettier
   64:1   error  Delete `····`                                                                                                                                                                                                                                                      prettier/prettier
   77:1   error  Delete `······`                                                                                                                                                                                                                                                    prettier/prettier
   96:1   error  Delete `······`                                                                                                                                                                                                                                                    prettier/prettier
  100:37  error  Insert `,`                                                                                                                                                                                                                                                         prettier/prettier
  131:3   error  Delete `·`                                                                                                                                                                                                                                                         prettier/prettier
  140:5   error  Replace `'github'` with `github`                                                                                                                                                                                                                                   prettier/prettier
  141:5   error  Replace `'googlesheets'` with `googlesheets`                                                                                                                                                                                                                       prettier/prettier
  142:5   error  Replace `'googledocs'` with `googledocs`                                                                                                                                                                                                                           prettier/prettier
  143:5   error  Replace `'googledrive'` with `googledrive`                                                                                                                                                                                                                         prettier/prettier
  144:5   error  Replace `'oauth2'` with `oauth2`                                                                                                                                                                                                                                   prettier/prettier
  150:5   error  Replace `'composio'` with `composio`                                                                                                                                                                                                                               prettier/prettier
  161:32  error  Delete `·······`                                                                                                                                                                                                                                                   prettier/prettier
  162:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  167:12  error  Replace `part` with `(part)`                                                                                                                                                                                                                                       prettier/prettier
  170:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  173:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  183:3   error  Delete `·`                                                                                                                                                                                                                                                         prettier/prettier
  198:14  error  Replace `part` with `(part)`                                                                                                                                                                                                                                       prettier/prettier
  202:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  207:12  error  Replace `part` with `(part)`                                                                                                                                                                                                                                       prettier/prettier
  210:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  222:22  error  Delete `·`                                                                                                                                                                                                                                                         prettier/prettier
  223:45  error  Insert `,`                                                                                                                                                                                                                                                         prettier/prettier
  229:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  235:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  244:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  247:5   error  Replace `tool·=>·tool.pluginKey·&&·typeof·tool.pluginKey·===·'string'·&&·tool.pluginKey.endsWith(`_mcp_${serverName}`)` with `(tool)·=>⏎······tool.pluginKey·&&⏎······typeof·tool.pluginKey·===·'string'·&&⏎······tool.pluginKey.endsWith(`_mcp_${serverName}`),`  prettier/prettier
  249:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  263:66  error  Insert `,`                                                                                                                                                                                                                                                         prettier/prettier
  269:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  275:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  284:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  287:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  291:7   error  Replace `tool·=>·tool.pluginKey·&&·typeof·tool.pluginKey·===·'string'·&&·tool.pluginKey·===·pluginKey` with `(tool)·=>⏎········tool.pluginKey·&&·typeof·tool.pluginKey·===·'string'·&&·tool.pluginKey·===·pluginKey,`                                              prettier/prettier
  297:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  300:5   error  Replace `tool·=>·tool.name·&&·typeof·tool.name·===·'string'·&&·tool.name·===·toolName` with `(tool)·=>·tool.name·&&·typeof·tool.name·===·'string'·&&·tool.name·===·toolName,`                                                                                      prettier/prettier
  305:1   error  Delete `··`                                                                                                                                                                                                                                                        prettier/prettier
  312:28  error  Replace `string,·{·displayName?:·string;·toolDisplayNames?:·Record<string,·string>·}>·=·window.__mcpServerConfigs` with `⏎····string,⏎····{·displayName?:·string;·toolDisplayNames?:·Record<string,·string>·}⏎··>·=·window.__mcpServerConfigs,`                    prettier/prettier
  318:7   error  Replace `!toolKeys·||·!Array.isArray(toolKeys)·||·toolKeys.length·===·0·||·` with `⏎····!toolKeys·||⏎····!Array.isArray(toolKeys)·||⏎····toolKeys.length·===·0·||`                                                                                                 prettier/prettier
  319:1   error  Replace `······!allTools·||·!Array.isArray(allTools)·||·allTools.length·===·0` with `····!allTools·||⏎····!Array.isArray(allTools)·||⏎····allTools.length·===·0⏎··`                                                                                                prettier/prettier
  329:1   error  Delete `····`                                                                                                                                                                                                                                                      prettier/prettier
  337:1   error  Delete `······`                                                                                                                                                                                                                                                    prettier/prettier
  340:1   error  Delete `······`                                                                                                                                                                                                                                                    prettier/prettier
  344:95  error  Insert `,`                                                                                                                                                                                                                                                         prettier/prettier

✖ 681 problems (637 errors, 44 warnings)
  512 errors and 10 warnings potentially fixable with the `--fix` option.

