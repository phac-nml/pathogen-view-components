# frozen_string_literal: true

# Accessible switch component for Rails forms using the W3C APG checkbox switch pattern.
#
# Renders a native checkbox with role="switch", a visual track, and visible On/Off
# state text. Supports standalone usage and Rails form builder integration.
#
# @example Basic usage with visible label
#   <%= render Pathogen::Form::Switch.new(
#     attribute: :enabled,
#     label: "Dark mode",
#     checked: true
#   ) %>
#
# @example With external label via aria-labelledby (settings row pattern)
#   <%= render Pathogen::Form::Switch.new(
#     form: f,
#     attribute: :enabled,
#     id: switch_id,
#     checked: feature[:enabled],
#     aria: { labelledby: label_id, describedby: description_id }
#   ) %>
#
# @since 2.0.0

module Pathogen
  module Form
    # Checkbox-based switch following the W3C APG switch-checkbox pattern.
    class Switch < BaseFormComponent
      include SwitchStyles

      # @param attribute [Symbol] the model attribute name
      # @param value [String] checkbox submitted value when checked
      # @param form [ActionView::Helpers::FormBuilder, nil] optional form builder
      # @param options [Hash] component options
      def initialize(attribute:, value: '1', form: nil, **options)
        extract_switch_options!(options, value: value)
        super
        @role = 'switch'
      end

      protected

      # @return [ActiveSupport::SafeBuffer] the rendered HTML
      def render_component
        if @label.present? || @help_text.present?
          render_labeled_layout
        else
          switch_control_html
        end
      end

      # @param user_class [String, nil] additional CSS classes from user
      # @return [String] complete CSS class string for the input
      def input_classes(user_class = nil)
        switch_input_classes(user_class)
      end

      # Checkbox IDs omit the value suffix to match Rails check_box conventions.
      #
      # @return [String] the input ID
      def input_id
        return @id if @id.present?

        base = if @form&.object_name.present?
                 "#{@form.object_name}_#{@attribute}"
               else
                 input_name
               end
        base.to_s.gsub(/[\[\]]+/, '_').chomp('_')
      end

      # @return [Hash] HTML attributes for the switch input
      def form_attributes
        attributes = {
          id: input_id,
          disabled: @disabled,
          class: input_classes(@class),
          role: 'switch'
        }
        attributes[:checked] = @checked unless @form && !@checked_provided

        attributes.compact.merge(aria_attributes).merge(@html_options || {})
      end

      private

      # @param options [Hash] options hash to modify
      # @param value [String] the default checked value (used when checked_value is not explicitly provided)
      # @return [void]
      def extract_switch_options!(options, value: '1')
        @show_state_text = options.delete(:show_state_text) != false
        @state_text = (options.delete(:state_text) || {}).transform_keys(&:to_sym)
        @checked_value = options.delete(:checked_value) || value
        @unchecked_value = options.delete(:unchecked_value) || '0'
      end

      # @return [ActiveSupport::SafeBuffer] layout with optional name label and help text
      def render_labeled_layout
        tag.div(class: switch_container_classes) do
          tag.div(class: switch_labeled_row_classes) do
            tag.div(class: switch_labeled_content_classes) do
              name_label_html + inline_help_text_html
            end +
              switch_control_html
          end
        end
      end

      # @return [ActiveSupport::SafeBuffer] help text rendered beside the label (not below the switch)
      def inline_help_text_html
        return ''.html_safe if @help_text.blank?

        tag.div(class: switch_help_container_classes) do
          tag.span(@help_text, id: help_text_id, class: help_text_classes)
        end
      end

      # @return [ActiveSupport::SafeBuffer] the switch input and visual track
      def switch_control_html
        tag.div(class: switch_control_container_classes) do
          switch_input_html + track_label_html
        end
      end

      # @return [ActiveSupport::SafeBuffer] the checkbox input element
      def switch_input_html
        if @form
          @form.check_box(@attribute, form_attributes, @checked_value, @unchecked_value)
        else
          check_box_tag(input_name, @value, @checked, form_attributes)
        end
      end

      # @return [ActiveSupport::SafeBuffer] separate visible name label when label text is provided
      def name_label_html
        return ''.html_safe if @label.blank?

        tag.label(@label, for: input_id, class: switch_name_label_classes)
      end

      # @return [ActiveSupport::SafeBuffer] label wrapping the visual track and state text
      def track_label_html
        tag.label(for: input_id, class: switch_track_label_classes) do
          safe_join([track_html, state_text_html].compact)
        end
      end

      # @return [ActiveSupport::SafeBuffer] the visual switch track
      def track_html
        tag.span(class: switch_track_classes)
      end

      # @return [ActiveSupport::SafeBuffer, nil] visible On/Off state text
      def state_text_html
        return unless @show_state_text

        tag.span(aria: { hidden: true }, class: switch_state_text_classes) do
          safe_join([
                      tag.span(state_text_off, data: { switch_state: 'off' }),
                      tag.span(state_text_on, data: { switch_state: 'on' }, class: 'hidden')
                    ])
        end
      end

      # @return [String] localized or overridden "On" state text
      def state_text_on
        @state_text[:on] || t('pathogen.form.switch.on')
      end

      # @return [String] localized or overridden "Off" state text
      def state_text_off
        @state_text[:off] || t('pathogen.form.switch.off')
      end
    end
  end
end
