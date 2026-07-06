# frozen_string_literal: true

module Pathogen
  # ViewComponent preview for demonstrating Pathogen Typography System
  class TypographyPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Typography System

    # @label Overview
    # Run detail header and type-scale reference in product context
    def overview; end

    # @label Headings
    # Specimen record heading hierarchy and colour variants
    def headings; end

    # @label Body Text
    # Lead, body, and callout copy on a QC review surface
    def body_text; end

    # @label Supporting Text
    # Labels, help text, and metadata at control and meta scale
    def supporting_text; end

    # @label Special Components
    # Lists, code, sections, and heading groups in a setup flow
    def special_components; end

    # @label Dark Mode
    # Semantic text roles on an operator account surface
    def dark_mode; end

    # @label Accessibility
    # Semantic heading order and label association
    def accessibility; end

    # @label Do's and Don'ts
    # Preferred patterns beside common mistakes
    def dos_and_donts; end

    # @label In Context
    # Presets on specimen, project, and dialog surfaces
    def in_context; end

    # @label Presets
    # HeadingGroup presets for article, card, section, dialog, and form
    def presets; end
  end
end
