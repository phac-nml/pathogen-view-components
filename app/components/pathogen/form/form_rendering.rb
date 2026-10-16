# frozen_string_literal: true

module Pathogen
  module Form
    # Shared rendering helpers for form controls and their supporting content.
    module FormRendering
      private

      def form_support_html
        safe_join([form_help_text_html, error_text_html].compact_blank)
      end

      def form_help_text_html
        help_text_html
      end

      def render_form_layout(control_html, wrapper_class: nil)
        support_html = form_support_html
        content = if block_given?
                    yield(control_html, support_html)
                  else
                    safe_join([control_html, support_html])
                  end
        return content if wrapper_class.blank?

        tag.div(class: wrapper_class) do
          content
        end
      end
    end
  end
end
