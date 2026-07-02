# frozen_string_literal: true

module Pathogen
  # Splits Rails form/button helper options from Pathogen::Button component kwargs.
  module ButtonHelperOptions
    BUTTON_TO_FORM_KEYS = %i[form form_class params remote authenticity_token].freeze

    PATHOGEN_BUTTON_KEYS = %i[
      size
      block
      icon_only
      text
      disabled
      aria_disabled
      test_selector
      base_button_class
      tone
      emphasis
    ].freeze

    module_function

    def split_button_to_options(html_options)
      options = html_options.deep_dup
      options = options.symbolize_keys

      form_options = extract_keys!(options, BUTTON_TO_FORM_KEYS)
      method_override = options.delete(:method)
      pathogen_options = extract_keys!(options, PATHOGEN_BUTTON_KEYS)

      [pathogen_options, form_options, method_override, options]
    end

    def split_submit_options(options)
      options = options.deep_dup.symbolize_keys
      pathogen_options = extract_keys!(options, PATHOGEN_BUTTON_KEYS)

      [pathogen_options, options]
    end

    def apply_disable_with!(label, options)
      options = options.deep_stringify_keys
      data = options.fetch('data', {})

      if options['data-disable-with'] == false || data['disable_with'] == false
        data.delete('disable_with')
      elsif ActionView::Base.automatically_disable_submit_tag
        disable_with_text = options['data-disable-with']
        disable_with_text ||= data['disable_with']
        disable_with_text ||= label.to_s.clone
        options.deep_merge!('data' => { 'disable_with' => disable_with_text })
      end

      options.delete('data-disable-with')
      options
    end

    def extract_keys!(options, keys)
      keys.each_with_object({}) do |key, extracted|
        extracted[key] = options.delete(key) if options.key?(key)
      end
    end
    private_class_method :extract_keys!
  end
end
