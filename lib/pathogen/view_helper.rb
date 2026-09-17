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
    #
    # A single tag configures every sidebar on the page: each provider is read for
    # its own storage key, breakpoint, and default open state, so hosts with more
    # than one sidebar need only one boot tag. The +breakpoint:+ argument is the
    # fallback used for providers that do not declare their own.
    def pathogen_sidebar_boot_tag(breakpoint: default_sidebar_breakpoint, **)
      javascript_tag(pathogen_sidebar_boot_script(breakpoint))
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

    # Pre-paint anti-flash script. Sets the same `data-pathogen-sidebar-mode` and
    # `data-pathogen-sidebar-open` attributes the Stimulus controller keeps in
    # sync, so the CSS needs only one selector family for boot and connected
    # states. Providers already parsed run synchronously; later ones are caught
    # by a MutationObserver microtask before first paint.
    def pathogen_sidebar_boot_script(breakpoint)
      <<~JS.squish
        (function() {
          var fallbackBreakpoint = #{breakpoint.to_json};
          #{sidebar_boot_configure}
          #{sidebar_boot_observer}
        })();
      JS
    end

    def sidebar_boot_configure
      <<~JS
        var configure = function(sidebar) {
          var breakpoint = sidebar.getAttribute('data-pathogen--sidebar-breakpoint-value') || fallbackBreakpoint;
          var desktop = window.matchMedia(breakpoint).matches;
          var storageKey = sidebar.getAttribute('data-pathogen--sidebar-storage-key-value');
          var open = sidebar.getAttribute('data-pathogen--sidebar-open-value') !== 'false';
          try {
            var stored = storageKey ? window.localStorage.getItem(storageKey) : null;
            if (stored === 'false') open = false;
            else if (stored === 'true') open = true;
          } catch (error) { /* storage may be unavailable */ }
          var mode = desktop ? (open ? 'expanded' : 'rail') : 'offcanvas';
          sidebar.setAttribute('data-pathogen-sidebar-mode', mode);
          sidebar.setAttribute('data-pathogen-sidebar-open', String(desktop ? open : false));
        };
      JS
    end

    def sidebar_boot_observer
      <<~JS
        var applyState = function(root) {
          if (root.matches && root.matches('[data-pathogen-sidebar-id]')) { configure(root); return; }
          var nodes = root.querySelectorAll ? root.querySelectorAll('[data-pathogen-sidebar-id]') : [];
          for (var i = 0; i < nodes.length; i++) configure(nodes[i]);
        };

        applyState(document);
        var observer = new MutationObserver(function(records) {
          for (var i = 0; i < records.length; i++) {
            var added = records[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
              if (added[j].nodeType === Node.ELEMENT_NODE) applyState(added[j]);
            }
          }
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
