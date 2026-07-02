# frozen_string_literal: true

module Pathogen
  class AvatarPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Avatar

    # @label Playground
    # @param size select { choices: [xs, small, medium, large] } "Avatar size."
    # @param shape select { choices: [circle, rounded, square] } "Avatar geometry."
    # @param with_image toggle "Render a profile image instead of fallback initials."
    # @param decorative toggle "Hide avatar from assistive technology."
    def playground(size: :medium, shape: :circle, with_image: false, decorative: false)
      image_src = 'https://avatars.githubusercontent.com/u/9919?v=4'

      pathogen_avatar(
        label: 'Jane Doe',
        initials: 'JD',
        src: (with_image ? image_src : nil),
        size:,
        shape:,
        decorative:,
        test_selector: 'playground'
      )
    end

    # @label Overview
    # Geometric variants, deterministic fallback colours, and product contexts.
    def overview
      render_with_template
    end

    # @label Accessibility patterns
    # Informative, decorative, and interactive avatar semantics.
    def accessibility
      render_with_template
    end

    # @!endgroup
  end
end
