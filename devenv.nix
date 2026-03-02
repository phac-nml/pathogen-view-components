{ pkgs, lib, config, inputs, ... }:

lib.mkMerge [
  {
  # https://devenv.sh/packages/
  packages = with pkgs; [
    pkg-config
    libyaml
    openssl
    nodejs_24
    pnpm_10
  ];

  # https://devenv.sh/languages/
  languages.ruby = {
    enable = true;
    versionFile = ./.ruby-version;
    bundler.enable = false;
  };

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    corepack.enable = true;
  };

  # Install ruby-lsp in the shell so the Ruby LSP extension works
  enterShell = ''
    gem install ruby-lsp
  '';
}
]
