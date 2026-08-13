# frozen_string_literal: true

module Pathogen
  # Shared tooltip slot wiring for trigger components.
  module TooltipTrigger
    private

    def build_tooltip_slot(trigger_arguments:, placement:, describe: true, **system_arguments)
      @tooltip_describedby = describe != false
      @tooltip_id = Pathogen::Tooltip.generate_id
      wire_tooltip_trigger!(trigger_arguments, describedby: @tooltip_describedby, tooltip_id: @tooltip_id)

      Pathogen::Tooltip.new(id: @tooltip_id, placement: placement, **system_arguments)
    end

    def prime_tooltip_association
      tooltip if tooltip?
    end

    def wire_tooltip_trigger!(trigger_arguments, describedby:, tooltip_id:)
      (trigger_arguments[:data] ||= {})['pathogen--tooltip-target'] = 'trigger'
      return unless describedby

      trigger_arguments[:aria] ||= {}
      describedby_tokens = [
        trigger_arguments[:aria][:describedby],
        trigger_arguments[:aria]['describedby'],
        tooltip_id
      ].compact.join(' ').split.uniq
      trigger_arguments[:aria][:describedby] = describedby_tokens.join(' ')
    end
  end
end
