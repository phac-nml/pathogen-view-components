# frozen_string_literal: true

module Pathogen
  module Form
    class RequiredFieldPreview < ViewComponent::Preview
      # @label Default required marker
      def default
        render_with_template(
          template: 'pathogen/form/required_field_preview/required_marker'
        )
      end
    end
  end
end
