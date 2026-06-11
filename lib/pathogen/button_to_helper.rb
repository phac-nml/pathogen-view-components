# frozen_string_literal: true

require_relative 'button_helper_options'

module Pathogen
  # Renders Rails +button_to+ forms with +Pathogen::Button+ submit controls.
  module ButtonToHelper
    METHOD_VERBS = ActionView::Helpers::UrlHelper::BUTTON_TAG_METHOD_VERBS

    # Mirrors +ActionView::Helpers::UrlHelper#button_to+ but renders +Pathogen::Button+
    # instead of a raw +<button>+ so standalone form actions match the design system.
    #
    # @param name [String, nil] button label when no block is given
    # @param options [String, Hash] URL or route options
    # @param html_options [Hash] Rails button/form options plus Pathogen button kwargs
    # @return [ActiveSupport::SafeBuffer]
    #
    # @example Delete action
    #   pathogen_button_to "Delete", post_path(@post), method: :delete, scheme: :danger
    def pathogen_button_to(name = nil, options = nil, html_options = nil, &block)
      name, options, html_options = normalize_button_to_args(name, options, html_options, block)

      pathogen_options, form_extra, method_override, button_options =
        ButtonHelperOptions.split_button_to_options(html_options)

      pathogen_options[:text] = name.to_s if name.present?
      context = build_button_to_context(options, form_extra, method_override, button_options)

      button = render_pathogen_submit_button(pathogen_options, context, options, &block)
      inner_tags = build_button_to_inner_tags(context, button)
      html = content_tag('form', inner_tags, context.fetch(:form_options).symbolize_keys)
      prevent_content_exfiltration(html)
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

    # Mirrors Rails button_to form assembly.
    # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity
    def build_button_to_context(url_options, form_extra, method_override, button_options)
      button_options = button_options.stringify_keys
      url = url_options == false ? nil : url_for(url_options)

      remote = form_extra[:remote] || button_options.delete('remote')
      params = form_extra[:params] || button_options.delete('params')
      authenticity_token = form_extra[:authenticity_token] || button_options.delete('authenticity_token')

      method = (method_override || button_options.delete('method').presence || method_for_options(url_options)).to_s
      form_method = method == 'get' ? 'get' : 'post'

      form_options = form_extra[:form] || button_options.delete('form') || {}
      form_options = form_options.stringify_keys
      form_options['class'] ||= form_extra[:form_class] || button_options.delete('form_class') || 'button_to'
      form_options['method'] = form_method
      form_options['action'] = url
      form_options['data-remote'] = true if remote

      {
        url: url,
        method: method,
        form_method: form_method,
        form_options: form_options,
        params: params,
        method_tag_html: method_override_tag(method),
        request_token_tag: build_request_token_tag(form_method, method, url, authenticity_token),
        button_options: button_options
      }
    end
    # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity

    def method_override_tag(method)
      return ''.html_safe unless METHOD_VERBS.include?(method)

      method_tag(method)
    end

    def render_pathogen_submit_button(pathogen_options, context, url_options, &)
      button_html_options = convert_options_to_data_attributes(url_options, context.fetch(:button_options))
      button_html_options.delete('type')

      render(
        Pathogen::Button.new(
          type: :submit,
          **pathogen_options,
          **button_html_options.symbolize_keys
        ),
        &
      )
    end

    def build_button_to_inner_tags(context, button)
      inner_tags = context.fetch(:method_tag_html)
      inner_tags = inner_tags.safe_concat(button) # rubocop:disable Rails/OutputSafety
      inner_tags = inner_tags.safe_concat(context.fetch(:request_token_tag)) # rubocop:disable Rails/OutputSafety
      append_param_tags(inner_tags, context[:params])
    end

    def build_request_token_tag(form_method, method, url, authenticity_token)
      return ''.html_safe unless form_method == 'post'

      request_method = method.empty? ? 'post' : method
      token_tag(authenticity_token, form_options: { action: url, method: request_method })
    end

    def append_param_tags(inner_tags, params)
      return inner_tags if params.blank?

      to_form_params(params).each do |param|
        input_options = { type: 'hidden', name: param[:name], value: param[:value] }
        input_options[:autocomplete] = 'off' unless ActionView::Base.remove_hidden_field_autocomplete

        inner_tags = inner_tags.safe_concat(tag.input(**input_options)) # rubocop:disable Rails/OutputSafety
      end

      inner_tags
    end
  end
end
