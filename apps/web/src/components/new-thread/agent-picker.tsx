import { useMemo } from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  agentToPickerMenuOption,
  buildPickerOptions,
  DEFAULT_AGENT_PICKER_ID,
  defaultPickerOption,
  starterToPickerMenuOption,
  type PickerOption,
} from "@/components/new-thread/agent-picker-options"
import { PickerAgentIconMark } from "@/lib/picker-agent-icon"
import { getStarterAgents, getYourPickerAgents } from "@/fixtures"
import { cn } from "@workspace/ui/lib/utils"

type AgentPickerProps = {
  value: string
  onChange: (id: string) => void
  defaultOpen?: boolean
}

function PickerMenuItem({
  option,
  selected,
  onSelect,
}: {
  option: PickerOption
  selected: boolean
  onSelect: (id: string) => void
}) {
  const label =
    option.id === DEFAULT_AGENT_PICKER_ID ? `${option.name} (default)` : option.name

  return (
    <DropdownMenuItem
      className="min-h-12 items-start py-2"
      onClick={() => onSelect(option.id)}
      data-selected={selected || undefined}
    >
      <PickerAgentIconMark icon={option.icon} size="sm" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm font-medium", selected && "text-foreground")}>
          {label}
        </span>
        <span className="text-muted-foreground line-clamp-1 text-xs">
          {option.description}
        </span>
      </div>
    </DropdownMenuItem>
  )
}

export function AgentPicker({ value, onChange, defaultOpen }: AgentPickerProps) {
  const yourAgents = getYourPickerAgents()
  const starterAgents = getStarterAgents()

  const selected = useMemo(() => {
    const options = buildPickerOptions()
    return options.find((option) => option.id === value) ?? defaultPickerOption
  }, [value])

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-full px-3 font-normal"
          />
        }
      >
        <PickerAgentIconMark icon={selected.icon} size="sm" />
        <span>{selected.name}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className="size-4 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] p-1"
      >
        <DropdownMenuGroup>
          <PickerMenuItem
            option={defaultPickerOption}
            selected={value === defaultPickerOption.id}
            onSelect={onChange}
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium tracking-wide uppercase">
            Your agents
          </DropdownMenuLabel>
          {yourAgents.map((agent) => {
            const option = agentToPickerMenuOption(agent)
            return (
              <PickerMenuItem
                key={agent.id}
                option={option}
                selected={value === agent.id}
                onSelect={onChange}
              />
            )
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium tracking-wide uppercase">
            Starter agents
          </DropdownMenuLabel>
          {starterAgents.map((starter) => {
            const option = starterToPickerMenuOption(starter)
            return (
              <PickerMenuItem
                key={starter.id}
                option={option}
                selected={value === starter.id}
                onSelect={onChange}
              />
            )
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="min-h-9"
          render={<Link to="/agents/new" />}
        >
          <PickerAgentIconMark icon="create" size="sm" />
          <span className="text-sm">Create from scratch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
