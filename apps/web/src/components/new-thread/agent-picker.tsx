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
import { PickerAgentIconMark } from "@/lib/picker-agent-icon"
import { getStarterAgents, getYourPickerAgents } from "@/fixtures"
import type { Agent, StarterAgent } from "@/fixtures/schema"
import { cn } from "@workspace/ui/lib/utils"

export const DEFAULT_AGENT_PICKER_ID = "agentis"

export type PickerOption = {
  id: string
  name: string
  description: string
  icon: Agent["icon"] | StarterAgent["icon"] | "agentis" | "create"
}

function agentToPickerOption(agent: Agent): PickerOption {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon ?? "search",
  }
}

function starterToPickerOption(starter: StarterAgent): PickerOption {
  return {
    id: starter.id,
    name: starter.name,
    description: starter.description,
    icon: starter.icon,
  }
}

const defaultOption: PickerOption = {
  id: DEFAULT_AGENT_PICKER_ID,
  name: "Agentis",
  description: "General purpose agent",
  icon: "agentis",
}

export function buildPickerOptions(): PickerOption[] {
  return [
    defaultOption,
    ...getYourPickerAgents().map(agentToPickerOption),
    ...getStarterAgents().map(starterToPickerOption),
  ]
}

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
    return options.find((option) => option.id === value) ?? defaultOption
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
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] p-1"
      >
        <DropdownMenuGroup>
          <PickerMenuItem
            option={defaultOption}
            selected={value === defaultOption.id}
            onSelect={onChange}
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[0.65rem] font-medium tracking-wide uppercase">
            Your agents
          </DropdownMenuLabel>
          {yourAgents.map((agent) => {
            const option = agentToPickerOption(agent)
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
          <DropdownMenuLabel className="text-[0.65rem] font-medium tracking-wide uppercase">
            Starter agents
          </DropdownMenuLabel>
          {starterAgents.map((starter) => {
            const option = starterToPickerOption(starter)
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
          render={<Link to="/projects/new" />}
        >
          <PickerAgentIconMark icon="create" size="sm" />
          <span className="text-sm">Create from scratch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
