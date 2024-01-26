{ lib
, mkNode
, fetchFromGitHub
, makeWrapper
, nodejs
, curl
, nodePackages
}:

mkNode {
  root = ./.;
  pnpmLock = ./pnpm-lock.yaml;
  nodejs = nodejs;
} rec {
  buildInputs = [
    curl.dev
    curl.out
  ];

  nativeBuildInputs = [
    makeWrapper
  ];

  postInstall = ''
    makeWrapper ${nodejs}/bin/node $out/bin/grical-to-mob \
      --chdir $out \
      --add-flags "--experimental-loader node-esm-loader index.js"
    ln -s /var/lib/grical-to-mob/session.json $out/session.json
  '';
}
