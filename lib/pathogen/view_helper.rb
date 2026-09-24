# frozen_string_literal: true

module Pathogen
  # ViewHelper for pathogen component helpers
  module ViewHelper
    PATHOGEN_COMPONENT_HELPERS = {
      button: 'Pathogen::Button',
      avatar: 'Pathogen::Avatar',
      link: 'Pathogen::Link',
      disclosure: 'Pathogen::Disclosure',
      sidebar: 'Pathogen::Sidebar',
      toaster: 'Pathogen::Toaster',
      toast: 'Pathogen::Toast',
      radio_button: 'Pathogen::Form::RadioButton',
      switch: 'Pathogen::Form::Switch',
      heading: 'Pathogen::Typography::Heading',
      heading_group: 'Pathogen::Typography::HeadingGroup',
      section: 'Pathogen::Typography::Section',
      text: 'Pathogen::Typography::Text',
      supporting: 'Pathogen::Typography::Supporting',
      lead: 'Pathogen::Typography::Lead',
      callout: 'Pathogen::Typography::Callout',
      code: 'Pathogen::Typography::Code',
      code_block: 'Pathogen::Typography::CodeBlock',
      list: 'Pathogen::Typography::List'
    }.freeze

    # Define helper methods for components
    PATHOGEN_COMPONENT_HELPERS.each do |name, component|
      define_method "pathogen_#{name}" do |*args, **kwargs, &block|
        render component.constantize.new(*args, **kwargs), &block
      end
    end

    # Emits a tiny head script that applies persisted desktop sidebar preference
    # before first paint to reduce expanded/rail flashes.
    #
    # Must be rendered inside the document <head> (alongside any dark-mode check)
    # so it runs before the sidebar paints. Placed in <body> it runs after the
    # first paint — under Turbo the default-open sidebar flashes before collapsing.
    def pathogen_sidebar_boot_tag(id: 'sidebar', breakpoint: default_sidebar_breakpoint)
      sidebar_id = id.presence || 'sidebar'
      javascript_tag(pathogen_sidebar_boot_script(sidebar_id, breakpoint))
    end

    # Render typography with a preset configuration
    #
    # @param preset [Symbol] Preset name (:article, :card, :section, :dialog, :form_section)
    # @param overrides [Hash] Options to override preset defaults
    # @return [String] Rendered HeadingGroup component
    #
    # @example Article header
    #   <%= pathogen_typography_preset(:article) do |group| %>
    #     <%= group.with_heading { "Introduction to Typography" } %>
    #     <%= group.with_metadata { "Published January 15, 2024" } %>
    #   <% end %>
    #
    # @example Card with overrides
    #   <%= pathogen_typography_preset(:card, heading_variant: :subdued) do |group| %>
    #     <%= group.with_heading { "Card Title" } %>
    #   <% end %>
    def pathogen_typography_preset(preset, **overrides, &)
      preset_config = Pathogen::Typography::Constants::PRESETS[preset]
      raise ArgumentError, "Unknown typography preset: #{preset}" unless preset_config

      # Merge preset config with overrides
      config = preset_config.merge(overrides)

      # Build HeadingGroup with preset configuration
      render(Pathogen::Typography::HeadingGroup.new(
               level: config[:heading_level],
               heading_variant: config[:heading_variant],
               spacing: config[:spacing]
             ), &)
    end

    private

    def pathogen_sidebar_boot_script(sidebar_id, breakpoint)
      <<~JS.squish
        (function() {
          #{sidebar_boot_configuration(sidebar_id, breakpoint)}
          #{sidebar_boot_observer(sidebar_id)}
        })();
      JS
    end

    def sidebar_boot_configuration(sidebar_id, breakpoint)
      storage_key = Pathogen::Sidebar.storage_key(sidebar_id)

      <<~JS
        const desktop = window.matchMedia(#{breakpoint.to_json}).matches;
        let value = 'true';
        try {
          const stored = window.localStorage.getItem(#{storage_key.to_json});
          if (stored === 'false') value = 'false';
          if (stored === 'true') value = 'true';
        } catch (error) { value = 'true'; }
      JS
    end

    def sidebar_boot_observer(sidebar_id)
      <<~JS
        const applyState = function(root) {
          const sidebars = root.matches && root.matches('[data-pathogen-sidebar-id]')
            ? [root]
            : root.querySelectorAll('[data-pathogen-sidebar-id]');
          sidebars.forEach(function(sidebar) {
            if (sidebar.getAttribute('data-pathogen-sidebar-id') !== #{sidebar_id.to_json}) return;
            sidebar.setAttribute('data-pathogen-sidebar-boot-open', desktop ? value : 'false');
            sidebar.setAttribute('data-pathogen-sidebar-boot-viewport', desktop ? 'desktop' : 'mobile');
          });
        };

        applyState(document);
        const observer = new MutationObserver(function(records) {
          records.forEach(function(record) {
            record.addedNodes.forEach(function(node) {
              if (node.nodeType === Node.ELEMENT_NODE) applyState(node);
            });
          });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        document.addEventListener('DOMContentLoaded', function() { observer.disconnect(); }, { once: true });
      JS
    end

    def default_sidebar_breakpoint
      Pathogen::Sidebar::Provider::SIDEBAR_VALUE_DEFAULTS.fetch('pathogen--sidebar-breakpoint-value')
    end
  end
end
