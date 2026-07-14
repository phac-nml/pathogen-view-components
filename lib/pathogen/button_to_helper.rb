# frozen_string_literal: true

require_relative 'button_helper_options'

module Pathogen
  # Renders Rails +button_to+ forms with +Pathogen::Button+ submit controls.
  module ButtonToHelper
    # Renders Pathogen::Button inner content without an outer <button>, so Rails
    # +button_to+ can own the submit tag (avoids nested buttons).
    class InnerButton < ViewComponent::Base
      def initialize(**)
        super()
      end

      def call
        content
      end
    end

    # Mirrors +ActionView::Helpers::UrlHelper#button_to+ but styles the submit
    # control with +Pathogen::Button+ so standalone form actions match the design system.
    #
    # @param name [String, nil] button label when no block is given
    # @param options [String, Hash] URL or route options
    # @param html_options [Hash] Rails button/form options plus Pathogen button kwargs
    # @return [ActiveSupport::SafeBuffer]
    #
    # @example Delete action
    #   pathogen_button_to "Delete", post_path(@post), method: :delete, tone: :danger, emphasis: :outline
    def pathogen_button_to(name = nil, options = nil, html_options = nil, &block)
      name, options, html_options = normalize_button_to_args(name, options, html_options, block)
      pathogen_options, form_extra, method_override, button_options =
        ButtonHelperOptions.split_button_to_options(html_options)
      pathogen_options[:text] = name.to_s if name.present?

      submit_button = build_pathogen_submit_button(pathogen_options, button_options, options)
      rails_html_options = build_rails_button_to_options(form_extra, method_override, submit_button)

      button_to(options, rails_html_options) { render(submit_button, &block) }
    end

    private

    def normalize_button_to_args(name, options, html_options, block)
      if block
        html_options = options
        options = name
        name = nil
      end

      [name, options, html_options || {}]
    end

    def build_pathogen_submit_button(pathogen_options, button_options, url_options)
      button_html_options = convert_options_to_data_attributes(url_options, button_options.stringify_keys)
      button_html_options.delete('type')

      Pathogen::Button.new(
        base_button_class: InnerButton,
        type: :submit,
        **pathogen_options,
        **button_html_options.symbolize_keys
      )
    end

    def build_rails_button_to_options(form_extra, method_override, submit_button)
      rails_html_options = form_extra.stringify_keys
      rails_html_options['method'] = method_override if method_override
      rails_html_options.merge!(pathogen_button_tag_attributes(submit_button))
      rails_html_options
    end

    def pathogen_button_tag_attributes(button)
      attrs = button.instance_variable_get(:@system_arguments).deep_dup
      classes = attrs.delete(:classes)
      attrs[:class] = classes
      attrs.delete(:tag)
      attrs.delete(:type)
      attrs.stringify_keys
    end
  end
end
