# frozen_string_literal: true

Rails.application.routes.draw do
  mount Lookbook::Engine, at: '/lookbook' if defined?(Lookbook)

  namespace :demo do
    resources :samples, only: [] do
      collection do
        post :flash_toast
        get :rows, defaults: { format: :json }
      end
    end
  end

  root to: redirect('/lookbook')
end
