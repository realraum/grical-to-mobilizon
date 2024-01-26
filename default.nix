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
    makeWrapper ${nodejs.pkgs.pnpm}/bin/pnpm $out/bin/grical-to-mob \
      --chdir $out \
      --add-flags "start"
  '';
}
