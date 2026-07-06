# frozen_string_literal: true

module TypographyAssertions
  def assert_type_role(selector, role)
    assert_selector "#{selector}[class*='--type-#{role}']"
  end
end
