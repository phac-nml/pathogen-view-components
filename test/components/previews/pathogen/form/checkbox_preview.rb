# frozen_string_literal: true

module Pathogen
  module Form
    class CheckboxPreview < ViewComponent::Preview
      # @!group Basic Examples

      # @label Default Checkbox
      def default
        render_with_template(
          template: 'pathogen/form/checkbox_preview/basic',
          locals: { checked: false, disabled: false }
        )
      end

      # @label Checked State
      def checked
        render_with_template(
          template: 'pathogen/form/checkbox_preview/basic',
          locals: { checked: true, disabled: false }
        )
      end

      # @label Disabled State
      def disabled
        render_with_template(
          template: 'pathogen/form/checkbox_preview/basic',
          locals: { checked: false, disabled: true }
        )
      end

      # @label Checked and Disabled
      def checked_and_disabled
        render_with_template(
          template: 'pathogen/form/checkbox_preview/basic',
          locals: { checked: true, disabled: true }
        )
      end

      # @!endgroup

      # @!group Form Integration

      # @label With Form Builder
      def with_form_builder
        render_with_template(
          template: 'pathogen/form/checkbox_preview/form_builder'
        )
      end

      # @label With Tag Helper
      def with_tag_helper
        render_with_template(
          template: 'pathogen/form/checkbox_preview/tag_helper'
        )
      end

      # @label Table Context
      def table_context
        render_with_template(
          template: 'pathogen/form/checkbox_preview/table_context'
        )
      end

      # @!endgroup
    end
  end
end
