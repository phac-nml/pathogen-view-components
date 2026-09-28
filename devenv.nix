{ pkgs, lib, config, inputs, ... }:

lib.mkMerge [
  {
    # https://devenv.sh/packages/
    packages = with pkgs; [
      pkg-config
      libyaml
      openssl
      nodejs_24
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

  }
  (lib.mkIf pkgs.stdenv.isLinux {
    enterShell = ''
      # add libnss_sss.so.2 to LD_PRELOAD if it exists, to avoid issues with SSSD and NSS
      LIBNSS_SSS_PATH=$(find /lib /usr/lib /lib64 /usr/lib64 -name "libnss_sss.so.2" 2>/dev/null | head -n 1)
      if [ -n "$LIBNSS_SSS_PATH" ]; then
        export LD_PRELOAD="$LIBNSS_SSS_PATH"
      fi
    '';
  })
]
