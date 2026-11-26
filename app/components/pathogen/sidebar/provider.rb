# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Wrapper that owns sidebar mode and persistence.
    class Provider < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-provider
        relative flex min-h-screen w-full items-stretch
      ].join(' ').freeze

      SIDEBAR_VALUE_DEFAULTS = {
        'pathogen--sidebar-breakpoint-value' => '(min-width: 80rem)'
      }.freeze

      # Parser-blocking script placed immediately after the provider so the
      # persisted rail/expanded/offcanvas state is applied before the element
      # paints. Reads the provider's own storage key, breakpoint, and default so
      # it works per-sidebar without host wiring.
      ANTI_FLASH_JS = <<~JS.squish.freeze
        (function() {
          var el = document.currentScript && document.currentScript.previousElementSibling;
          if (!el || !el.hasAttribute('data-pathogen-sidebar-id')) return;
          var bp = el.getAttribute('data-pathogen--sidebar-breakpoint-value') ||
            #{SIDEBAR_VALUE_DEFAULTS.fetch('pathogen--sidebar-breakpoint-value').to_json};
          var desktop = window.matchMedia(bp).matches;
          var key = el.getAttribute('data-pathogen--sidebar-storage-key-value');
          var open = el.getAttribute('data-pathogen--sidebar-open-value') !== 'false';
          try {
            var v = key ? window.localStorage.getItem(key) : null;
            if (v === 'false') open = false;
            else if (v === 'true') open = true;
          } catch (e) {}
          var mode = desktop ? (open ? 'expanded' : 'rail') : 'offcanvas';
          el.setAttribute('data-pathogen-sidebar-mode', mode);
          el.setAttribute('data-pathogen-sidebar-open', String(desktop ? open : false));
        })();
      JS

      PERSISTENCE_MODES = %i[local_storage cookie none].freeze

      # @param id [String] identifies this sidebar's persisted preference
      # @param open [Boolean] desktop state to render: expanded (true) or rail (false)
      # @param persistence [Symbol] where the desktop preference is kept:
      #   - `:local_storage` (default): the browser restores it after the server render.
      #   - `:cookie`: the controller writes `Pathogen::Sidebar.cookie_name(id)` and the
      #     host passes `open: Pathogen::Sidebar.open_from_cookie(cookies[...])`, so the
      #     first response already has the right state.
      #   - `:none`: nothing is stored; `open:` always wins.
      def initialize(id: 'sidebar', open: true, persistence: :local_storage, **system_arguments)
        unless PERSISTENCE_MODES.include?(persistence)
          raise ArgumentError, "persistence must be one of: #{PERSISTENCE_MODES.map(&:inspect).join(', ')}"
        end

        @id = id
        @open = open
        @persistence = persistence
        @system_arguments = system_arguments
      end

      def call
        safe_join([
                    tag.div(**provider_attributes) { content },
                    anti_flash_script
                  ])
      end

      private

      # Parser-blocking script placed immediately after the provider so the
      # persisted rail/expanded/offcanvas state is applied before this element
      # paints. Prevents the refresh-time flash for viewport- or storage-driven
      # states that the server render cannot know. The Stimulus controller keeps
      # the same attribute in sync once it connects.
      def anti_flash_script
        helpers.javascript_tag(ANTI_FLASH_JS, nonce: true)
      end

      def provider_attributes
        {
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          style: css_variables,
          data: root_data_attributes,
          **@system_arguments.except(:class, :data, :style)
        }
      end

      def css_variables
        incoming = @system_arguments[:style].to_s.strip
        vars = '--pathogen-sidebar-width:16rem;--pathogen-sidebar-width-rail:3.25rem;'
        return vars if incoming.blank?

        "#{incoming.chomp(';')};#{vars}"
      end

      def root_data_attributes
        incoming = (@system_arguments[:data] || {}).deep_stringify_keys

        # Component-owned wiring (controller list, open state, persistence) is
        # merged last so callers can override labels/breakpoint but not internals.
        SIDEBAR_VALUE_DEFAULTS
          .merge(translated_values)
          .merge(incoming)
          .merge(persistence_values)
          .merge(
            'controller' => merged_controllers(incoming),
            'pathogen-sidebar-id' => @id,
            'pathogen-sidebar-ready' => 'false',
            # Seed the first-paint mode so the sidebar renders in its resting
            # state before the boot script and controller take over. Assumes the
            # desktop breakpoint; the client corrects for viewport and storage.
            'pathogen-sidebar-mode' => @open ? 'expanded' : 'rail',
            'pathogen-sidebar-open' => @open.to_s,
            'pathogen--sidebar-open-value' => @open
          )
      end

      # Exactly one persistence value is rendered (or neither for `:none`). The
      # anti-flash script and the controller only consult storage when its key
      # is present, so a cookie-backed sidebar trusts the server-rendered state.
      def persistence_values
        {
          'pathogen--sidebar-storage-key-value' =>
            (Pathogen::Sidebar.storage_key(@id) if @persistence == :local_storage),
          'pathogen--sidebar-cookie-name-value' =>
            (Pathogen::Sidebar.cookie_name(@id) if @persistence == :cookie)
        }
      end

      def merged_controllers(incoming)
        [incoming['controller'], 'pathogen--sidebar'].compact.join(' ').strip
      end

      def translated_values
        {
          'pathogen--sidebar-collapse-label-value' => t('.collapse_label'),
          'pathogen--sidebar-expand-label-value' => t('.expand_label'),
          'pathogen--sidebar-open-label-value' => t('.open_label'),
          'pathogen--sidebar-close-label-value' => t('.close_label')
        }
      end
    end
  end
end
