# frozen_string_literal: true

# Helper methods for the demo application.
module ApplicationHelper
  def icon(name, library: RailsIcons.configuration.default_library, from: library, variant: nil, **arguments)
    super
  rescue RailsIcons::IconNotFound
    # Keep previews usable when an icon is referenced before that SVG is synced locally.
    begin
      super('arrow-right', library: library, from: from, variant: variant, **arguments)
    rescue RailsIcons::IconNotFound
      tag.span('', class: arguments[:class], title: "Missing icon: #{name}", aria: { hidden: true })
    end
  end
end
