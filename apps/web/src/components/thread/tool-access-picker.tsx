import { HugeiconsIcon } from "@hugeicons/react"
import { Wrench01Icon } from "@hugeicons/core-free-icons"
import type { IntegrationToolkit, ToolAccessGrant } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Badge } from "@workspace/ui/components/badge"

type ToolAccessPickerProps = {
  grants: ToolAccessGrant[]
  availableToolkits: IntegrationToolkit[]
  disabled?: boolean
  onGrant: (toolkitSlug: string) => void | Promise<void>
  onRevoke: (grantId: string) => void | Promise<void>
}

export function ToolAccessPicker({
  grants,
  availableToolkits,
  disabled,
  onGrant,
  onRevoke,
}: ToolAccessPickerProps) {
  const grantedSlugs = new Set(grants.map((grant) => grant.toolkitSlug))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
            />
          }
        >
          <HugeiconsIcon icon={Wrench01Icon} className="size-3.5" strokeWidth={2} />
          Tools
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Thread tool access</DropdownMenuLabel>
            {availableToolkits.length === 0 ? (
              <DropdownMenuItem disabled>
                Connect integrations first
              </DropdownMenuItem>
            ) : null}
            {availableToolkits.map((toolkit) => {
              const granted = grantedSlugs.has(toolkit.slug)
              const grant = grants.find((g) => g.toolkitSlug === toolkit.slug)
              return (
                <DropdownMenuItem
                  key={toolkit.slug}
                  disabled={toolkit.status !== "connected"}
                  onClick={() => {
                    if (granted && grant) {
                      void onRevoke(grant.id)
                    } else if (toolkit.status === "connected") {
                      void onGrant(toolkit.slug)
                    }
                  }}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>{toolkit.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {granted
                        ? "Granted"
                        : toolkit.status === "connected"
                          ? "Grant"
                          : "Connect first"}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {grants.map((grant) => {
        const toolkit = availableToolkits.find((t) => t.slug === grant.toolkitSlug)
        return (
          <Badge key={grant.id} variant="secondary" className="gap-1">
            {toolkit?.name ?? grant.toolkitSlug} enabled
          </Badge>
        )
      })}
    </div>
  )
}
