# frozen_string_literal: true

module Pathogen
  module Typography
    class CodeBlockPreview < ViewComponent::Preview
      # @param language text
      def default(language: "ruby")
        render Pathogen::Typography::CodeBlock.new(language: language.presence) do
          'def greet(name)' + "\n" + '  puts "Hello, #{name}!"' + "\n" + 'end'
        end
      end

      def javascript
        render Pathogen::Typography::CodeBlock.new(language: "javascript") do
          'const greet = (name) => {' + "\n" + '  console.log(`Hello, ${name}!`);' + "\n" + '};'
        end
      end

      def no_language
        render Pathogen::Typography::CodeBlock.new do
          "plain text code block\nwithout syntax highlighting"
        end
      end
    end
  end
end
