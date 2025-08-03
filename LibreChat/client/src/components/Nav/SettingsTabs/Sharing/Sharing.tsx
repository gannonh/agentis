import { memo } from 'react';

function Sharing() {
  return (
    <div className="flex flex-col gap-6 p-1 text-sm text-text-primary">
      <div className="border-b border-border-light pb-3">
        <h3 className="text-lg font-semibold text-text-primary">
          Sharing
        </h3>
        <p className="mt-1 text-text-secondary">
          Manage shared agents, prompts and chats.
        </p>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border-light p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Coming Soon
              </h3>
              <p className="text-text-secondary max-w-sm">
                Conversation sharing and collaboration features will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Sharing);